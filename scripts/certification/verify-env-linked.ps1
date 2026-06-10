# Verifies apps/web/.env.local Supabase vars point at linked project (no secret output).
param(
  [string]$ProjectRef = "dcbjjvygjhmngwzuwdjj",
  [string]$EnvFile = "apps/web/.env.local"
)

$expectedUrl = "https://$ProjectRef.supabase.co"
$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=\s*"?([^"#]+)"?') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$fail = $false
foreach ($name in @('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')) {
  $val = $vars[$name]
  if ($val -ne $expectedUrl) {
    Write-Output "FAIL $name expected $expectedUrl got $val"
    $fail = $true
  } else {
    Write-Output "PASS $name=$val"
  }
}

foreach ($name in @('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')) {
  $val = $vars[$name]
  if (-not $val) { Write-Output "FAIL $name missing"; $fail = $true; continue }
  if ($val -match '^sb_publishable_') {
    if ($val -eq 'sb_publishable_9OVJsdkGSmZlI_jrT60dmg_x1P1cX9k') {
      Write-Output "FAIL $name appears to be old mycelial/local stack key"
      $fail = $true
    } else {
      Write-Output "PASS $name publishable key present (linked project)"
    }
  } elseif ($val -match '^eyJ') {
    $payload = $val.Split('.')[1]
    $pad = (4 - ($payload.Length % 4)) % 4
    $payload += '=' * $pad
    $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-','+').Replace('_','/')))
    if ($json -match "`"ref`":`"$ProjectRef`"") {
      Write-Output "PASS $name JWT ref matches $ProjectRef"
    } else {
      Write-Output "FAIL $name JWT ref mismatch"
      $fail = $true
    }
  } else {
    Write-Output "WARN $name unrecognized format"
  }
}

if ($vars['SUPABASE_SERVICE_ROLE_KEY']) {
  Write-Output "PASS SUPABASE_SERVICE_ROLE_KEY=[SET]"
} else {
  Write-Output "WARN SUPABASE_SERVICE_ROLE_KEY missing"
}

if ($fail) { exit 1 }
