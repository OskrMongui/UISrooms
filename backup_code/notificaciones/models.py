# notificaciones/models.py
import uuid
from django.db import models
from django.db.models import JSONField

class TipoNotificacion(models.TextChoices):
    AGENDA = 'agenda', 'Agenda'
    RESERVA = 'reserva', 'Reserva'
    SISTEMA = 'sistema', 'Sistema'
    INCIDENCIA = 'incidencia', 'Incidencia'

class Notificacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo = models.CharField(max_length=30, choices=TipoNotificacion.choices, default=TipoNotificacion.SISTEMA)
    destinatario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='notificaciones')
    remitente = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    mensaje = models.TextField()
    metadata = JSONField(default=dict, blank=True)
    enviado = models.BooleanField(default=False)
    leido = models.BooleanField(default=False)
    enviado_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "notificacion"
        verbose_name_plural = "notificaciones"
        indexes = [
            models.Index(fields=['destinatario']),
        ]
