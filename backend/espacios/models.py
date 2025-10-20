# espacios/models.py
import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField

class TipoEspacio(models.TextChoices):
    AULA = 'aula', 'Aulas'
    LABORATORIO = 'laboratorio', 'Laboratorios'
    SALA = 'sala', 'Salas'

class UbicacionEspacio(models.TextChoices):
    PRIMER_PISO = 'primer_piso', 'Primer piso'
    SEGUNDO_PISO = 'segundo_piso', 'Segundo piso'
    TERCER_PISO = 'tercer_piso', 'Tercer piso'


class Espacio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=TipoEspacio.choices, default=TipoEspacio.AULA)
    capacidad = models.IntegerField(null=True, blank=True)
    ubicacion = models.CharField(
        max_length=20,
        choices=UbicacionEspacio.choices,
        default=UbicacionEspacio.PRIMER_PISO,
    )
    recursos = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        verbose_name = "espacio"
        verbose_name_plural = "espacios"
        indexes = [
            models.Index(fields=['codigo']),
        ]


class DisponibilidadEspacio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name='disponibilidades')
    dia_semana = models.SmallIntegerField(null=True, blank=True, help_text='0=Lunes ... 6=Domingo; null si excepción por fecha')
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    recurrente = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)
    es_bloqueo = models.BooleanField(default=False, help_text='True indica un horario bloqueado/no disponible')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "disponibilidad_espacio"
        verbose_name_plural = "disponibilidades_espacio"
        indexes = [
            models.Index(fields=['espacio']),
        ]


