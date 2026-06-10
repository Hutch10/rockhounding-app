# Makes Supabase migration SQL idempotent for certification re-push.
# - Removes standalone BEGIN;/COMMIT; (Supabase wraps each migration file in a transaction)
# - Wraps CREATE TYPE ... AS ENUM in duplicate_object-safe DO blocks

param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$content = Get-Content -Path $Path -Raw

# Remove standalone transaction boundaries (not $$ dollar-quoted bodies)
$content = $content -replace '(?m)^BEGIN;\r?\n', ''
$content = $content -replace '(?m)^COMMIT;\r?\n', ''

# Wrap CREATE TYPE ... AS ENUM (...) in idempotent DO blocks
$pattern = '(?ms)^CREATE TYPE\s+(\S+)\s+AS\s+ENUM\s*\((.*?)\)\s*;'
$evaluator = {
    param($match)
    $typeName = $match.Groups[1].Value
    $enumBody = $match.Groups[2].Value.Trim()
    @"
DO `$`$ BEGIN
  CREATE TYPE $typeName AS ENUM (
$enumBody
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END `$`$;

"@
}
$content = [regex]::Replace($content, $pattern, $evaluator)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $Path), $content, $utf8NoBom)
Write-Host "Patched: $Path"
