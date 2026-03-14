param(
  [int[]]$Ports = @(3000, 3001),
  [switch]$NoStart,
  [switch]$SkipMigrate
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

Write-Host "Cleaning dev ports: $($Ports -join ', ')"
foreach ($port in $Ports) {
  Stop-PortListeners -Port $port
}

if ($NoStart) {
  Write-Host "NoStart enabled. Skipping dev startup."
  exit 0
}

if (-not $SkipMigrate) {
  Write-Host "Applying pending API migrations (prisma migrate deploy)..."
  pnpm -C apps/api exec prisma migrate deploy
}

Write-Host "Starting web + api (pnpm dev:app)..."
pnpm dev:app
