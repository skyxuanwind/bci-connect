# Build Windows EXE from PowerShell launcher using PS2EXE
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Dist = Join-Path $Root 'dist'
$Src = Join-Path $Root 'client/public/BCI-NFC-Gateway-Launcher-Windows.ps1'
$Out = Join-Path $Dist 'BCI-NFC-Gateway-Launcher-Windows.exe'

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

# Ensure PS2EXE is available
if (-not (Get-Command Invoke-PS2EXE -ErrorAction SilentlyContinue)) {
  try {
    if (-not (Get-Module -ListAvailable -Name ps2exe)) {
      Install-Module -Name ps2exe -Scope CurrentUser -Force -AllowClobber -Repository PSGallery
    }
    Import-Module ps2exe -ErrorAction Stop
  } catch {
    # Fallback to single-file ps2exe.ps1 from GitHub
    $ps2exeUrl = 'https://raw.githubusercontent.com/MScholtes/PS2EXE/master/ps2exe.ps1'
    $ps2exePath = Join-Path $env:TEMP 'ps2exe.ps1'
    Invoke-WebRequest -Uri $ps2exeUrl -OutFile $ps2exePath
    . $ps2exePath
  }
}

# Convert to windowless EXE
Invoke-PS2EXE -InputFile $Src -OutputFile $Out -NoConsole -Title 'BCI NFC Gateway Launcher'

# Optional code signing if certificate provided via secrets
if ($env:WIN_CERT_BASE64 -and $env:WIN_CERT_PASSWORD) {
  Write-Host 'Signing executable...'
  $pfx = Join-Path $env:TEMP 'codesign.pfx'
  [IO.File]::WriteAllBytes($pfx, [Convert]::FromBase64String($env:WIN_CERT_BASE64))
  & signtool sign /f $pfx /p $env:WIN_CERT_PASSWORD /fd SHA256 /tr http://timestamp.sectigo.com /td SHA256 $Out
}

Write-Host "Built: $Out"