# reservas/models.py
import uuid
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.db.models import JSONField
from django.contrib.postgres.fields import DateTimeRangeField
from django.contrib.postgres.indexes import GistIndex
from django.contrib.postgres.constraints import ExclusionConstraint

class EstadoReserva(models.TextChoices):
    PENDIENTE = 'pendiente', 'Pendiente'
    APROBADO = 'aprobado', 'Aprobado'
    RECHAZADO = 'rechazado', 'Rechazado'
    CANCELADO = 'cancelado', 'Cancelado'
    REAGENDADO = 'reagendado', 'Reagendado'

class ReservaManager(models.Manager):
    def solapa(self, espacio, inicio, fin):
        periodo = (inicio, fin)
        return self.get_queryset().filter(
            espacio=espacio,
            estado__in=[EstadoReserva.PENDIENTE, EstadoReserva.APROBADO, EstadoReserva.REAGENDADO]
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
    rrule = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservas_creadas')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    metadata = JSONField(default=dict, blank=True)

    objects = ReservaManager()

    def save(self, *args, **kwargs):
        if self.fecha_inicio and self.fecha_fin:
            self.periodo = (self.fecha_inicio, self.fecha_fin)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reserva {self.id} - {self.espacio} ({self.fecha_inicio} → {self.fecha_fin})"

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
                condition=~Q(estado__in=[EstadoReserva.RECHAZADO, EstadoReserva.CANCELADO])
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


class Asignacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='asignaciones')
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.CASCADE)
    asignado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    asignado_en = models.DateTimeField(auto_now_add=True)
    manual = models.BooleanField(default=False)
    nota = models.TextField(blank=True, null=True)
    metadata = JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "asignacion"
        verbose_name_plural = "asignaciones"


# Clases y asistencia
class Clase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=100, blank=True, null=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    docente = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='clases')
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.SET_NULL, null=True, blank=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    recurrente = models.BooleanField(default=False)
    rrule = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "clase"
        verbose_name_plural = "clases"


class ClaseCancelacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clase = models.ForeignKey(Clase, on_delete=models.CASCADE)
    reservado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    fecha_cancelacion = models.DateTimeField(default=timezone.now)
    motivo = models.TextField(blank=True, null=True)
    registrado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        verbose_name = "clase_cancelacion"
        verbose_name_plural = "clases_cancelacion"


class Asistencia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE)
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True)
    clase = models.ForeignKey(Clase, on_delete=models.SET_NULL, null=True, blank=True)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    anomalia = models.BooleanField(default=False)
    observaciones = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "asistencia"
        verbose_name_plural = "asistencias"


class Incumplimiento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.SET_NULL, null=True, blank=True)
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True)
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(default=timezone.now)
    sancion = JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "incumplimiento"
        verbose_name_plural = "incumplimientos"
