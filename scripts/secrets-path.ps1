function Get-VndrlySecretsDir {
  param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  )
  if ($env:VNDRLY_SECRETS_DIR) {
    return $env:VNDRLY_SECRETS_DIR
  }

  $home = if ($env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }
  $candidates = @(
    (Join-Path (Split-Path $RepoRoot -Parent) "API Keys and Secrets"),
    (Join-Path $home "OneDrive\Documents\DEV\API Keys and Secrets"),
    (Join-Path $home "Documents\DEV\API Keys and Secrets"),
    "C:\Users\john\OneDrive\Documents\DEV\API Keys and Secrets"
  )

  foreach ($dir in $candidates) {
    if ($dir -and (Test-Path -LiteralPath $dir)) {
      return $dir
    }
  }
  return $candidates[0]
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
