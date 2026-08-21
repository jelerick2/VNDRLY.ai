# Publish a JS-only VNDRLY Field Mobile update through EAS Update.
param(
  [ValidateSet("preview", "production")]
  [string]$Channel = "preview",

  [ValidateSet("all", "ios", "android")]
  [string]$Platform = "all",

  [string]$Message = "",

  [ValidateRange(1, 100)]
  [int]$RolloutPercentage = 100,

  [switch]$AllowNativeChanges,
  [switch]$SkipTests,
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "eas-mobile-common.ps1")

Initialize-EasEnvironment
Assert-EasCli

if (-not $Message.Trim()) {
  $Message = "VNDRLY mobile OTA $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-EasStep "Checking Expo login"
Invoke-Eas @("whoami", "--non-interactive")

Write-EasStep "Checking for native-change risk"
Set-Location $script:RepoRoot
node (Join-Path $script:RepoRoot "scripts\mobile-release-impact.mjs")
$impactExit = $LASTEXITCODE
if ($impactExit -eq 2 -and -not $AllowNativeChanges) {
  Write-Host ""
  Write-Host "This change set includes files that require a native build/TestFlight release." -ForegroundColor Red
  Write-Host "Use pnpm run testflight:build, or rerun with -AllowNativeChanges only if you have verified the update is JS-only." -ForegroundColor Yellow
  exit 2
}
if ($impactExit -ne 0 -and $impactExit -ne 2) {
  exit $impactExit
}

Write-EasStep "Running mobile TypeScript check"
Set-Location $script:RepoRoot
pnpm --filter @workspace/vndrly-mobile run typecheck -- --pretty false
if ($LASTEXITCODE -ne 0) {
  Write-Host "Typecheck failed." -ForegroundColor Red
  exit 1
}

if (-not $SkipTests) {
  Write-EasStep "Running mobile tests"
  pnpm --filter @workspace/vndrly-mobile run test
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Mobile tests failed." -ForegroundColor Red
    exit 1
  }
}

Write-EasStep "Publishing EAS Update to $Channel"
$updateArgs = @(
  "update",
  "--channel", $Channel,
  "--environment", $Channel,
  "--platform", $Platform,
  "--message", $Message
)
if ($RolloutPercentage -lt 100) {
  $updateArgs += @("--rollout-percentage", "$RolloutPercentage")
}
if ($NonInteractive) {
  $updateArgs += "--non-interactive"
}
Invoke-Eas $updateArgs

Write-EasStep "Done"
$rolloutLabel = if ($RolloutPercentage -lt 100) { "$RolloutPercentage% rollout" } else { "full rollout" }
Write-Host "Published OTA update to channel '$Channel' for platform '$Platform' ($rolloutLabel)."
