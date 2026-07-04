# Shared EAS helpers for VNDRLY mobile scripts (run from any cwd).

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:MobileRoot = Join-Path $script:RepoRoot "artifacts\vndrly-mobile"
$script:EasCli = Join-Path $script:MobileRoot "node_modules\.bin\eas.cmd"
. (Join-Path $PSScriptRoot "secrets-path.ps1")

function Import-RepoEnvLocal {
  $envPath = Join-Path $script:RepoRoot ".env.local"
  if (-not (Test-Path $envPath)) {
    return
  }

  Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Import-MapboxSecretEnv {
  $envPath = Get-VndrlyMapboxEnvPath -RepoRoot $script:RepoRoot
  if (-not (Test-Path $envPath)) {
    return
  }

  Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if (($key -eq "api" -or $key -eq "MAPBOX_ACCESS_TOKEN" -or $key -eq "MAPBOX_API_KEY") -and -not $env:MAPBOX_ACCESS_TOKEN) {
      $env:MAPBOX_ACCESS_TOKEN = $value
    }
  }
}

function Initialize-EasEnvironment {
  $env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;" + $env:Path
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  $env:EAS_BUILD_NO_EXPO_GO_WARNING = "true"
  Import-RepoEnvLocal
  Import-MapboxSecretEnv
  if (-not $env:EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN -and $env:MAPBOX_ACCESS_TOKEN) {
    $env:EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = $env:MAPBOX_ACCESS_TOKEN
  }
  if (-not $env:EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN -and $env:MAPBOX_API_KEY) {
    $env:EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = $env:MAPBOX_API_KEY
  }
}

function Assert-EasCli {
  if (-not (Test-Path $script:EasCli)) {
    Write-Host ""
    Write-Host "EAS CLI not found at:" -ForegroundColor Red
    Write-Host "  $script:EasCli" -ForegroundColor Red
    Write-Host ""
    Write-Host "From repo root run:  pnpm install" -ForegroundColor Yellow
    exit 1
  }
}

function Invoke-Eas {
  param([Parameter(Mandatory = $true)][string[]]$Args)
  Set-Location $script:MobileRoot
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $script:EasCli @Args 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        Write-Host $_.ToString()
      } else {
        Write-Host $_
      }
    }
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    $ErrorActionPreference = $prev
  }
}

function Write-EasStep {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}
