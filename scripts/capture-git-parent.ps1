Param(
  [switch]$Start,
  [switch]$Stop,
  [switch]$Status,
  [switch]$Watch,
  [ValidateSet("Observe","Deny")]
  [string]$Mode = "Observe",
  [int]$PollMs = 100,
  [string]$EvidenceDir = "_evidence",
  [string]$LogPath
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Append-Utf8NoBom([string]$Path, [string]$Line) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $bytes = $enc.GetBytes($Line + "`n")
  $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
}

function Resolve-EvidenceDir([string]$dir) {
  if ([System.IO.Path]::IsPathRooted($dir)) { return $dir }
  return (Join-Path (Split-Path -Parent $PSScriptRoot) $dir)
}

function JsonLine([hashtable]$obj) {
  return ($obj | ConvertTo-Json -Compress -Depth 6)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$evidenceFull = Resolve-EvidenceDir $EvidenceDir
$statePath = Join-Path $evidenceFull "git_process_create_watch_state.json"

function Load-State {
  if (-not (Test-Path $statePath)) { return $null }
  try { return (Get-Content $statePath -Raw | ConvertFrom-Json) } catch { return $null }
}

function Save-State([object]$state) {
  $json = $state | ConvertTo-Json -Depth 5
  Write-Utf8NoBom $statePath $json
}

function Clear-State {
  if (Test-Path $statePath) { Remove-Item -Force $statePath }
}

function Stop-Watcher {
  $state = Load-State
  if (-not $state -or -not $state.pid) {
    Write-Host "No watcher state found ($statePath)."
    return
  }

  $watcherProcessId = [int]$state.pid
  $p = Get-Process -Id $watcherProcessId -ErrorAction SilentlyContinue
  if ($p) {
    Stop-Process -Id $watcherProcessId -Force
    Write-Host "Stopped watcher PID=$watcherProcessId"
  } else {
    Write-Host "Watcher PID=$watcherProcessId not running."
  }
  Clear-State
}

if ($Status) {
  $state = Load-State
  if ($state) {
    Write-Host ("running={0} pid={1} mode={2} log={3}" -f $state.running, $state.pid, $state.mode, $state.logPath)
  } else {
    Write-Host "running=false"
  }
  exit 0
}

if ($Stop) {
  Stop-Watcher
  exit 0
}

if ($Start) {
  $existing = Load-State
  if ($existing -and $existing.pid) {
    $p = Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue
    if ($p) {
      Write-Host "Already running PID=$($existing.pid) mode=$($existing.mode) log=$($existing.logPath)"
      exit 0
    }
    Clear-State
  }

  $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $logPath = Join-Path $evidenceFull ("git_watch_{0}.jsonl" -f $ts)

  $args = @(
    "-NoProfile",
    "-File", (Join-Path $repoRoot "scripts" "capture-git-parent.ps1"),
    "-Watch",
    "-Mode", $Mode,
    "-EvidenceDir", $EvidenceDir,
    "-PollMs", $PollMs,
    "-LogPath", $logPath
  )

  # Run as a dedicated process so it survives the current terminal session.
  $proc = Start-Process -FilePath "pwsh" -ArgumentList $args -PassThru -WindowStyle Hidden

  Save-State ([ordered]@{
    running = $true
    pid = $proc.Id
    mode = $Mode
    logPath = $logPath
    startedAt = (Get-Date).ToString("o")
  })

  Write-Host "Started watcher PID=$($proc.Id) Mode=$Mode"
  Write-Host "Log: $logPath"
  Write-Host "Stop: pwsh -File scripts/capture-git-parent.ps1 -Stop"
  exit 0
}

if (-not $Watch) {
  Write-Host "Usage:"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Start [-Mode Observe|Deny] [-PollMs 20]"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Stop"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Status"
  exit 0
}

# --- Watch mode ---

if (-not $LogPath) {
  $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $LogPath = Join-Path $evidenceFull ("git_watch_{0}.jsonl" -f $ts)
}

Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "watcher_start"; pid = $PID; pollMs = $PollMs; mode = $Mode })

function Classify-Action([string]$cmdline) {
  if (-not $cmdline) { return "UNKNOWN" }
  $cl = $cmdline.ToLower()
  if ($cl -match '\bpull\b.*\s--rebase\b') { return "PULL_REBASE" }
  if ($cl -match '\brebase\b') { return "REBASE" }
  if ($cl -match '\bcheckout\b') { return "CHECKOUT" }
  if ($cl -match '\bswitch\b') { return "SWITCH" }
  if ($cl -match '\breset\b') { return "RESET" }
  if ($cl -match '\bfetch\b') { return "FETCH" }
  if ($cl -match '\bstatus\b') { return "STATUS" }
  if ($cl -match '\blog\b') { return "LOG" }
  if ($cl -match '\bdiff\b') { return "DIFF" }
  return "OTHER"
}

function Should-Deny([string]$actionTag) {
  if ($Mode -ne "Deny") { return $false }
  # Check escape hatch
  if ($env:ALLOW_GIT_REBASE -eq "1") { return $false }
  # Only block dangerous operations
  return ($actionTag -in @("PULL_REBASE", "REBASE"))
}

function Get-AncestorInfo([int]$processId) {
  $info = @{ name = $null; cmdline = $null; pid = $null }
  try {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if ($p) {
      $info.name = [string]$p.Name
      $info.cmdline = [string]$p.CommandLine
      $info.pid = [int]$p.ProcessId
    }
  } catch {}
  return $info
}

function Resolve-ProcLine([int]$gitProcessId, [int]$parentProcessId) {
  $gitCmd = $null

  for ($i = 0; $i -lt 5; $i++) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$gitProcessId" -ErrorAction SilentlyContinue
    if ($p -and $p.CommandLine) { $gitCmd = [string]$p.CommandLine; break }
    Start-Sleep -Milliseconds 30
  }

  # Parent
  $parent = Get-AncestorInfo $parentProcessId

  # Grandparent
  $grandParent = @{ name = $null; cmdline = $null; pid = $null }
  try {
    $pp = Get-CimInstance Win32_Process -Filter "ProcessId=$parentProcessId" -ErrorAction SilentlyContinue
    if ($pp -and $pp.ParentProcessId) {
      $grandParent = Get-AncestorInfo ([int]$pp.ParentProcessId)
    }
  } catch {}

  $actionTag = Classify-Action $gitCmd
  $blocked = $false

  if (Should-Deny $actionTag) {
    try {
      Stop-Process -Id $gitProcessId -Force -ErrorAction SilentlyContinue
      $blocked = $true
      Write-Host "[BLOCKED] PID=$gitProcessId action=$actionTag cmd=$gitCmd"
    } catch {
      Write-Host "[BLOCK-FAILED] PID=$gitProcessId action=$actionTag error=$($_.Exception.Message)"
    }

    # Take snapshot on block
    try {
      $snapshotScript = Join-Path $PSScriptRoot "snapshot-proc.ps1"
      if (Test-Path $snapshotScript) {
        Start-Process -FilePath "pwsh" -ArgumentList @("-NoProfile", "-File", $snapshotScript) -WindowStyle Hidden
      }
    } catch {}
  }

  if ($blocked) { $actionTag = "BLOCKED" }

  return (JsonLine @{
    ts = (Get-Date).ToString("o")
    event = "process_create"
    name = "git.exe"
    pid = $gitProcessId
    ppid = $parentProcessId
    commandLine = $gitCmd
    actionTag = $actionTag
    parentName = $parent.name
    parentCommandLine = $parent.cmdline
    grandParentPid = $grandParent.pid
    grandParentName = $grandParent.name
    grandParentCommandLine = $grandParent.cmdline
    mode = $Mode
  })
}

$sourceId = "GitProcStartTrace"
$useEvent = $true

try {
  try {
    Register-WmiEvent -Class Win32_ProcessStartTrace -SourceIdentifier $sourceId -ErrorAction Stop | Out-Null
    Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "mode"; mode = "wmi_event" })
  } catch {
    $useEvent = $false
    Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "mode"; mode = "poll_fallback"; error = $_.Exception.Message })
  }

  # Snapshot existing git.exe processes at startup
  $existingGit = Get-CimInstance Win32_Process -Filter "Name='git.exe'" -ErrorAction SilentlyContinue
  foreach ($eg in ($existingGit | Where-Object { $_ })) {
    Append-Utf8NoBom $LogPath (JsonLine @{
      ts = (Get-Date).ToString("o")
      event = "existing_process"
      name = "git.exe"
      pid = [int]$eg.ProcessId
      ppid = [int]$eg.ParentProcessId
      commandLine = [string]$eg.CommandLine
    })
  }

  if ($useEvent) {
    while ($true) {
      $e = Wait-Event -SourceIdentifier $sourceId -Timeout 5
      if (-not $e) { continue }

      $ne = $e.SourceEventArgs.NewEvent
      if ([string]$ne.ProcessName -ne "git.exe") {
        Remove-Event -EventIdentifier $e.EventIdentifier
        continue
      }

      $gitProcessId = [int]$ne.ProcessID
      $parentProcessId = [int]$ne.ParentProcessID
      Append-Utf8NoBom $LogPath (Resolve-ProcLine -gitProcessId $gitProcessId -parentProcessId $parentProcessId)

      Remove-Event -EventIdentifier $e.EventIdentifier
    }
  } else {
    $known = New-Object 'System.Collections.Generic.HashSet[int]'
    while ($true) {
      $procs = Get-CimInstance Win32_Process -Filter "Name='git.exe'" -ErrorAction SilentlyContinue
      foreach ($p in ($procs | Where-Object { $_ })) {
        $gitProcessId = [int]$p.ProcessId
        if ($known.Add($gitProcessId)) {
          Append-Utf8NoBom $LogPath (Resolve-ProcLine -gitProcessId $gitProcessId -parentProcessId ([int]$p.ParentProcessId))
        }
      }
      Start-Sleep -Milliseconds $PollMs
    }
  }
} finally {
  try { Unregister-Event -SourceIdentifier $sourceId -ErrorAction SilentlyContinue } catch {}
  Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "watcher_stop"; pid = $PID; mode = $Mode })
}
