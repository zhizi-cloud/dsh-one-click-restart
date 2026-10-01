<#
.SYNOPSIS
    Start the dsh-one-click-restart watchdog as a process of its own.

.DESCRIPTION
    Node cannot start the watchdog directly on Windows, for two opposite
    reasons:

      * with `detached: true`, Node sets DETACHED_PROCESS, and a PowerShell
        started that way has no console: it exits 0 immediately and writes
        nothing at all, which looks exactly like a spawn that failed;
      * without the flag, the child shares the parent's console and is taken
        down with it — including by the very kill the watchdog performs, which
        would leave the application down for good.

    Start-Process produces a genuinely independent process, so the host runs
    this launcher instead. It is short-lived by design: the watchdog it starts
    outlives both this script and the host that spawned it.

.PARAMETER WatchdogPath
    Absolute path of watchdog.ps1.

.PARAMETER ConfigPath
    Absolute path of the JSON configuration the watchdog reads.

.PARAMETER StopPath
    Sentinel whose appearance asks the watchdog to exit.
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$WatchdogPath,
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [string]$StopPath
)

$ErrorActionPreference = 'Stop'

# Start-Process joins an argument array with spaces and does NOT quote entries,
# so paths containing spaces would be split apart. Build the line by hand, the
# same way the manual verification did.
$argumentLine = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$WatchdogPath`" -ConfigPath `"$ConfigPath`""
if ($StopPath -and $StopPath -ne '') {
    $argumentLine += " -StopPath `"$StopPath`""
}

Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentLine -WindowStyle Hidden
