param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

function Stop-PortListeners {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "Port ${Port}: no active listener."
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    if (-not $processId) {
      continue
    }

    if ($processId -eq $PID) {
      continue
    }

    try {
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if (-not $process) {
        continue
      }

      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped PID $processId on port $Port ($($process.ProcessName))."
    } catch {
      Write-Warning "Failed to stop PID $processId on port ${Port}: $($_.Exception.Message)"
    }
  }
}

function Show-Help {
  Write-Host 'Aurum local command (Windows PowerShell)'
  Write-Host ''
  Write-Host 'Usage:'
  Write-Host '  aurum --start'
  Write-Host '  aurum --stop'
  Write-Host '  aurum --help'
  Write-Host ''
  Write-Host 'Commands:'
  Write-Host '  --start   Start Docker Postgres, then run pnpm dev:restart'
  Write-Host '  --stop    Stop local web/api listeners and shut down Docker Postgres'
  Write-Host '  --help    Show this help message'
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$command = if ($Args.Count -gt 0) { $Args[0] } else { '--help' }

switch ($command) {
  '--start' {
    Push-Location $repoRoot
    try {
      Write-Host 'Starting Docker services...'
      & docker compose -f infra/docker/docker-compose.yml up -d

      Write-Host 'Restarting Aurum web + api...'
      & pnpm dev:restart
    } finally {
      Pop-Location
    }
  }
  '--stop' {
    Push-Location $repoRoot
    try {
      Write-Host 'Stopping local web + api listeners...'
      Stop-PortListeners -Port 3000
      Stop-PortListeners -Port 3001

      Write-Host 'Stopping Docker services...'
      & docker compose -f infra/docker/docker-compose.yml down
    } finally {
      Pop-Location
    }
  }
  '--help' {
    Show-Help
  }
  default {
    Write-Error "Unknown command: $command`nRun 'aurum --help' for usage."
  }
}
