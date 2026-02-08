Param(
  [string]$Remote = "origin",
  [string]$Branch = "main",
  [switch]$DryRun,
  [switch]$Evidence,
  [string]$EvidenceDir = "_evidence",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

Set-Location (Split-Path -Parent $PSScriptRoot)

$targetRef = "$Remote/$Branch"
 $startBranch = (git branch --show-current).Trim()

if (Test-Path ".git\\index.lock") {
  throw "Found .git\\index.lock. Abort."
}

$out = New-Object System.Collections.Generic.List[string]
$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")

$out.Add("== main-align ==")
$out.Add("cwd=$(Get-Location)")
$out.Add("targetRef=$targetRef")
$out.Add("dryRun=$DryRun evidence=$Evidence force=$Force")
$out.Add("")

$out.Add("## pre status")
$out.Add((git status -sb | Out-String).TrimEnd())
$out.Add("")

if (-not $DryRun -and -not $Force) {
  $porcelain = git status --porcelain
  if ($porcelain) {
    throw "Working tree is not clean. Re-run with -Force if you really want to reset."
  }
}

$out.Add("## fetch")
git fetch $Remote --prune | Out-Null
$out.Add("fetched")
$out.Add("")

$out.Add("## switch")
git switch $Branch | Out-Null
$out.Add("switched to $Branch")
$out.Add("")

$before = (git rev-parse HEAD).Trim()
$origin = (git rev-parse $targetRef).Trim()
$out.Add("before=$before")
$out.Add("$targetRef=$origin")
$out.Add("")

if ($DryRun) {
  $out.Add("## reset (skipped: dry-run)")
  $out.Add("")
} else {
  $out.Add("## reset --hard")
  $out.Add((git reset --hard $targetRef | Out-String).TrimEnd())
  $out.Add("")
}

$out.Add("## post status")
$out.Add((git status -sb | Out-String).TrimEnd())
$out.Add("")
$out.Add("## post log")
$out.Add((git log -3 --oneline | Out-String).TrimEnd())

$content = ($out -join "`n") + "`n"
Write-Host $content

if ($DryRun -and $startBranch -and $startBranch -ne $Branch) {
  git switch $startBranch | Out-Null
}

if ($Evidence) {
  $path = Join-Path $EvidenceDir "main-align_$ts.txt"
  Write-Utf8NoBom $path $content
  Write-Host "Saved evidence: $path"
}
