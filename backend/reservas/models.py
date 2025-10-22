# reservas/models.py
import uuid
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.contrib.postgres.fields import DateTimeRangeField
from django.contrib.postgres.indexes import GistIndex
from django.contrib.postgres.constraints import ExclusionConstraint

class EstadoReserva(models.TextChoices):
    PENDIENTE = 'pendiente', 'Pendiente'
    APROBADO = 'aprobado', 'Aprobada'
    RECHAZADO = 'rechazado', 'Rechazada'

class ReservaManager(models.Manager):
    def solapa(self, espacio, inicio, fin, estados=None):
        estados = estados or [EstadoReserva.APROBADO]
        periodo = (inicio, fin)
        return self.get_queryset().filter(
            espacio=espacio,
            estado__in=estados
        ).filter(periodo__overlap=periodo)

    def disponible(self, espacio, inicio, fin):
        return not self.solapa(espacio, inicio, fin).exists()


class Reserva(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, related_name='reservas')
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.CASCADE, related_name='reservas')
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    periodo = DateTimeRangeField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=EstadoReserva.choices, default=EstadoReserva.PENDIENTE)
    motivo = models.TextField(blank=True, null=True)
    cantidad_asistentes = models.IntegerField(null=True, blank=True)
    requiere_llaves = models.BooleanField(default=False)
    recurrente = models.BooleanField(default=False)
    semestre_inicio = models.DateField(null=True, blank=True)
    semestre_fin = models.DateField(null=True, blank=True)
    rrule = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservas_creadas')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    objects = ReservaManager()

    def save(self, *args, **kwargs):
        if self.fecha_inicio and self.fecha_fin:
            self.periodo = (self.fecha_inicio, self.fecha_fin)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reserva {self.id} - {self.espacio} ({self.fecha_inicio} -> {self.fecha_fin})"

    class Meta:
        verbose_name = "reserva"
        verbose_name_plural = "reservas"
        indexes = [
            models.Index(fields=['espacio', 'fecha_inicio', 'fecha_fin']),
            models.Index(fields=['estado']),
            GistIndex(fields=['periodo']),
        ]
        constraints = [
            ExclusionConstraint(
                name='reservas_no_solapamiento',
                expressions=[
                    (F('espacio'), '='),
                    (F('periodo'), '&&'),
                ],
                condition=Q(estado=EstadoReserva.APROBADO)
            )
        ]


class ReservaEstadoHistorial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='historial_estados')
    estado_anterior = models.CharField(max_length=20, choices=EstadoReserva.choices, null=True, blank=True)
    estado_nuevo = models.CharField(max_length=20, choices=EstadoReserva.choices)
    cambiado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    comentario = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "reserva_estado_historial"
        verbose_name_plural = "reservas_estado_historial"



