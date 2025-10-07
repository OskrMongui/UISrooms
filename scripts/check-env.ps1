<#
check-env.ps1
Verifica que el archivo .env contenga las variables necesarias antes de arrancar.
Salida: exit 0 si OK, exit 1 si falta alguna variable.
#>

Param()

$required = @('SECRET_KEY', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD')

$envPath = Join-Path -Path (Resolve-Path '.') -ChildPath '.env'
if (-not (Test-Path $envPath)) {
    Write-Error ".env no encontrado en la raíz. Copia .env.example y personaliza las variables.";
    exit 1
}

$content = Get-Content $envPath | Where-Object {$_ -and -not ($_ -match '^#')}
$missing = @()
foreach ($k in $required) {
    if (-not ($content -match "^$k=")) { $missing += $k }
}

if ($missing.Count -gt 0) {
    Write-Error "Faltan variables en .env: $($missing -join ', ')"
    exit 1
} else {
    Write-Host ".env verificado: todas las variables requeridas están presentes." -ForegroundColor Green
    exit 0
}
