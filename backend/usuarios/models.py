# usuarios/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class Rol(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    permisos = models.JSONField(default=dict, blank=True)  # mapa de permisos, adaptar según necesidad
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "rol"
        verbose_name_plural = "roles"


class Usuario(AbstractUser):
    # Custom fields
    telefono = models.CharField(max_length=30, blank=True)
    departamento = models.CharField(max_length=100, blank=True)
    cargo = models.CharField(max_length=100, blank=True)
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')
    externo_provider = models.CharField(max_length=100, blank=True, null=True)
    externo_id = models.CharField(max_length=255, blank=True, null=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}" if self.last_name else self.first_name

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
