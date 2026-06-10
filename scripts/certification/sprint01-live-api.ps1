# Sprint 1 live API certification against local Next.js + linked Supabase.
param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$EnvFile = "apps/web/.env.local",
  [string]$ProjectRef = "dcbjjvygjhmngwzuwdjj",
  [string]$LocationId = "11111111-1111-1111-1111-111111111111"
)

$ErrorActionPreference = "Stop"
$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=\s*"?([^"#]+)"?') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$supabaseUrl = $vars['NEXT_PUBLIC_SUPABASE_URL']
$anonKey = $vars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
$serviceKey = $vars['SUPABASE_SERVICE_ROLE_KEY']
if (-not $supabaseUrl -or -not $anonKey) { throw "Missing Supabase URL or anon key in $EnvFile" }

$email = "sprint1-cert@rockhound.dev"
$password = "Sprint1Cert!2026"
$authHeaders = @{ apikey = $anonKey; "Content-Type" = "application/json" }

if ($serviceKey) {
  $adminHeaders = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
    "Content-Type" = "application/json"
  }
  $adminBody = @{ email = $email; password = $password; email_confirm = $true } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Method POST -Headers $adminHeaders -Body $adminBody | Out-Null
  } catch { }
}

$tokenBody = @{ email = $email; password = $password } | ConvertTo-Json
$token = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Method POST -Headers $authHeaders -Body $tokenBody
if (-not $token.access_token) { throw "Failed to obtain access token from linked project" }
Write-Output "PASS auth linked project (password grant)"

$sessionJson = (@{
  access_token = $token.access_token
  refresh_token = $token.refresh_token
  expires_in = $token.expires_in
  token_type = $token.token_type
  user = $token.user
} | ConvertTo-Json -Compress)
$cookieName = "sb-$ProjectRef-auth-token"
$cookieHeader = "$cookieName=$([Uri]::EscapeDataString($sessionJson))"
$apiHeaders = @{
  Authorization = "Bearer $($token.access_token)"
  apikey = $anonKey
  Cookie = $cookieHeader
}

$bbox = Invoke-RestMethod -Uri "$BaseUrl/api/v1/locations?bbox=-121,44,-119,46&limit=10" -Method GET -Headers $apiHeaders
if ($bbox.count -lt 1) { throw "BBOX FAIL: count=$($bbox.count)" }
$site = $bbox.data | Where-Object { $_.id -eq $LocationId } | Select-Object -First 1
if (-not $site) { throw "BBOX FAIL: seeded site missing" }
if ($site.metadata.trust_category -ne 'official') { throw "BBOX FAIL: trust_category=$($site.metadata.trust_category)" }
Write-Output "PASS GET /api/v1/locations bbox (authenticated, seeded site)"

$detail = Invoke-RestMethod -Uri "$BaseUrl/api/v1/locations/$LocationId" -Method GET -Headers $apiHeaders
if ($detail.data.id -ne $LocationId) { throw "DETAIL FAIL: wrong id" }
if ($detail.data.metadata.trust_category -ne 'official') { throw "DETAIL FAIL: trust_category" }
if (-not $detail.data.name) { throw "DETAIL FAIL: missing name" }
Write-Output "PASS GET /api/v1/locations/:id Tier-1 detail (authenticated)"
Write-Output "PASS V1 contract (trust_category in metadata, Tier-1 fields present)"
