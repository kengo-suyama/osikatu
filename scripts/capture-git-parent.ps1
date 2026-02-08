Param(
  [switch]$Start,
  [switch]$Stop,
  [switch]$Status,
  [switch]$Watch,
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
    Write-Host ("running={0} pid={1} log={2}" -f $state.running, $state.pid, $state.logPath)
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
      Write-Host "Already running PID=$($existing.pid) log=$($existing.logPath)"
      exit 0
    }
    Clear-State
  }

  $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $logPath = Join-Path $evidenceFull ("git_process_create_watch_{0}.log" -f $ts)

  $args = @(
    "-NoProfile",
    "-File", (Join-Path $repoRoot "scripts" "capture-git-parent.ps1"),
    "-Watch",
    "-EvidenceDir", $EvidenceDir,
    "-PollMs", $PollMs,
    "-LogPath", $logPath
  )

  # Run as a dedicated process so it survives the current terminal session.
  $proc = Start-Process -FilePath "pwsh" -ArgumentList $args -PassThru -WindowStyle Hidden

  Save-State ([ordered]@{
    running = $true
    pid = $proc.Id
    logPath = $logPath
    startedAt = (Get-Date).ToString("o")
  })

  Write-Host "Started watcher PID=$($proc.Id)"
  Write-Host "Log: $logPath"
  Write-Host "Stop: pwsh -File scripts/capture-git-parent.ps1 -Stop"
  exit 0
}

if (-not $Watch) {
  Write-Host "Usage:"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Start"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Stop"
  Write-Host "  pwsh -File scripts/capture-git-parent.ps1 -Status"
  exit 0
}

# --- Watch mode ---

if (-not $LogPath) {
  $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $LogPath = Join-Path $evidenceFull ("git_process_create_watch_{0}.log" -f $ts)
}

Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "watcher_start"; pid = $PID; pollMs = $PollMs })

function Resolve-ProcLine([int]$gitProcessId, [int]$parentProcessId) {
  $gitCmd = $null
  $parentName = $null
  $parentCmd = $null

  for ($i = 0; $i -lt 5; $i++) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$gitProcessId" -ErrorAction SilentlyContinue
    if ($p -and $p.CommandLine) { $gitCmd = [string]$p.CommandLine; break }
    Start-Sleep -Milliseconds 30
  }

  $pp = Get-CimInstance Win32_Process -Filter "ProcessId=$parentProcessId" -ErrorAction SilentlyContinue
  if ($pp) {
    $parentName = [string]$pp.Name
    $parentCmd = [string]$pp.CommandLine
  }

  return (JsonLine @{
    ts = (Get-Date).ToString("o")
    event = "process_create"
    name = "git.exe"
    pid = $gitProcessId
    ppid = $parentProcessId
    commandLine = $gitCmd
    parentName = $parentName
    parentCommandLine = $parentCmd
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
  Append-Utf8NoBom $LogPath (JsonLine @{ ts = (Get-Date).ToString("o"); event = "watcher_stop"; pid = $PID })
}
