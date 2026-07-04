function Get-VndrlySecretsDir {
  param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  )
  if ($env:VNDRLY_SECRETS_DIR) {
    return $env:VNDRLY_SECRETS_DIR
  }
  return Join-Path (Split-Path $RepoRoot -Parent) "API Keys and Secrets"
}

function Get-VndrlyMapboxEnvPath {
  param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  )
  if ($env:MAPBOX_ENV) {
    return $env:MAPBOX_ENV
  }
  return Join-Path (Get-VndrlySecretsDir -RepoRoot $RepoRoot) "MAPBOX Account.env"
}
