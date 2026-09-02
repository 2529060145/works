$ErrorActionPreference = "Stop"

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
  $env:Path = "$cargoBin;$env:Path"
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Cargo was not found. Install Rustup and reopen PowerShell."
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
$hasVcTools = $false

if (Test-Path $vswhere) {
  $vcInstallPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  $hasVcTools = -not [string]::IsNullOrWhiteSpace($vcInstallPath)
}

if (-not (Get-Command link.exe -ErrorAction SilentlyContinue) -and -not $hasVcTools) {
  throw "link.exe was not found. Install Visual Studio 2022 Build Tools with the C++ build tools workload."
}

npm run tauri:build

$releaseExe = Join-Path $PSScriptRoot "..\src-tauri\target\release\app.exe"
$outputDir = Join-Path $PSScriptRoot "..\dist-desktop"
$outputExe = Join-Path $outputDir "求职投递管理.exe"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if (Test-Path $releaseExe) {
  Copy-Item -LiteralPath $releaseExe -Destination $outputExe -Force
  Write-Host "Desktop EXE created: $outputExe"
} else {
  Write-Host "Tauri build finished, but $releaseExe was not found. Check src-tauri\target\release."
}

$bundleDir = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle"
if (Test-Path $bundleDir) {
  Copy-Item -LiteralPath $bundleDir -Destination (Join-Path $outputDir "bundle") -Recurse -Force
  Write-Host "Installer bundle copied to: $(Join-Path $outputDir 'bundle')"
}
