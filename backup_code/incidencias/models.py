# incidencias/models.py
import uuid
from django.db import models
from django.utils import timezone
from django.db.models import JSONField

class EstadoIncidencia(models.TextChoices):
    ABIERTA = 'abierta', 'Abierta'
    EN_PROCESO = 'en_proceso', 'En proceso'
    CERRADA = 'cerrada', 'Cerrada'

class Incidencia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reportante = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=EstadoIncidencia.choices, default=EstadoIncidencia.ABIERTA)
    fecha_reportada = models.DateTimeField(default=timezone.now)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    cerrado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    metadata = JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "incidencia"
        verbose_name_plural = "incidencias"


class IncidenciaRespuesta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incidencia = models.ForeignKey(Incidencia, on_delete=models.CASCADE, related_name='respuestas')
    autor = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    mensaje = models.TextField()
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "incidencia_respuesta"
        verbose_name_plural = "incidencias_respuestas"
