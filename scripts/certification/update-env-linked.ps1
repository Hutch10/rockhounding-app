# Updates apps/web/.env.local with linked project Supabase credentials.
# Does not print secret values to stdout.
param(
  [string]$ProjectRef = "dcbjjvygjhmngwzuwdjj",
  [string]$EnvFile = "apps/web/.env.local"
)

$ErrorActionPreference = "Stop"
$projectUrl = "https://$ProjectRef.supabase.co"

$keysJson = pnpm dlx supabase projects api-keys --project-ref $ProjectRef -o json 2>$null
if (-not $keysJson) { throw "Failed to fetch API keys for $ProjectRef" }
$keys = $keysJson | ConvertFrom-Json

$anon = ($keys | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1).api_key
if (-not $anon) {
  $anon = ($keys | Where-Object { $_.type -eq 'publishable' -and -not $_.disabled } | Select-Object -First 1).api_key
}
$service = ($keys | Where-Object { $_.name -eq 'service_role' } | Select-Object -First 1).api_key
if (-not $anon) { throw "No anon/publishable key found for $ProjectRef" }

$lines = @()
if (Test-Path $EnvFile) {
  $lines = @(Get-Content $EnvFile)
}

$names = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
)
$lines = $lines | Where-Object {
  $line = $_
  -not ($names | ForEach-Object { $line -match "^\s*$_\s*=" } | Where-Object { $_ })
}

$lines += "NEXT_PUBLIC_SUPABASE_URL=`"$projectUrl`""
$lines += "SUPABASE_URL=`"$projectUrl`""
$lines += "NEXT_PUBLIC_SUPABASE_ANON_KEY=`"$anon`""
$lines += "SUPABASE_ANON_KEY=`"$anon`""
if ($service) {
  $lines += "SUPABASE_SERVICE_ROLE_KEY=`"$service`""
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $EnvFile), ($lines -join "`n") + "`n", $utf8NoBom)

foreach ($name in $names) {
  $hit = Select-String -Path $EnvFile -Pattern "^\s*$name\s*=" -Quiet
  if ($hit) {
    if ($name -match 'KEY') { Write-Output "$name=[SET]" } else { Get-Content $EnvFile | Where-Object { $_ -match "^\s*$name\s*=" } }
  } else {
    Write-Output "$name=[MISSING]"
  }
}
