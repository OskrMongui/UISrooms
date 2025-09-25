"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from rest_framework import routers
from usuarios.views import UsuarioViewSet, RolViewSet
from espacios.views import EspacioViewSet, DisponibilidadEspacioViewSet, EspacioBitacoraViewSet
from reservas.views import ReservaViewSet, ReservaEstadoHistorialViewSet
from llaves.views import LlaveViewSet, LlaveRegistroViewSet
from incidencias.views import IncidenciaViewSet, IncidenciaRespuestaViewSet
from objetos.views import ObjetoPerdidoViewSet
from notificaciones.views import NotificacionViewSet
from django.urls import path, include
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenRefreshView,)

router = routers.DefaultRouter()
# Usuarios
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
# Espacios
router.register(r'espacios', EspacioViewSet, basename='espacio')
router.register(r'espacios-disponibilidad', DisponibilidadEspacioViewSet, basename='disponibilidadespacio')
router.register(r'espacios-bitacora', EspacioBitacoraViewSet, basename='espaciobitacora')
# Reservas
router.register(r'reservas', ReservaViewSet, basename='reserva')
router.register(r'reservas-historial', ReservaEstadoHistorialViewSet, basename='reservahistorial')
# Llaves
router.register(r'llaves', LlaveViewSet, basename='llave')
router.register(r'llaves-registro', LlaveRegistroViewSet, basename='llaveregistro')
# Incidencias
router.register(r'incidencias', IncidenciaViewSet, basename='incidencia')
router.register(r'incidencias-respuestas', IncidenciaRespuestaViewSet, basename='incidenciarespuesta')
# Objetos
router.register(r'objetos-perdidos', ObjetoPerdidoViewSet, basename='objetoperdido')
# Notificaciones
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # Rutas de JWT:
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
