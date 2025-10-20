from datetime import time

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import DisponibilidadEspacio, Espacio


DEFAULT_START = time(6, 0)
DEFAULT_END = time(20, 0)


@receiver(post_save, sender=Espacio)
def crear_disponibilidad_base(sender, instance, created, **kwargs):
    if not created:
        return

    # Evitar duplicados si se crea manualmente desde un seed/test
    if DisponibilidadEspacio.objects.filter(espacio=instance, es_bloqueo=False).exists():
        return

    disponibilidades = [
        DisponibilidadEspacio(
            espacio=instance,
            dia_semana=dia,
            hora_inicio=DEFAULT_START,
            hora_fin=DEFAULT_END,
            recurrente=True,
            es_bloqueo=False,
            observaciones='Horario base (6:00 - 20:00)',
        )
        for dia in range(7)
    ]

    DisponibilidadEspacio.objects.bulk_create(disponibilidades)
