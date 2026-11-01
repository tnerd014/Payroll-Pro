$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "==> Building Payroll Pro local release package" -ForegroundColor Cyan

$releaseDir = Join-Path $repoRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

Write-Host "==> Installing Node dependencies" -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
    npm install --no-fund --no-audit
    if (-not $?) { throw 'npm install failed' }
} else {
    Write-Host "Node dependencies already installed; skipping npm install." -ForegroundColor Yellow
}

Write-Host "==> Building web app" -ForegroundColor Yellow
npm run build
if (-not $?) { throw 'npm run build failed' }

Write-Host "==> Building Windows installer" -ForegroundColor Yellow
npx electron-builder --win --x64 --publish never
if (-not $?) { throw 'Windows installer build failed' }

Write-Host "==> Syncing Capacitor Android project" -ForegroundColor Yellow
npx cap sync android
if (-not $?) { throw 'Capacitor sync failed' }

$androidDir = Join-Path $repoRoot 'android'
$apkSource = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
$apkTarget = Join-Path $releaseDir 'app-release.apk'

if (-not (Test-Path $apkSource)) {
    Write-Host "==> Building Android APK" -ForegroundColor Yellow
    Push-Location $androidDir
    cmd /c '.\gradlew.bat assembleDebug'
    Pop-Location
}

if (-not (Test-Path $apkSource)) {
    throw "Android APK was not produced at $apkSource"
}

Copy-Item $apkSource $apkTarget -Force

Write-Host "==> Generating release manifest" -ForegroundColor Yellow
node scripts/generate-release-manifest.mjs
if (-not $?) { throw 'Manifest generation failed' }

Write-Host "" 
Write-Host "Local release build completed." -ForegroundColor Green
Write-Host "Installer artifacts are in: $releaseDir" -ForegroundColor Green
Write-Host "APK: $apkTarget" -ForegroundColor Green
Write-Host "Manifest: $(Join-Path $releaseDir 'latest.json')" -ForegroundColor Green
