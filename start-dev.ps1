<#
start-dev.ps1
Simple helper script to start backend (Docker) and frontend dev server in two PowerShell windows.
Run from repository root in Windows PowerShell.
#>

Write-Host "Starting backend (docker-compose up --build) in a new PowerShell window..."
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$(Resolve-Path .)'; docker-compose up --build" 

Start-Sleep -Seconds 2

Write-Host "Starting frontend dev server (npm start) in a new PowerShell window..."
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$(Resolve-Path .)\uisrooms-web'; npm install; npm start"

Write-Host "Laventado: backend y frontend (revisa las ventanas abiertas)"
