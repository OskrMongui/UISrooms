# llaves/models.py
import uuid
from django.db import models


class EstadoLlave(models.TextChoices):
    DISPONIBLE = 'disponible', 'Disponible'
    PRESTADA = 'prestada', 'Prestada'
    PERDIDA = 'perdida', 'Perdida'
    MANTENIMIENTO = 'mantenimiento', 'Mantenimiento'


class Llave(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=100, unique=True, null=True, blank=True)
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.CASCADE, related_name='llaves')
    responsable = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=EstadoLlave.choices, default=EstadoLlave.DISPONIBLE)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.codigo or str(self.id)

    class Meta:
        verbose_name = "llave"
        verbose_name_plural = "llaves"

