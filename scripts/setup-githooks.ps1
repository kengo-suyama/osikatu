Param(
  [switch]$ShowOnly
)

$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

if ($ShowOnly) {
  Write-Host "core.hooksPath:" (git config --local --get core.hooksPath)
  exit 0
}

Write-Host "Setting core.hooksPath=.githooks (local repo config)"
git config --local core.hooksPath .githooks

Write-Host "Done."
Write-Host "core.hooksPath:" (git config --local --get core.hooksPath)
Write-Host ""
Write-Host "Note:"
Write-Host "- Hooks affect git CLI behavior. Some GUI tools may not run hooks."
Write-Host "- To allow rebasing main once: `$env:ALLOW_REBASE_MAIN='1'; git rebase ..."

