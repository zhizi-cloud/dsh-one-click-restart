<#
.SYNOPSIS
    One-shot relaunch: close DeepSeek Harness and start it again.

.DESCRIPTION
    This runs as its own short-lived process, started by the watchdog and then
    left alone. That separation is the whole point.

    Performing these steps *inside* the watchdog never once succeeded on the
    real machine: the log stopped dead immediately after "restart requested",
    with no force-kill line, no relaunch line and no crash — while the same
    steps executed by a throwaway script (the one used for the first manual
    verification) brought the application back on the first try. The watchdog
    owns a Windows message queue and a hotkey registration; whatever that does
    to a long-running process during a kill-and-restart, keeping the restart out
    of it removes the variable.

    Every step is timestamped into relaunch.log, so a failure names itself
    instead of leaving a silent gap.

.PARAMETER ConfigPath
    The watchdog's JSON configuration (executable path, grace period).
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ConfigPath
)

$ErrorActionPreference = 'Continue'

function Read-JsonSafe {
    param([string]$Path)
    try { return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}

$config = Read-JsonSafe -Path $ConfigPath
if ($null -eq $config) { exit 2 }

$exe = [string]$config.dsExePath
$gracefulMs = 3000
if ($null -ne $config.gracefulTimeoutMs) { $gracefulMs = [int]$config.gracefulTimeoutMs }

$logPath = Join-Path ([System.IO.Path]::GetDirectoryName($ConfigPath)) 'relaunch.log'
$appName = [System.IO.Path]::GetFileNameWithoutExtension($exe)
$appDir = [System.IO.Path]::GetDirectoryName($exe)

function Note {
    param([string]$Message)
    try {
        $stamp = (Get-Date).ToString('HH:mm:ss.fff')
        Add-Content -LiteralPath $logPath -Value "[$stamp] $Message" -Encoding UTF8
    } catch { }
}

function Get-App {
    Get-Process -Name $appName -ErrorAction SilentlyContinue
}

Note "relaunch script started (pid $PID) for $appName"

# Let the caller's process finish whatever it was doing before the window goes.
Start-Sleep -Seconds 2

# 1) Ask politely. Two mechanisms: CloseMainWindow posts WM_CLOSE to the main
#    window; taskkill without /F reaches processes whose window is gone.
$targets = Get-App | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
Note "asking $(@($targets).Count) windowed process(es) to close"
foreach ($p in @($targets)) { try { [void]$p.CloseMainWindow() } catch { } }
foreach ($p in @(Get-App)) { try { & taskkill.exe /PID $p.Id 2>&1 | Out-Null } catch { } }

# 2) Grace period.
$deadline = (Get-Date).AddMilliseconds($gracefulMs)
while ((Get-Date) -lt $deadline) {
    if (-not (Get-App)) { break }
    Start-Sleep -Milliseconds 150
}
Note "grace period over; $(@(Get-App).Count) process(es) still up"

# 3) Force-kill the remainder, by process name only.
$left = Get-App
if ($left) {
    Note "force-killing $(@($left).Count) process(es)"
    foreach ($p in @($left)) {
        try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
}

# 4) Wait for the image to go.
$deadline = (Get-Date).AddSeconds(20)
while ((Get-App) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
Note "application processes gone"

# 5) Let the single-instance lock settle. Starting into this window is how a
#    fresh instance loses the race, comes up, and quits.
Start-Sleep -Seconds 3

# 6) Start it, with the DSH_* variables of the dead host removed.
try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $exe
    $psi.WorkingDirectory = $appDir
    $psi.UseShellExecute = $false
    $removed = 0
    foreach ($key in @($psi.EnvironmentVariables.Keys)) {
        if ($key -like 'DSH_*') { [void]$psi.EnvironmentVariables.Remove($key); $removed++ }
    }
    [void][System.Diagnostics.Process]::Start($psi)
    Note "started $appName (clean environment, $removed DSH_* removed)"
} catch {
    Note "clean start failed: $($_.Exception.Message); falling back to Start-Process"
    Start-Process -FilePath $exe -WorkingDirectory $appDir | Out-Null
}

# 7) Verify it actually stayed up: a returned Start call is not evidence.
Start-Sleep -Seconds 8
if (Get-App) {
    Note "VERDICT: relaunch OK - $appName is running"
} else {
    Note "VERDICT: relaunch FAILED - $appName is not running"
}
