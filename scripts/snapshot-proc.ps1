# snapshot-proc.ps1 — One-shot evidence capture for git checkout investigation
# Usage: pwsh -File scripts/snapshot-proc.ps1
# Saves process snapshot + git reflog + guard.log to _evidence/

Param(
  [string]$EvidenceDir = "_evidence"
)

$ErrorActionPreference = "SilentlyContinue"

$repoRoot = Split-Path -Parent $PSScriptRoot
if ([System.IO.Path]::IsPathRooted($EvidenceDir)) {
  $evidenceFull = $EvidenceDir
} else {
  $evidenceFull = Join-Path $repoRoot $EvidenceDir
}

[System.IO.Directory]::CreateDirectory($evidenceFull) | Out-Null

$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$outPath = Join-Path $evidenceFull ("snapshot_{0}.txt" -f $ts)

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("=== Process Snapshot: $(Get-Date -Format 'o') ===")
[void]$sb.AppendLine("")

# 1. Relevant processes
$targetNames = @("git", "Code", "GitHubDesktop", "pwsh", "powershell", "node", "php", "code-insiders")
[void]$sb.AppendLine("--- Running Processes (git/Code/pwsh/node/php) ---")

foreach ($procName in $targetNames) {
  $procs = Get-CimInstance Win32_Process -Filter "Name LIKE '$procName%'" -ErrorAction SilentlyContinue
  foreach ($p in ($procs | Where-Object { $_ })) {
    [void]$sb.AppendLine("PID=$($p.ProcessId) PPID=$($p.ParentProcessId) Name=$($p.Name)")
    [void]$sb.AppendLine("  CMD=$($p.CommandLine)")
  }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("--- Git Reflog (last 30) ---")

try {
  $reflog = & git -C $repoRoot reflog --date=iso -30 2>&1
  [void]$sb.AppendLine($reflog -join "`n")
} catch {
  [void]$sb.AppendLine("(failed to read reflog)")
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("--- Guard Log ---")

$guardLog = Join-Path $repoRoot ".git" "guard.log"
if (Test-Path $guardLog) {
  $content = Get-Content $guardLog -Tail 50
  [void]$sb.AppendLine($content -join "`n")
} else {
  [void]$sb.AppendLine("(no guard.log found)")
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("--- Git Status ---")

try {
  $status = & git -C $repoRoot status -sb 2>&1
  [void]$sb.AppendLine($status -join "`n")
} catch {
  [void]$sb.AppendLine("(failed)")
}

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), $enc)

Write-Host "Snapshot saved to: $outPath"
