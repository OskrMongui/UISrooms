"""
Django settings for config project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_BUILD_DIR = BASE_DIR.parent / 'frontend' / 'build'

load_dotenv(BASE_DIR / '.env')

# Seguridad / debug
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in environment variables")
DEBUG = os.getenv('DJANGO_DEBUG', '0') == '1'

# Hosts permitidos (usa CSV en .env o lista en dev)
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Apps
INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Tus apps
    'usuarios',
    'espacios',
    'reservas',
    'llaves',
    'incidencias',
    'objetos',
    'notificaciones',

    # Extras
    'django.contrib.postgres',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

template_dirs = [BASE_DIR / 'templates']
if FRONTEND_BUILD_DIR.exists():
    template_dirs.append(FRONTEND_BUILD_DIR)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': template_dirs,
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database (Postgres - variables en .env)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'uisrooms_db'),
        'USER': os.getenv('POSTGRES_USER', 'uisrooms'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'uisrooms123'),
        'HOST': os.getenv('POSTGRES_HOST', 'db'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# Internationalization
LANGUAGE_CODE = os.getenv('DJANGO_LANGUAGE_CODE', 'es-co')
TIME_ZONE = os.getenv('DJANGO_TIME_ZONE', 'America/Bogota')
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # para collectstatic en producción
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Serve React build static files in production
STATICFILES_DIRS = []
frontend_static_dir = FRONTEND_BUILD_DIR / 'static'
if frontend_static_dir.exists():
    STATICFILES_DIRS.append(frontend_static_dir)

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'usuarios.Usuario'

# Opcional: configuración básica de DRF (cuando uses)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # opcional para admin/web
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}

# Logging básico (útil para debug)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),        # token corto para acceso
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),           # refresh para renovar access
    'ROTATE_REFRESH_TOKENS': True,                        # emite nuevo refresh al usar refresh
    'BLACKLIST_AFTER_ROTATION': True,                     # recomendamos activar con token_blacklist
    'AUTH_HEADER_TYPES': ('Bearer',),                     # Authorization: Bearer <token>
    'ALGORITHM': 'HS256',
    # 'SIGNING_KEY': SECRET_KEY,  # por defecto usa SECRET_KEY
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = True  # Para desarrollo, permite todos los orígenes

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "origin",
    "x-csrftoken",
    "x-requested-with",
]
