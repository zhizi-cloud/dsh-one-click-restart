<#
.SYNOPSIS
    Restart tracer: records what happens during a restart, from OUTSIDE.

.DESCRIPTION
    The watchdog's own log goes silent exactly when the interesting part
    happens. The last field run stopped dead right after "restart requested" —
    no force-kill line, no relaunch line, no error, no crash dump. A process
    that stops writing cannot explain why it stopped, so this runs as a
    separate process and samples the world instead:

      * is the watchdog still alive,
      * how many application processes exist,
      * did the set of processes change.

    That answers the one question the watchdog's log cannot: was it killed, or
    did it hang? Output is append-only, one line per state change, so whatever
    it managed to write survives the restart.

.PARAMETER ConfigPath
    The watchdog's JSON configuration (used to read the executable name).

.PARAMETER WatchdogPid
    The watchdog process being watched.

.PARAMETER DurationSeconds
    How long to sample before giving up.
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [int]$WatchdogPid = 0,
    [int]$DurationSeconds = 150
)

$ErrorActionPreference = 'Continue'

# Hide the console window WMI gave us.
#
# The watchdog starts this script through Win32_Process.Create — the only way it
# can create a process at all, since a plain Start-Process from its place in the
# process tree silently creates nothing. WMI allocates a console for a console
# application, and Start-Process's -WindowStyle Hidden does not apply on that
# path, so the window is hidden from the inside instead: an observer that flashes
# a black box at the user on every restart is not acceptable.
try {
    Add-Type -Namespace DshOcr -Name Win -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("user32.dll")]
public static extern bool ShowWindow(System.IntPtr hWnd, int nCmdShow);
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern System.IntPtr GetConsoleWindow();
'@ -ErrorAction SilentlyContinue
    $handle = [DshOcr.Win]::GetConsoleWindow()
    if ($handle -ne [System.IntPtr]::Zero) { [void][DshOcr.Win]::ShowWindow($handle, 0) }
} catch {
    # Losing this battle must not stop the observation.
}

$logPath = Join-Path ([System.IO.Path]::GetDirectoryName($ConfigPath)) 'restart-trace.log'

function Note {
    param([string]$Message)
    try {
        $stamp = (Get-Date).ToString('HH:mm:ss.fff')
        Add-Content -LiteralPath $logPath -Value "[$stamp] $Message" -Encoding UTF8
    } catch { }
}

$appName = 'DeepSeek Harness'
try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $resolved = [System.IO.Path]::GetFileNameWithoutExtension([string]$config.dsExePath)
    if ($resolved) { $appName = $resolved }
} catch { }

Note "=== observer start (pid $PID), watching watchdog pid $WatchdogPid, app '$appName' ==="

$deadline = (Get-Date).AddSeconds($DurationSeconds)
$lastState = ''
$sawWatchdog = $false

while ((Get-Date) -lt $deadline) {
    $watchdogAlive = $false
    if ($WatchdogPid -gt 0) {
        $watchdogAlive = (Get-Process -Id $WatchdogPid -ErrorAction SilentlyContinue) -ne $null
    }
    if ($watchdogAlive) { $sawWatchdog = $true }

    $appProcs = @(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count
    $state = "watchdogAlive=$watchdogAlive  appProcesses=$appProcs"

    if ($state -ne $lastState) {
        Note $state
        $lastState = $state
    }

    if ($sawWatchdog -and -not $watchdogAlive) {
        Note "!! watchdog is GONE (it was killed, or it exited)"
        # Keep sampling briefly: the application may still come back.
        $extra = (Get-Date).AddSeconds(30)
        while ((Get-Date) -lt $extra) {
            $n = @(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count
            if ($n -gt 0) { Note "application came up after the watchdog died (appProcesses=$n)"; break }
            Start-Sleep -Milliseconds 500
        }
        break
    }

    if ($sawWatchdog -and -not $watchdogAlive -and $appProcs -gt 0) { break }

    Start-Sleep -Milliseconds 200
}

$final = @(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count
Note "=== observer end; appProcesses=$final ==="
