# BCI NFC Gateway - Windows One-Click Launcher (PowerShell)
# This script will:
# - Ensure Node.js 20 LTS is available (via winget or MSI fallback)
# - Ensure PC/SC service is running (for NFC readers)
# - Download the latest repo (main branch) and stage the needed folders
# - Install dependencies and rebuild nfc-pcsc if necessary
# - Start the NFC Gateway (port 3002) and the Client (port 3000) hidden
# - Open the browser at http://localhost:3000/checkin-scanner

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[BCI] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[BCI] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[BCI] $msg" -ForegroundColor Red }

# --- Paths ---
$BaseDir = Join-Path $env:USERPROFILE 'BCI-Connect'
$GatewayDir = Join-Path $BaseDir 'nfc-gateway-service'
$ClientDir  = Join-Path $BaseDir 'client'
$Global:NodePath = 'node'

# Ensure folders
New-Item -ItemType Directory -Force -Path $BaseDir | Out-Null

# --- Ensure Node.js 20 LTS ---
function Ensure-Node20 {
  $nodeVer = $null
  try { $nodeVer = (& node -v) } catch { $nodeVer = $null }
  if ($nodeVer -and $nodeVer -match '^v20\.') { Write-Info "Node $nodeVer already installed"; $Global:NodePath = 'node'; return }

  # Prefer portable Node to avoid UAC/admin
  try {
    Write-Info 'Setting up portable Node.js 20 (no admin)...'
    $nodeVersion = 'v20.12.2'
    $portableRoot = Join-Path $BaseDir '.node-portable'
    $nodeHome = $null
    if (Test-Path $portableRoot) {
      $nodeHome = (Get-ChildItem -Path $portableRoot -Directory | Where-Object { $_.Name -like "node-$nodeVersion-win*" } | Select-Object -First 1).FullName
    }
    if (-not $nodeHome) {
      $isArm = $env:PROCESSOR_ARCHITECTURE -eq 'ARM64'
      $zipName = if ($isArm) { "node-$nodeVersion-win-arm64.zip" } else { "node-$nodeVersion-win-x64.zip" }
      $url = "https://nodejs.org/dist/$nodeVersion/$zipName"
      $zipPath = Join-Path $env:TEMP $zipName
      if (Test-Path $portableRoot) { Remove-Item $portableRoot -Recurse -Force }
      New-Item -ItemType Directory -Path $portableRoot | Out-Null
      Write-Info "Downloading $zipName..."
      Invoke-WebRequest -Uri $url -OutFile $zipPath
      Write-Info 'Extracting portable Node...'
      Expand-Archive -Path $zipPath -DestinationPath $portableRoot -Force
      $nodeHome = (Get-ChildItem -Path $portableRoot -Directory | Where-Object { $_.Name -like "node-$nodeVersion-win*" } | Select-Object -First 1).FullName
    }
    if ($nodeHome) {
      $Global:NodePath = Join-Path $nodeHome 'node.exe'
      $env:PATH = "$nodeHome;$env:PATH"
      $nv = (& $Global:NodePath -v)
      if ($nv -match '^v20\.') { Write-Info "Using portable Node $nv"; return }
    }
    throw 'Portable Node not ready'
  } catch {
    Write-Warn 'Portable Node setup failed; trying system installer (may prompt)...'
  }

  # Fall back to system install (winget or MSI)
  $hasWinget = $false
  try { $hasWinget = (Get-Command winget -ErrorAction Stop) -ne $null } catch { $hasWinget = $false }
  if ($hasWinget) {
    Start-Process -FilePath 'winget' -ArgumentList @('install','--id','OpenJS.NodeJS.LTS','--silent','--accept-package-agreements','--accept-source-agreements','--disable-interactivity') -Wait -NoNewWindow
  } else {
    $isArm = $env:PROCESSOR_ARCHITECTURE -eq 'ARM64'
    $nodeVersion = 'v20.12.2'
    $msiName = if ($isArm) { "node-$nodeVersion-arm64.msi" } else { "node-$nodeVersion-x64.msi" }
    $url = "https://nodejs.org/dist/$nodeVersion/$msiName"
    $msiPath = Join-Path $env:TEMP $msiName
    Write-Info "Downloading Node MSI ($msiName)..."
    Invoke-WebRequest -Uri $url -OutFile $msiPath
    Write-Info 'Installing Node MSI silently...'
    Start-Process 'msiexec.exe' -ArgumentList @('/i', "$msiPath", '/qn', '/norestart', 'ALLUSERS=1') -Wait
  }

  $cand = @("$env:ProgramFiles\nodejs", "$env:LOCALAPPDATA\Programs\nodejs")
  foreach ($p in $cand) { if (Test-Path $p) { $env:PATH = "$p;$env:PATH" } }
  try {
    $nv = (& node -v)
    if ($nv -match '^v20\.') { $Global:NodePath = 'node'; Write-Info "Using Node $nv"; return }
  } catch {}

  Write-Err 'Failed to setup Node 20. Please install Node 20 manually from https://nodejs.org/en/download and re-run.'
  exit 1
}

# --- Ensure PC/SC service is running ---
function Ensure-PCSC {
  try {
    $svc = Get-Service -Name 'SCardSvr' -ErrorAction Stop
    if ($svc.Status -ne 'Running') { Write-Info 'Starting Smart Card (PC/SC) service...'; Start-Service 'SCardSvr' }
  } catch {
    Write-Warn 'PC/SC service not found. On most Windows 10/11 this exists as SCardSvr. NFC readers may not work without it.'
  }
}

# --- Download latest repo and stage needed folders ---
function Stage-Repo {
  $zipUrl = 'https://github.com/skyxuanwind/bci-connect/archive/refs/heads/main.zip'
  $zipPath = Join-Path $env:TEMP 'bci-connect-main.zip'
  $extractPath = Join-Path $env:TEMP 'bci-connect-main'

  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }

  Write-Info 'Downloading latest code (main branch)...'
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

  Write-Info 'Extracting...'
  Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force

  $repoRoot = $extractPath
  if (-not (Test-Path $repoRoot)) {
    $repoRoot = (Get-ChildItem -Path $env:TEMP -Directory | Where-Object { $_.Name -like 'bci-connect-main*' } | Select-Object -First 1).FullName
  }
  if (-not (Test-Path "$repoRoot\nfc-gateway-service")) { Write-Err 'Archive missing nfc-gateway-service'; exit 1 }
  if (-not (Test-Path "$repoRoot\client")) { Write-Err 'Archive missing client'; exit 1 }

  if (Test-Path $GatewayDir) { Remove-Item $GatewayDir -Recurse -Force }
  if (Test-Path $ClientDir)  { Remove-Item $ClientDir  -Recurse -Force }

  Write-Info 'Staging nfc-gateway-service and client...'
  Copy-Item -Recurse -Force "$repoRoot\nfc-gateway-service" $BaseDir
  Copy-Item -Recurse -Force "$repoRoot\client" $BaseDir
}

# --- Install dependencies and fix nfc-pcsc if needed ---
function Setup-Dependencies {
  Push-Location $GatewayDir
  Write-Info 'Installing gateway dependencies...'
  if (Test-Path 'package-lock.json') { npm ci } else { npm install }
  $needFix = $false
  try { & $Global:NodePath -e "require('nfc-pcsc');console.log('nfc-pcsc:OK')" | Out-Null } catch { $needFix = $true }
  if ($needFix) {
    Write-Warn 'nfc-pcsc failed to load, attempting rebuild...'
    try { npm i nfc-pcsc@latest --force --build-from-source } catch { Write-Warn 'Rebuild failed (will try at runtime)'}
  }
  Pop-Location

  Push-Location $ClientDir
  Write-Info 'Installing client dependencies...'
  if (Test-Path 'package-lock.json') { npm ci } else { npm install }
  Pop-Location
}

# --- Start services hidden ---
function Start-Services {
  Ensure-PCSC
  Write-Info 'Starting NFC Gateway (port 3002)...'
  Start-Process -WindowStyle Hidden -WorkingDirectory $GatewayDir -FilePath $Global:NodePath -ArgumentList 'server.js'

  Write-Info 'Starting Web Client (port 3000)...'
  $env:BROWSER = 'none'
  Start-Process -WindowStyle Hidden -WorkingDirectory $ClientDir -FilePath 'npm.cmd' -ArgumentList 'start'
}

# --- Wait for health and open browser ---
function Open-UI {
  $health = 'http://localhost:3002/health'
  $url = 'http://localhost:3000/checkin-scanner'
  Write-Info 'Waiting for services to become ready...'
  for ($i=0; $i -lt 45; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $health -TimeoutSec 2 -UseBasicParsing
      if ($r.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  Write-Info "Opening $url"
  Start-Process $url | Out-Null
}

# --- Flow ---
try {
  Ensure-Node20
  Stage-Repo
  Setup-Dependencies
  Start-Services
  Open-UI
  Write-Info 'All done. You can close this window.'
} catch {
  Write-Err ("Launcher failed: " + $_.Exception.Message)
  exit 1
}