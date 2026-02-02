param(
  [string]$ApiUrl = "http://127.0.0.1:8000",
  [string]$WebUrl = "http://127.0.0.1:3000",
  [string]$DeviceId = "device-fortune-001"
)

$ErrorActionPreference = "Stop"

function Pass([string]$Message) {
  Write-Host "[PASS] $Message"
}

function Fail([string]$Message) {
  Write-Host "[FAIL] $Message"
  exit 1
}

function Clean-Json([string]$Content) {
  if ($null -eq $Content) { return $Content }
  $clean = $Content.TrimStart()
  if ($clean.StartsWith("ï»¿")) { $clean = $clean.Substring(3) }
  $clean = $clean.TrimStart([char]0xFEFF)
  while ($clean.Length -gt 0 -and $clean[0] -ne '{' -and $clean[0] -ne '[') {
    $clean = $clean.Substring(1)
  }
  return $clean
}

function Get-UrlRaw([string]$Url) {
  $html = & curl.exe -s -L $Url
  if ($LASTEXITCODE -ne 0) {
    Fail "HTTP request failed: $Url"
  }
  return $html
}

function Assert-Contains([string]$Haystack, [string]$Needle, [string]$Label) {
  if ($null -eq $Haystack -or $Haystack -notmatch [regex]::Escape($Needle)) {
    Fail "$Label missing '$Needle'"
  }
}

$apiHost = ([System.Uri]$ApiUrl).Host
$apiPort = ([System.Uri]$ApiUrl).Port
$apiReachable = $false
try {
  $apiReachable = (Test-NetConnection $apiHost -Port $apiPort).TcpTestSucceeded
} catch {
  $apiReachable = $false
}

if ($apiReachable) {
  try {
    $todayUrl = "$ApiUrl/api/me/fortune/today?date=2026-02-01"
    $todayResp = Invoke-WebRequest -Uri $todayUrl -Headers @{ "X-Device-Id" = $DeviceId } -Method GET -UseBasicParsing
    if ($todayResp.StatusCode -ne 200) { Fail "API today HTTP $($todayResp.StatusCode)" }
    $todayJson = (Clean-Json $todayResp.Content) | ConvertFrom-Json
    if (-not $todayJson.success.data) { Fail "API today missing success.data" }
    Pass "API today OK"
  } catch {
    Fail "API today failed: $($_.Exception.Message)"
  }

  try {
    $historyUrl = "$ApiUrl/api/me/fortune/history?from=2026-01-26&to=2026-02-01"
    $historyResp = Invoke-WebRequest -Uri $historyUrl -Headers @{ "X-Device-Id" = $DeviceId } -Method GET -UseBasicParsing
    if ($historyResp.StatusCode -ne 200) { Fail "API history HTTP $($historyResp.StatusCode)" }
    $historyJson = (Clean-Json $historyResp.Content) | ConvertFrom-Json
    if (-not $historyJson.success.data) { Fail "API history missing success.data" }
    Pass "API history OK"
  } catch {
    Fail "API history failed: $($_.Exception.Message)"
  }
}

$homeNeedle = ([char]0x4eca) + ([char]0x65e5) + ([char]0x306e) + ([char]0x904b) + ([char]0x52e2)
$fortuneNeedle = ([char]0x904b) + ([char]0x52e2) + ([char]0x5c65) + ([char]0x6b74)

try {
  $homeHtml = Get-UrlRaw "$WebUrl/home"
  Assert-Contains $homeHtml $homeNeedle "/home SSR"
  Pass "/home SSR contains $homeNeedle"
} catch {
  Fail "/home SSR failed: $($_.Exception.Message)"
}

try {
  $fortuneHtml = Get-UrlRaw "$WebUrl/fortune"
  Assert-Contains $fortuneHtml $fortuneNeedle "/fortune SSR"
  Pass "/fortune SSR contains $fortuneNeedle"
} catch {
  Fail "/fortune SSR failed: $($_.Exception.Message)"
}

Write-Host "ALL PASS"
exit 0
