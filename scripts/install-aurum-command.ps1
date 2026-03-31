$ErrorActionPreference = 'Stop'

$profilePath = $PROFILE.CurrentUserAllHosts
$profileDirectory = Split-Path -Parent $profilePath
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$launcherPath = Join-Path $repoRoot 'scripts\aurum.ps1'

if (-not (Test-Path $profileDirectory)) {
  New-Item -ItemType Directory -Path $profileDirectory -Force | Out-Null
}

if (-not (Test-Path $profilePath)) {
  New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

$profileContent = Get-Content $profilePath -Raw
$startMarker = '# >>> Aurum command >>>'
$endMarker = '# <<< Aurum command <<<'

$block = @"
$startMarker
function aurum {
  param(
    [Parameter(ValueFromRemainingArguments = `$true)]
    [string[]]`$Args
  )

  & '$launcherPath' @Args
}
$endMarker
"@

$pattern = "(?s)$([regex]::Escape($startMarker)).*?$([regex]::Escape($endMarker))"

if ($profileContent -match $pattern) {
  $updatedContent = [regex]::Replace($profileContent, $pattern, $block)
} else {
  $separator = if ([string]::IsNullOrWhiteSpace($profileContent)) { '' } else { "`r`n`r`n" }
  $updatedContent = $profileContent + $separator + $block
}

Set-Content -Path $profilePath -Value $updatedContent

Write-Host "Installed aurum command into $profilePath"
Write-Host "Open a new PowerShell window, or run: . `"$profilePath`""
