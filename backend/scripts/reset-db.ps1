<#
reset-db.ps1

Helper script to reset the Postgres volume for this project and restart docker-compose.

WARNING: This will DELETE the project's Postgres data volume. Use only if you understand
that existing DB data will be lost.

Usage:
  From the repository root in PowerShell:
    .\scripts\reset-db.ps1

You can pass -ConfirmRun to skip the interactive confirmation (useful in automation):
    .\scripts\reset-db.ps1 -ConfirmRun
#>

param(
    [switch]$ConfirmRun
)

function FailIfCommandMissing($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "Required command '$name' not found in PATH. Please install it and try again."
        exit 1
    }
}

FailIfCommandMissing -name 'docker'
FailIfCommandMissing -name 'docker-compose'

Write-Host "This script will stop the docker-compose services, remove volumes, and bring them up again."
Write-Host "*** THIS WILL DELETE THE POSTGRES DATA VOLUME FOR THIS PROJECT. ***" -ForegroundColor Yellow

if (-not $ConfirmRun) {
    $answer = Read-Host "Type 'yes' to confirm and continue"
    if ($answer -ne 'yes') {
        Write-Host "Aborted by user. No changes made."
        exit 0
    }
}

Write-Host "Stopping containers and removing volumes..."
docker-compose down -v

Write-Host "Recreating and starting services (this may take a few minutes)..."
docker-compose up --build

Write-Host "Done. Check logs with 'docker-compose logs -f' if anything fails." 
