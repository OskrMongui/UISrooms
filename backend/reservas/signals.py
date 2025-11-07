from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Reserva, ReservaEstadoHistorial


@receiver(post_save, sender=Reserva)
def crear_historial_inicial(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.historial_estados.exists():
        return

    ReservaEstadoHistorial.objects.create(
        reserva=instance,
        estado_anterior=None,
        estado_nuevo=instance.estado,
        cambiado_por=getattr(instance, "creado_por", None),
        comentario="Solicitud creada",
    )
