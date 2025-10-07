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

Levantar el backend con Docker
1. Copia variables de entorno:
```powershell
Copy-Item .env.example .env
```
2. Levanta contenedores:
```powershell
docker-compose up --build
```
3. Backend disponible en `http://localhost:8000`.

Levantar el frontend (desarrollo)
1. Ir a la carpeta del frontend e instalar dependencias:
```powershell
Set-Location .\uisrooms-web
npm install
```
2. Iniciar el servidor de desarrollo:
```powershell
npm start
```
3. Frontend en `http://localhost:3000`.

Notas
- Asegúrate de que `.env` contiene `SECRET_KEY` y las variables de Postgres necesarias.
- `uisrooms-web/.env` puede incluir `REACT_APP_API_URL=http://localhost:8000/api/`

Si necesitas que restaure la app móvil o archivos eliminados, puedo crear un zip/archivo con lo eliminado (si siguen disponibles localmente) o ayudarte a recuperar desde otra rama.
# UISrooms Backend

Este proyecto es una aplicación full-stack para la gestión de salas y reservas de la UIS, compuesto por:

- **Backend**: API REST en Django con PostgreSQL.
- **Frontend Web**: Aplicación React.
- **Aplicación Móvil**: App Android en Kotlin.

## Requisitos Previos

- Docker y Docker Compose
- Node.js (para el frontend web)
- Android Studio (para la app móvil, opcional)

## Configuración Inicial

1. Clona el repositorio:
   ```bash
   git clone <url-del-repo>
   cd uisrooms-backend
   ```

2. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```

3. Edita `.env` con tus valores:
   - Genera una `SECRET_KEY` segura para Django.
   - Ajusta las URLs de API si es necesario.

## Ejecutar el Backend

1. Construye y ejecuta los contenedores:
   ```bash
   docker-compose up --build
   ```

2. El backend estará disponible en `http://localhost:8000`.

3. Para crear un superusuario (opcional):
   ```bash
   docker-compose exec web python manage.py createsuperuser
   ```

## Ejecutar el Frontend Web

1. Instala dependencias:
   ```bash
   cd uisrooms-web
   npm install
   ```

2. Ejecuta la aplicación:
   ```bash
   npm start
   ```

3. Abre `http://localhost:3000` en tu navegador.

Nota: Asegúrate de que el backend esté corriendo en `http://localhost:8000`.

## Ejecutar la App Móvil

1. Abre el proyecto en Android Studio:
   - Importa la carpeta `UISroomsMobile`.

2. Configura la URL de la API en `ApiService.kt` si es necesario (por defecto usa `http://10.0.2.2:8000/` para emulador).

3. Ejecuta en un emulador o dispositivo.

## Despliegue en Producción

- Cambia `DEBUG=0` en `.env`.
- Configura `ALLOWED_HOSTS` con tu dominio.
- Usa un servidor como Gunicorn o similar.
- Para el frontend, construye con `npm run build` y sirve los archivos estáticos.
- Para la app móvil, genera el APK.

## Estructura del Proyecto

- `config/`: Configuración de Django.
- `usuarios/`, `espacios/`, etc.: Apps de Django.
- `uisrooms-web/`: Frontend React.
- `UISroomsMobile/`: App Android.
- `docker-compose.yml`: Configuración de contenedores.

## Contribución

1. Crea una rama para tus cambios.
2. Realiza commits descriptivos.
3. Envía un pull request.

## Licencia

[Especifica la licencia si aplica]
