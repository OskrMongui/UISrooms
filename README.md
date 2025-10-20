# UISrooms

Monorepo que agrupa el backend (Django + PostgreSQL) y el frontend web (React) del proyecto UISrooms.

## Estructura

- `backend/`: proyecto Django (config, aplicaciones internas, scripts de utilidad, archivos `.env`, `requirements.txt`, etc.).
- `frontend/`: aplicacion React (codigo fuente en `src/`, build en `build/`, dependencias en `node_modules/`).
- `docker/`: recursos complementarios para contenedores (por ejemplo, inicializacion de Postgres).
- `.github/`, `.vscode/`: automatizaciones y configuracion de editor.
- `Dockerfile`, `docker-compose.yml`, `start-dev.ps1`: utilidades en la raiz para orquestar ambos lados.

## Requisitos previos

- Docker y Docker Compose.
- Node.js y npm (para ejecutar el frontend en modo desarrollo).
- PowerShell (Windows) o terminal compatible.

## Configuracion inicial

1. Clonar el proyecto.
2. Copiar las variables de entorno de ejemplo del backend:

   ```powershell
   Copy-Item .\backend\.env.example .\backend\.env
   ```

   > En Linux/macOS usa `cp backend/.env.example backend/.env`.

3. Editar `backend/.env` y anadir:
   - `SECRET_KEY` (usar `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` para generar una).
   - Ajustar credenciales de base de datos si no se usan los valores por defecto del `docker-compose`.
4. Instalar dependencias del frontend:

   ```powershell
   Push-Location frontend
   npm install
   Pop-Location
   ```

5. (Opcional) Crear y activar un entorno virtual para Python antes de instalar dependencias del backend:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   ```

   > En Linux/macOS usa `python3 -m venv .venv` y `source .venv/bin/activate`.

## Verificacion rapida

Si quieres validar que el proyecto compila correctamente antes de hacer un push o empaquetar:

```powershell
npm --prefix frontend run build
python backend\manage.py check
```

El build de React puede emitir advertencias sobre variables no utilizadas (`start` en `Home.js` y `jwtDecode` en `utils/auth.js`). Son avisos sin impacto funcional; puedes limpiarlos eliminando las variables o aplicando `// eslint-disable-next-line` donde corresponda.

## Desarrollo con recarga

Se recomienda trabajar con dos terminales.

- **Terminal A - Backend** (Docker + Django):

  ```powershell
  docker-compose up --build
  ```

- **Terminal B - Frontend** (React con hot reload):

  ```powershell
  Set-Location .\frontend
  npm install      # solo la primera vez o si cambia package.json
  npm start
  ```

Servicios disponibles:
- Frontend React en <http://localhost:3000>
- API Django en <http://localhost:8000>

### Atajo en Windows

Ejecutar `.\start-dev.ps1` desde la raiz abre dos ventanas de PowerShell (backend y frontend). Si PowerShell bloquea scripts, habilita:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Produccion local (servir build de React desde Django)

1. Construir el frontend:

   ```powershell
   Set-Location .\frontend
   npm install
   npm run build
   Set-Location ..
   ```

2. Levantar contenedores:

   ```powershell
   docker-compose up --build
   ```

3. Visitar <http://localhost:8000>. Django servira la SPA (`build/index.html`) y las APIs REST.

## Problemas comunes

- **database "uisrooms_db" does not exist**  
  Generalmente ocurre por un volumen de Postgres inicializado con otras credenciales. Opciones:
  1. Verificar que `backend/.env` exista y contenga `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
  2. Reinicializar el volumen: `docker-compose down -v && docker-compose up --build`.
  3. Usar el helper `.\backend\scripts\reset-db.ps1`.

- **Errores SECRET_KEY**  
  Asegurate de que `backend/.env` este cargado con una llave valida antes de iniciar Django.

- **Frontend sin build**  
  En modo desarrollo usa <http://localhost:3000>. Para servir desde Django, ejecuta `npm run build` dentro de `frontend/`.

## Siguientes pasos posibles

- Documentacion adicional (`docs/`).
- Endpoint `/healthz` para health checks.
- Ajustes de cache en WhiteNoise para produccion.

Indica si te interesa que anadamos alguno de estos ajustes.
