Param(
  [string]$RepoPath = "C:\\laragon\\www\\osikatu",
  [string]$UserDataDir = "$env:TEMP\\vscode-osikatu-clean",
  [switch]$DisableExtensions = $true
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
  throw "'code' command not found in PATH."
}

$args = @()
if ($DisableExtensions) { $args += "--disable-extensions" }
$args += "--user-data-dir"
$args += $UserDataDir
$args += $RepoPath

Write-Host "Launching VSCode (clean): code $($args -join ' ')"
Start-Process -FilePath "code" -ArgumentList $args | Out-Null

