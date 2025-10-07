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

Error común: "database \"uisrooms_db\" does not exist"
-----------------------------------------------------

Si un colaborador clona el repositorio y sigue las instrucciones, puede encontrarse con un error como:

django.db.utils.OperationalError: FATAL:  database "uisrooms_db" does not exist

Causas comunes:
- El servicio Postgres ya tenía un volumen persistente creado previamente con otras credenciales/nombre de base de datos.
- El archivo `.env` no existe o sus variables `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` no coinciden con la inicialización del volumen de Postgres.

Soluciones (elige una):

1) Asegurarse de que `.env` exista y tenga las variables correctas

- Desde la raíz del repo copia el ejemplo y edítalo:

	PowerShell:

	Copy-Item .env.example .env
	# luego editar .env en tu editor preferido y añadir SECRET_KEY, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

2) Volver a inicializar el servicio Postgres (elimina el volumen persistente)

Nota: esto borra los datos existentes en la base de datos del contenedor. Úsalo sólo si no necesitas conservar datos.


PowerShell (desde la raíz del repo):

	docker-compose down -v
	docker-compose up --build

O (recomendado en Windows) usa el helper con confirmación incluido:

	.\scripts\reset-db.ps1

Esto fuerza a Docker a recrear el volumen `postgres_data` y Postgres se inicializará con las variables que hayas puesto en `.env`.

3) (Alternativa) Crear la base de datos manualmente en el contenedor Postgres existente

Si no quieres borrar el volumen, puedes entrar en el contenedor y crear la base de datos con psql (reemplaza USER y DB por los valores que uses en `.env`):

PowerShell:

	docker-compose exec db psql -U <POSTGRES_USER> -c "CREATE DATABASE <POSTGRES_DB>;"

Ejemplo:

	docker-compose exec db psql -U uisrooms -c "CREATE DATABASE uisrooms_db;"

Después de crear la DB manualmente, vuelve a iniciar o recargar el servicio web:

	docker-compose up --build

-----

Si quieres, puedo:
- Añadir `docs/DEV.md` con esta guía paso a paso (y lo commit/pusheo).
- Añadir endpoint `/healthz` en Django para health checks.
- Ajustar headers/caching en WhiteNoise para producción.

Dime si quieres que añada `docs/DEV.md` y lo suba al repo.
