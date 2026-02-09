<#
.SYNOPSIS
  Repo guard: watchdog for unexpected HEAD/branch changes + auto evidence capture.
.PARAMETER RepoPath
  Git repo root path.
.PARAMETER IntervalSec
  Polling interval in seconds (default 2).
.PARAMETER DurationSec
  Stop after N seconds (default 0 = infinite).
.PARAMETER Notify
  If set: console highlight + beep on detection.
.OUTPUTS
  Creates `_evidence/auto_checkout_<timestamp>/` with evidence files when triggered.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoPath,

  [int]$IntervalSec = 2,
  [int]$DurationSec = 0,
  [switch]$Notify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $RepoPath).Path

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
function Write-Text([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Run-Git([string[]]$gitArgs) {
  $out = & git -C $repoRoot --no-pager @gitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    $msg = ($out | Out-String)
    throw ("git failed: git -C `"{0}`" {1}`n{2}" -f $repoRoot, ($gitArgs -join " "), $msg)
  }
  return ($out | Out-String)
}

function Get-Branch {
  $b = (Run-Git @("branch", "--show-current")).Trim()
  if ($b) { return $b }
  return "(detached)"
}

function Get-HeadSha {
  return (Run-Git @("rev-parse", "HEAD")).Trim()
}

function Get-ReflogTop {
  return (Run-Git @("reflog", "-n", "1", "--date=iso")).Trim()
}

function Capture-Evidence([string]$reason, [string]$prevBranch, [string]$prevSha, [string]$newBranch, [string]$newSha) {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $evRoot = Join-Path $repoRoot "_evidence"
  $dirName = "auto_checkout_{0}" -f $ts
  $evDir = Join-Path $evRoot $dirName
  New-Item -ItemType Directory -Force -Path $evDir | Out-Null

  $reflog = Run-Git @("reflog", "-50", "--date=iso")
  Write-Text (Join-Path $evDir "reflog.txt") $reflog

  $status = Run-Git @("status", "-sb")
  Write-Text (Join-Path $evDir "status.txt") $status

  $headTxt = @(
    ("reason: {0}" -f $reason)
    ("previous: {0} {1}" -f $prevBranch, $prevSha)
    ("current: {0} {1}" -f $newBranch, $newSha)
    ("ts_local: {0}" -f (Get-Date).ToString("o"))
  ) -join "`r`n"
  Write-Text (Join-Path $evDir "head.txt") $headTxt

  try {
    $procs = Get-CimInstance Win32_Process |
      Where-Object { $_.CommandLine -and ($_.CommandLine -match "(?i)osikatu") } |
      Select-Object Name, ProcessId, ParentProcessId, CommandLine |
      Format-Table -AutoSize | Out-String -Width 500
    Write-Text (Join-Path $evDir "procs.txt") $procs
  } catch {
    Write-Text (Join-Path $evDir "procs.txt") ("Failed to capture process list: {0}" -f $_.Exception.Message)
  }

  $guardLog = Join-Path $repoRoot ".git" "guard.log"
  if (Test-Path -LiteralPath $guardLog) {
    Copy-Item -LiteralPath $guardLog -Destination (Join-Path $evDir "guard.log") -Force
  }

  if ($Notify) {
    Write-Host ("[REPO-GUARD] DETECTED: {0}" -f $reason) -ForegroundColor Black -BackgroundColor Yellow
    Write-Host ("Evidence: {0}" -f $evDir) -ForegroundColor Yellow
    try { [Console]::Beep(1200, 250) } catch {}
  } else {
    Write-Host ("[REPO-GUARD] DETECTED: {0}" -f $reason) -ForegroundColor Yellow
    Write-Host ("Evidence: {0}" -f $evDir) -ForegroundColor Yellow
  }
}

$baselineBranch = Get-Branch
$baselineSha = Get-HeadSha
$baselineReflogTop = Get-ReflogTop
$startedAt = Get-Date

Write-Host ("[REPO-GUARD] start: {0} {1}" -f $baselineBranch, $baselineSha) -ForegroundColor Cyan
Write-Host ("[REPO-GUARD] interval={0}s duration={1}s notify={2}" -f $IntervalSec, $DurationSec, [bool]$Notify) -ForegroundColor Cyan

while ($true) {
  Start-Sleep -Seconds $IntervalSec

  $now = Get-Date
  if ($DurationSec -gt 0) {
    $elapsed = ($now - $startedAt).TotalSeconds
    if ($elapsed -ge $DurationSec) { break }
  }

  $curBranch = Get-Branch
  $curSha = Get-HeadSha
  $curReflogTop = Get-ReflogTop

  $reason = $null
  if ($curBranch -ne $baselineBranch -or $curSha -ne $baselineSha) {
    $reason = "HEAD/branch changed"
  } elseif ($curReflogTop -ne $baselineReflogTop) {
    if ($curReflogTop -match "(?i)\\b(checkout|switch|reset|commit)\\b") {
      $reason = "reflog changed (checkout/switch/reset/commit)"
    }
  }

  if ($reason) {
    Capture-Evidence -reason $reason -prevBranch $baselineBranch -prevSha $baselineSha -newBranch $curBranch -newSha $curSha
    $baselineBranch = $curBranch
    $baselineSha = $curSha
    $baselineReflogTop = $curReflogTop
  } else {
    $baselineReflogTop = $curReflogTop
  }
}

Write-Host "[REPO-GUARD] stop" -ForegroundColor Cyan

