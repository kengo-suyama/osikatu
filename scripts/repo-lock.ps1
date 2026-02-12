<#
.SYNOPSIS
  Exclusive repo lock for CI / Claude sessions.
.PARAMETER Action
  acquire | release | status
.PARAMETER Owner
  Label stored in the lock file (default: $env:USERNAME).
.PARAMETER RepoPath
  Path to the git repo root (default: current directory).
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet("acquire", "release", "status")]
  [string]$Action = "status",

  [string]$Owner = $env:USERNAME,
  [string]$RepoPath = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$lockFile = Join-Path $RepoPath ".git" "repo.lock"

function Read-Lock {
  if (-not (Test-Path $lockFile)) { return $null }
  $raw = Get-Content $lockFile -Raw -ErrorAction SilentlyContinue
  if (-not $raw) { return $null }
  try { return $raw | ConvertFrom-Json } catch { return $null }
}

function Write-Lock([string]$ownerName) {
  $procId = [System.Diagnostics.Process]::GetCurrentProcess().Id
  $payload = @{
    owner     = $ownerName
    processId = $procId
    timestamp = (Get-Date -Format o)
  } | ConvertTo-Json -Compress
  Set-Content -Path $lockFile -Value $payload -Force
}

switch ($Action) {
  "status" {
    $lock = Read-Lock
    if ($lock) {
      Write-Host "LOCKED by $($lock.owner) at $($lock.timestamp) (PID $($lock.processId))"
      exit 0
    }
    Write-Host "UNLOCKED"
    exit 0
  }
  "acquire" {
    $lock = Read-Lock
    if ($lock) {
      Write-Host "ALREADY LOCKED by $($lock.owner) at $($lock.timestamp)"
      exit 1
    }
    Write-Lock $Owner
    Write-Host "ACQUIRED by $Owner"
    exit 0
  }
  "release" {
    if (-not (Test-Path $lockFile)) {
      Write-Host "NOT LOCKED"
      exit 0
    }
    Remove-Item $lockFile -Force
    Write-Host "RELEASED"
    exit 0
  }
}