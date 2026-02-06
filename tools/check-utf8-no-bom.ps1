param(
  [switch]$Staged,
  [switch]$Changed
)

$ErrorActionPreference = "Stop"

function Get-RepoFiles {
  if ($Staged) { return (git diff --name-only --cached) }
  if ($Changed) { return (git diff --name-only) }
  return (git ls-files)
}

function Has-BomOrUtf16 {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) { return $null }

  $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $buf = New-Object byte[] 4
    $read = $fs.Read($buf, 0, 4)
    if ($read -ge 3 -and $buf[0] -eq 0xEF -and $buf[1] -eq 0xBB -and $buf[2] -eq 0xBF) { return "utf8-bom" }
    if ($read -ge 2 -and $buf[0] -eq 0xFF -and $buf[1] -eq 0xFE) { return "utf16-le" }
    if ($read -ge 2 -and $buf[0] -eq 0xFE -and $buf[1] -eq 0xFF) { return "utf16-be" }
    return $null
  } finally {
    $fs.Dispose()
  }
}

$exts = @(
  ".ts",".tsx",".js",".jsx",".mjs",".cjs",
  ".json",".md",".css",".scss",".html",
  ".yml",".yaml",
  ".php",".blade.php",
  ".sql",".txt"
)

$files = Get-RepoFiles |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -ne "" } |
  Where-Object { -not $_.StartsWith(".git/") }

# Filter by extension (including ".blade.php")
$files = $files | Where-Object {
  $p = $_.ToLowerInvariant()
  foreach ($e in $exts) {
    if ($p.EndsWith($e)) { return $true }
  }
  return $false
}

$bad = @()
foreach ($f in $files) {
  $kind = Has-BomOrUtf16 -Path $f
  if ($kind) {
    $bad += [pscustomobject]@{ file = $f; encoding = $kind }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "[encoding] Found disallowed encodings (must be UTF-8 NO BOM):" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host ("- {0} ({1})" -f $_.file, $_.encoding) -ForegroundColor Red }
  exit 1
}

Write-Host "[encoding] OK (no UTF-8 BOM / UTF-16 detected in scanned files)."
