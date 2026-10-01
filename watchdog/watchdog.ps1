<#
.SYNOPSIS
    dsh-one-click-restart watchdog.

.DESCRIPTION
    A process deliberately OUTSIDE the DeepSeek Harness process tree, so it
    survives the very hang it exists to fix. The in-page header button reaches
    the restart engine through the dsh host; when the host event loop is
    blocked that path is dead, which is exactly why this watchdog owns a second
    trigger that never touches the host.

    Two triggers:

      1. A system-wide hotkey (default Ctrl+Alt+R) registered through
         user32!RegisterHotKey, delivered to this process's own message queue.
      2. A request file polled from disk, written by the host plugin when the
         header button is clicked.

    On either trigger it restarts the application:
        1. ask the main window to close politely (CloseMainWindow -> WM_CLOSE),
        2. wait `gracefulTimeoutMs`,
        3. force-kill whatever is left (by process name, never by process tree,
           so this watchdog cannot be caught in the blast radius),
        4. wait for the image to disappear,
        5. relaunch the executable.

    Recovery of interrupted work is NOT done here: the host plugin keeps a
    continuously-updated snapshot on disk and replays it on the next boot, so
    the hotkey path can restart instantly without waiting for anyone to write
    anything.

    The watchdog exits by itself once the application is gone for good, so
    repeated restarts never accumulate processes.

.PARAMETER ConfigPath
    JSON configuration written by the host plugin before the spawn.

.PARAMETER StopPath
    Sentinel file whose appearance asks the watchdog to exit.
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [string]$StopPath
)

$ErrorActionPreference = 'Continue'

# ---------------------------------------------------------------------------
# Win32 surface
# ---------------------------------------------------------------------------
if (-not ('DshRestartWin32' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class DshRestartWin32
{
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct MSG
    {
        public IntPtr hwnd;
        public uint   message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint   time;
        public POINT  pt;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    public static extern bool PeekMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax, uint wRemoveMsg);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@
}

$WM_HOTKEY   = 0x0312
$PM_REMOVE   = 0x0001
$MOD_ALT     = 0x0001
$MOD_CONTROL = 0x0002
$MOD_SHIFT   = 0x0004
$MOD_WIN     = 0x0008
# Arbitrary id; only has to be unique within this process's message queue.
$HOTKEY_ID   = 0x0D5

# ---------------------------------------------------------------------------
# Configuration and paths
# ---------------------------------------------------------------------------
function Read-JsonFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
    } catch {
        return $null
    }
}

$config = Read-JsonFile -Path $ConfigPath
if ($null -eq $config) {
    Write-Error "watchdog: cannot read config at $ConfigPath"
    exit 2
}

$dsExePath   = [string]$config.dsExePath
$statePath   = [string]$config.statePath
$requestPath = [string]$config.requestPath
$logPath     = [string]$config.logPath
$gracefulMs  = 3000
if ($null -ne $config.gracefulTimeoutMs) { $gracefulMs = [int]$config.gracefulTimeoutMs }
$onlyWhenForeground = $true
if ($null -ne $config.onlyWhenForeground) { $onlyWhenForeground = [bool]$config.onlyWhenForeground }

$appName = [System.IO.Path]::GetFileNameWithoutExtension($dsExePath)
$appDir  = [System.IO.Path]::GetDirectoryName($dsExePath)
$myPid   = $PID

if (-not $StopPath -or $StopPath -eq '') {
    $StopPath = Join-Path ([System.IO.Path]::GetDirectoryName($requestPath)) 'watchdog-stop'
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
$script:logLock = New-Object object

function Write-Log {
    param([string]$Message)
    if (-not $logPath -or $logPath -eq '') { return }
    try {
        $dir = [System.IO.Path]::GetDirectoryName($logPath)
        if ($dir -and -not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        # Keep the log bounded: rotate once past 512 KiB.
        if ((Test-Path -LiteralPath $logPath) -and ((Get-Item -LiteralPath $logPath).Length -gt 524288)) {
            Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
        }
        $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss.fff')
        Add-Content -LiteralPath $logPath -Value "[$stamp] $Message" -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        # Logging must never take the watchdog down.
    }
}

function Write-State {
    param([hashtable]$Extra)
    if (-not $statePath -or $statePath -eq '') { return }
    try {
        $state = [ordered]@{
            pid              = $myPid
            startedAt        = $script:startedAt
            updatedAt        = (Get-Date).ToString('o')
            appName          = $appName
            dsExePath        = $dsExePath
            hotkeyRegistered = $script:hotkeyRegistered
            hotkeyError      = $script:hotkeyError
            hotkey           = $script:hotkeyLabel
            hotkeyAlternatives = @($script:hotkeyAlternatives)
            lastRestartAt    = $script:lastRestartAt
            restartCount     = $script:restartCount
        }
        if ($Extra) { foreach ($k in $Extra.Keys) { $state[$k] = $Extra[$k] } }
        $tmp = "$statePath.tmp"
        # Write WITHOUT a BOM. `Set-Content -Encoding UTF8` prepends one on
        # Windows PowerShell, and the host parses this document with
        # JSON.parse, which rejects a leading BOM outright — the state file was
        # being written perfectly and still read as if it did not exist.
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tmp, ($state | ConvertTo-Json -Depth 5), $utf8NoBom)
        Move-Item -LiteralPath $tmp -Destination $statePath -Force
    } catch {
        # Never fatal.
    }
}

# ---------------------------------------------------------------------------
# Single-instance fence: a live watchdog for this app makes a second one exit.
# ---------------------------------------------------------------------------
$existing = Read-JsonFile -Path $statePath
if ($null -ne $existing -and $null -ne $existing.pid) {
    $otherPid = [int]$existing.pid
    if ($otherPid -ne $myPid) {
        $other = Get-Process -Id $otherPid -ErrorAction SilentlyContinue
        if ($null -ne $other) {
            Write-Log "another watchdog is alive (pid $otherPid); exiting"
            exit 0
        }
    }
}

$script:startedAt        = (Get-Date).ToString('o')
$script:hotkeyRegistered = $false
$script:hotkeyError      = $null
$script:hotkeyLabel      = ''
$script:hotkeyAlternatives = @()
$script:lastRestartAt    = $null
$script:restartCount     = 0
$script:restarting       = $false
# Ticks before which an apparently-absent application is NOT grounds for
# retiring: a relaunch shows a window where no image is visible yet.
$script:suppressIdleUntil = 0

# ---------------------------------------------------------------------------
# Hotkey vocabulary
# ---------------------------------------------------------------------------
function Get-ModifierBits {
    param([string[]]$Modifiers)
    $bits = 0
    foreach ($m in @($Modifiers)) {
        switch ([string]$m) {
            'Control' { $bits = $bits -bor $MOD_CONTROL }
            'Ctrl'    { $bits = $bits -bor $MOD_CONTROL }
            'Alt'     { $bits = $bits -bor $MOD_ALT }
            'Shift'   { $bits = $bits -bor $MOD_SHIFT }
            'Win'     { $bits = $bits -bor $MOD_WIN }
        }
    }
    return $bits
}

function Format-HotkeyLabel {
    param([string[]]$Modifiers, [string]$Key)
    $names = @()
    foreach ($m in @($Modifiers)) {
        switch ([string]$m) {
            'Control' { $names += 'Ctrl' }
            'Ctrl'    { $names += 'Ctrl' }
            'Alt'     { $names += 'Alt' }
            'Shift'   { $names += 'Shift' }
            'Win'     { $names += 'Win' }
        }
    }
    return (($names + $Key.ToUpperInvariant()) -join '+')
}

# Whether a combination can be claimed right now. The probe releases whatever
# it managed to take, so asking never costs the user a working hotkey.
function Test-HotkeyAvailable {
    param([int]$Bits, [int]$Vk)
    $probeId = 0x7FE
    $taken = $false
    try {
        $taken = [DshRestartWin32]::RegisterHotKey([IntPtr]::Zero, $probeId, [uint32]$Bits, [uint32]$Vk)
    } catch {
        $taken = $false
    }
    if ($taken) {
        try { [void][DshRestartWin32]::UnregisterHotKey([IntPtr]::Zero, $probeId) } catch { }
    }
    return $taken
}

# ---------------------------------------------------------------------------
# Hotkey registration
# ---------------------------------------------------------------------------
function Get-VirtualKey {
    param([string]$Key)
    if (-not $Key) { return $null }
    $k = $Key.Trim()
    $upper = $k.ToUpperInvariant()
    if ($upper.Length -eq 1) {
        $c = [int][char]$upper[0]
        if (($c -ge 48 -and $c -le 57) -or ($c -ge 65 -and $c -le 90)) { return $c }
    }
    if ($upper -match '^F([1-9]|1[0-9]|2[0-4])$') { return (0x70 + [int]$Matches[1] - 1) }
    switch ($upper) {
        'SPACE'  { return 0x20 }
        'ESC'    { return 0x1B }
        'ESCAPE' { return 0x1B }
        'TAB'    { return 0x09 }
        'ENTER'  { return 0x0D }
        'HOME'   { return 0x24 }
        'END'    { return 0x23 }
        'INSERT' { return 0x2D }
        'DELETE' { return 0x2E }
        default  { return $null }
    }
}

# Combinations offered to the user when the wanted one is already taken. They
# are only probed, never silently claimed: switching on our own would leave the
# user pressing a key that does nothing while some other key restarts the app.
$HOTKEY_CANDIDATES = @(
    @{ modifiers = @('Control', 'Alt', 'Shift'); key = 'R' },
    @{ modifiers = @('Control', 'Shift');        key = 'R' },
    @{ modifiers = @('Control', 'Alt');          key = 'F9' },
    @{ modifiers = @('Control', 'Alt');          key = 'F12' },
    @{ modifiers = @('Control', 'Alt');          key = 'W' }
)

$mods = Get-ModifierBits -Modifiers $config.hotkey.modifiers
$vk = Get-VirtualKey -Key ([string]$config.hotkey.key)
if ($mods -eq 0 -or $null -eq $vk) {
    $script:hotkeyError = 'invalid hotkey in config'
    Write-Log "hotkey: $($script:hotkeyError)"
} else {
    $script:hotkeyLabel = Format-HotkeyLabel -Modifiers $config.hotkey.modifiers -Key ([string]$config.hotkey.key)
    $ok = $false
    try {
        $ok = [DshRestartWin32]::RegisterHotKey([IntPtr]::Zero, $HOTKEY_ID, [uint32]$mods, [uint32]$vk)
    } catch {
        $script:hotkeyError = $_.Exception.Message
    }
    if ($ok) {
        $script:hotkeyRegistered = $true
        Write-Log "hotkey registered: $($script:hotkeyLabel)"
    } else {
        # The overwhelmingly common cause is another application already owning
        # the combination. Rather than leave the user guessing which one to try,
        # probe a short list and report the combinations that are actually free.
        $script:hotkeyError = 'RegisterHotKey failed (combination already taken by another application)'
        Write-Log "hotkey: $($script:hotkeyError)"
        $free = @()
        foreach ($candidate in $HOTKEY_CANDIDATES) {
            $candidateBits = Get-ModifierBits -Modifiers $candidate.modifiers
            $candidateVk = Get-VirtualKey -Key $candidate.key
            if ($candidateBits -eq 0 -or $null -eq $candidateVk) { continue }
            if (Test-HotkeyAvailable -Bits $candidateBits -Vk $candidateVk) {
                $free += (Format-HotkeyLabel -Modifiers $candidate.modifiers -Key $candidate.key)
            }
        }
        $script:hotkeyAlternatives = $free
        if ($free.Count -gt 0) { Write-Log "hotkey alternatives available: $($free -join ', ')" }
    }
}

# ---------------------------------------------------------------------------
# Restart engine
# ---------------------------------------------------------------------------
function Get-AppProcesses {
    Get-Process -Name $appName -ErrorAction SilentlyContinue
}

function Test-ForegroundIsApp {
    try {
        $hwnd = [DshRestartWin32]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) { return $false }
        $ownerPid = [uint32]0
        [void][DshRestartWin32]::GetWindowThreadProcessId($hwnd, [ref]$ownerPid)
        if ($ownerPid -eq 0) { return $false }
        $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($null -eq $proc) { return $false }
        return ($proc.ProcessName -eq $appName)
    } catch {
        return $false
    }
}

# Start the application.
#
# Via WMI, NOT Start-Process.
#
# Measured on the real machine: a plain Start-Process from inside this watchdog
# returns in ~99 ms and creates NOTHING — no process appears, not even in
# Win32_Process, and the same is true of the observer the watchdog tries to
# spawn. The watchdog is a descendant of the dsh host, and from this place in
# the process tree it can create no children at all. That also explains the
# "relaunched" lines that were always followed by the user opening the app by
# hand.
#
# WMI hands the creation to the Windows service that owns Win32_Process, which
# is not subject to that restriction (verified: WMI-created processes survive
# the caller exiting).
function Start-App {
    try {
        $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine = "`"$dsExePath`""
        }
        if ($null -ne $result -and $result.ReturnValue -eq 0) {
            Write-Log "started $appName via WMI (pid $($result.ProcessId))"
        } else {
            $code = if ($null -eq $result) { 'null' } else { $result.ReturnValue }
            Write-Log "WMI start returned $code; falling back to Start-Process"
            Start-Process -FilePath $dsExePath -WorkingDirectory $appDir | Out-Null
        }
    } catch {
        Write-Log "WMI start threw: $($_.Exception.Message); falling back to Start-Process"
        Start-Process -FilePath $dsExePath -WorkingDirectory $appDir | Out-Null
    }
}

function Invoke-Restart {
    param([string]$Reason)

    $script:restarting = $true
    $script:restartCount = $script:restartCount + 1
    Write-Log "restart #$($script:restartCount) requested ($Reason)"
    Write-State -Extra @{ phase = 'restarting'; reason = $Reason }

    # Start the outside observer BEFORE touching anything.
    #
    # In the field this log went silent at exactly this point: no force-kill
    # line, no relaunch line, no error, no crash dump. A process that stops
    # writing cannot explain why it stopped, so a separate process samples the
    # world instead — and it answers the one question the log cannot: was this
    # watchdog killed, or did it hang?
    try {
        $observerPath = Join-Path ([System.IO.Path]::GetDirectoryName($PSCommandPath)) 'restart-observer.ps1'
        if (Test-Path -LiteralPath $observerPath) {
            # WMI for the same reason Start-App uses it: Start-Process from
            # this process creates nothing at all.
            $observerCmd = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$observerPath`" -ConfigPath `"$ConfigPath`" -WatchdogPid $myPid"
            [void](Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $observerCmd })
            Write-Log "observer started, watching pid $myPid"
        } else {
            Write-Log "observer script not found at $observerPath"
        }
    } catch {
        Write-Log "observer could not start: $($_.Exception.Message)"
    }

    try {
        # 1) Polite close first: it lets the app flush session logs and the task
        #    board ledger, so a restart is not a crash.
        #
        #    Two mechanisms, because they cover different failures and neither
        #    blocks: CloseMainWindow posts WM_CLOSE to the main window, while
        #    taskkill without /F reaches processes whose window is already gone
        #    or not answering. (Measured: both return in well under a second, so
        #    a hang here was never the cause of a half-finished restart.)
        $targets = Get-AppProcesses | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
        foreach ($p in @($targets)) {
            try { [void]$p.CloseMainWindow() } catch { }
        }
        foreach ($p in @(Get-AppProcesses)) {
            try { & taskkill.exe /PID $p.Id 2>&1 | Out-Null } catch { }
        }
        Write-Log "asked $(@($targets).Count) windowed process(es) to close politely"

        # 2) Grace period.
        $deadline = (Get-Date).AddMilliseconds($gracefulMs)
        while ((Get-Date) -lt $deadline) {
            if (-not (Get-AppProcesses)) { break }
            Start-Sleep -Milliseconds 150
        }

        # 3) Force-kill the remainder. By process name only -- never by process
        #    tree, which is what keeps this watchdog out of its own kill.
        $left = Get-AppProcesses
        if ($left) {
            Write-Log "graceful close timed out; force-killing $(@($left).Count) process(es)"
            foreach ($p in @($left)) {
                try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch { }
            }
        }

        # 4) Wait for the image to disappear.
        $waitDeadline = (Get-Date).AddSeconds(20)
        while ((Get-AppProcesses) -and (Get-Date) -lt $waitDeadline) {
            Start-Sleep -Milliseconds 150
        }

        # The desktop shell quits on its own once its host child dies — it
        # records `dsh desktop host exited` and then exits. The process table
        # can therefore look empty while the previous run's single-instance
        # lock is still settling, and a new instance started into that window
        # loses the race, comes up, and quits. That is the field failure where
        # the log said "relaunched" and the application still had to be opened
        # by hand.
        Start-Sleep -Seconds 3

        # 5) Relaunch, and verify it actually stayed up.
        #
        #    A Start-Process call that returns is NOT evidence that the
        #    application is running. Field verification produced exactly that
        #    failure: the log said "relaunched", the process appeared, and it was
        #    gone six seconds later — the user then opened the app by hand. So
        #    every attempt must survive a settling period, and a failed one is
        #    retried rather than being reported as success.
        if (-not (Test-Path -LiteralPath $dsExePath)) {
            Write-Log "cannot relaunch: $dsExePath is missing"
            Write-State -Extra @{ phase = 'error'; error = 'executable missing' }
            return
        }

        $launched = $false
        for ($attempt = 1; $attempt -le 3 -and -not $launched; $attempt++) {
            Start-App
            $script:lastRestartAt = (Get-Date).ToString('o')
            Write-Log "relaunch attempt $attempt"

            # First: does an image appear at all?
            $bootDeadline = (Get-Date).AddSeconds(30)
            $appeared = $false
            while ((Get-Date) -lt $bootDeadline) {
                if (Get-AppProcesses) { $appeared = $true; break }
                Start-Sleep -Milliseconds 250
            }
            if (-not $appeared) {
                Write-Log "attempt $attempt produced no process"
                continue
            }

            # Second: it appeared, so require it to still be there. A process
            # that vanishes during start-up is precisely the failure this loop
            # exists to catch.
            Start-Sleep -Seconds 8
            if (Get-AppProcesses) {
                $launched = $true
            } else {
                Write-Log "attempt $attempt exited shortly after starting"
            }
        }

        if ($launched) {
            # Keep the idle check below from reading the boot window as a real
            # shutdown, which previously made the watchdog retire immediately
            # after restarting the application.
            $script:suppressIdleUntil = (Get-Date).AddSeconds(90).Ticks
            Write-Log "relaunched $appName"
            Write-State -Extra @{ phase = 'idle'; error = $null }
        } else {
            Write-Log "all relaunch attempts failed; the application is down"
            Write-State -Extra @{ phase = 'error'; error = 'relaunch failed after 3 attempts' }
        }
    } catch {
        Write-Log "restart failed: $($_.Exception.Message)"
        Write-State -Extra @{ phase = 'error'; error = $_.Exception.Message }
    } finally {
        $script:restarting = $false
    }
}

# ---------------------------------------------------------------------------
# Banner + state
# ---------------------------------------------------------------------------
Write-Log "watchdog started (pid $myPid) for $appName"
Write-Log "config: exe=$dsExePath gracefulMs=$gracefulMs onlyWhenForeground=$onlyWhenForeground"
Write-State -Extra @{ phase = 'idle' }

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
$msg = New-Object DshRestartWin32+MSG
$idleTicks = 0

try {
    while ($true) {
        # --- trigger 1: system-wide hotkey -------------------------------
        while ([DshRestartWin32]::PeekMessage([ref]$msg, [IntPtr]::Zero, 0, 0, $PM_REMOVE)) {
            if ($msg.message -eq $WM_HOTKEY) {
                if ($onlyWhenForeground -and -not (Test-ForegroundIsApp)) {
                    Write-Log "hotkey ignored: $appName is not the foreground application"
                } else {
                    Invoke-Restart -Reason 'hotkey'
                }
            }
        }

        # --- trigger 2: request file written by the header button --------
        if (Test-Path -LiteralPath $requestPath) {
            $request = Read-JsonFile -Path $requestPath
            Remove-Item -LiteralPath $requestPath -Force -ErrorAction SilentlyContinue
            $reason = 'button'
            if ($null -ne $request -and $null -ne $request.reason) { $reason = [string]$request.reason }
            if (-not $script:restarting) { Invoke-Restart -Reason $reason }
        }

        # --- stop sentinel ----------------------------------------------
        if (Test-Path -LiteralPath $StopPath) {
            Write-Log "stop sentinel seen; exiting"
            Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue
            break
        }

        # --- the app is gone for good: this watchdog has no reason to live
        # The cooldown keeps a relaunch's boot window from being read as a real
        # shutdown.
        if (-not $script:restarting -and (Get-Date).Ticks -gt $script:suppressIdleUntil) {
            if (-not (Get-AppProcesses)) {
                $idleTicks++
                # Debounce: a restart briefly shows zero processes.
                if ($idleTicks -gt 40) {
                    Write-Log "$appName is gone; watchdog exiting"
                    break
                }
            } else {
                $idleTicks = 0
            }
        }

        Start-Sleep -Milliseconds 120
    }
} finally {
    if ($script:hotkeyRegistered) {
        try { [void][DshRestartWin32]::UnregisterHotKey([IntPtr]::Zero, $HOTKEY_ID) } catch { }
    }
    Write-State -Extra @{ phase = 'stopped' }
    Write-Log "watchdog stopped"
}
