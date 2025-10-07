# UISrooms (Backend + Web)

Este repositorio contiene la parte backend (Django + PostgreSQL) y el frontend web (React) del proyecto UISrooms.

Contenido relevante que se mantiene:
- `config/`, `usuarios/`, `espacios/`, `reservas/`, `llaves/`, `incidencias/`, `objetos/`, `notificaciones/` (Django apps)
- `manage.py`, `docker-compose.yml`, `requirements.txt`
- `uisrooms-web/` (React frontend)

Carpetas y artefactos no relacionados con la entrega actual han sido removidos para simplificar el repositorio.

Requisitos previos
- Docker y Docker Compose
- Node.js (para el frontend web)

# UISrooms (Backend + Web)

Este repo contiene el backend (Django + PostgreSQL) y el frontend web (React). Aquí tienes instrucciones paso a paso para que cualquiera que clone el repositorio pueda ejecutar el proyecto en modo desarrollo y en modo producción local.

-----

Requisitos previos
- Docker y Docker Compose
- Node.js y npm (para el frontend web)
- PowerShell (Windows) o una terminal compatible

-----

Preparación (una sola vez)
1. Clona el repositorio:

```bash
git clone <url-del-repo>
cd UISrooms
```

2. Copia variables de entorno de ejemplo:

Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```
Linux/macOS:
```bash
cp .env.example .env
```

3. Edita `.env` y añade una `SECRET_KEY` (y ajustar credenciales de la DB si no usas Docker defaults).

-----

Modo desarrollo (hot-reload) — recomendado para programar

Se recomienda abrir dos terminales.

Terminal A — Backend (Docker):
```powershell
# desde la raíz del repo
docker-compose up --build
```

Terminal B — Frontend (hot-reload):
```powershell
Set-Location .\uisrooms-web
npm install    # sólo la primera vez o si cambias package.json
npm start
```

- Frontend en: http://localhost:3000 (hot-reload)
- Backend (API) en: http://localhost:8000 (APIs en /api/)

Opcional: uso del helper (Windows PowerShell)
- Ejecutar `.\\start-dev.ps1` desde la raíz abrirá dos ventanas para backend y frontend automáticamente. Si PowerShell bloquea la ejecución de scripts, habilita:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

-----

Modo producción local (servir la SPA desde Django)

1. Genera la build del frontend:

```powershell
Set-Location .\uisrooms-web
npm install
npm run build
Set-Location ..
```

2. Levanta Docker (el contenedor web ejecutará migrate, collectstatic y gunicorn):

```powershell
docker-compose up --build
```

3. Abre: http://localhost:8000 — ahora Django sirve la SPA (`index.html`) y las APIs en `/api/`.

-----

Comprobaciones y solución de problemas
- Si el dev-server no arranca en 3000: verifica puertos ocupados

```powershell
netstat -ano | findstr :3000
```

- Si ves 404 en `/` antes de generar la build del frontend, es normal en modo backend-only (usa http://localhost:3000 en desarrollo). Después de `npm run build` y `docker-compose up`, Django servirá la SPA en `/`.
- Si Django lanza error por `SECRET_KEY`, asegúrate de tener `.env` con `SECRET_KEY`.

-----

Archivos útiles en el repo
- `start-dev.ps1`: helper PowerShell para abrir backend y frontend en desarrollo.
- `uisrooms-web/.env.example`: ejemplo de variable `REACT_APP_API_URL`.

-----

Si quieres, puedo:
- Añadir `docs/DEV.md` con esta guía paso a paso (y lo commit/pusheo).
- Añadir endpoint `/healthz` en Django para health checks.
- Ajustar headers/caching en WhiteNoise para producción.

Dime si quieres que añada `docs/DEV.md` y lo suba al repo.
