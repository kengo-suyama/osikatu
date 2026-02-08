<#
.SYNOPSIS
  Monitor git.exe process creation and log parent process info.
  Run this in a separate PowerShell window and leave it running.
  When git.exe is spawned, it logs the parent process name and command line
  to _evidence/git_parent_<timestamp>.log

.USAGE
  pwsh -File scripts\capture-git-parent.ps1
  # Leave running. Press Ctrl+C to stop.
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$evidenceDir = Join-Path $repoRoot "_evidence"

if (-not (Test-Path $evidenceDir)) {
  New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $evidenceDir "git_parent_$ts.log"

Write-Host "Monitoring git.exe process creation..."
Write-Host "Log file: $logFile"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

# Use CIM event subscription (modern replacement for WMI)
$query = "SELECT * FROM Win32_ProcessStartTrace WHERE ProcessName = 'git.exe'"

try {
  Register-CimIndicationEvent -Query $query -SourceIdentifier "GitWatch" -ErrorAction Stop

  while ($true) {
    $evt = Wait-Event -SourceIdentifier "GitWatch" -Timeout 5
    if ($null -eq $evt) { continue }

    $data = $evt.SourceEventArgs.NewEvent
    $pid = $data.ProcessID
    $ppid = $data.ParentProcessID

    # Get parent process info
    $parentName = "unknown"
    $parentCmd = "unknown"
    $gitCmd = "unknown"
    try {
      $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $ppid" -ErrorAction SilentlyContinue
      if ($parent) {
        $parentName = $parent.Name
        $parentCmd = $parent.CommandLine
      }
    } catch {}

    try {
      $gitProc = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
      if ($gitProc) {
        $gitCmd = $gitProc.CommandLine
      }
    } catch {}

    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$now | pid=$pid ppid=$ppid parent=$parentName gitCmd=$gitCmd parentCmd=$parentCmd"

    Write-Host $line
    Add-Content -Path $logFile -Value $line

    Remove-Event -SourceIdentifier "GitWatch" -ErrorAction SilentlyContinue
  }
} finally {
  Unregister-Event -SourceIdentifier "GitWatch" -ErrorAction SilentlyContinue
  Write-Host ""
  Write-Host "Stopped. Log saved to: $logFile"
}
