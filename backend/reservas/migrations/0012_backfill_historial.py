from django.db import migrations


def backfill_historial(apps, schema_editor):
    Reserva = apps.get_model('reservas', 'Reserva')
    ReservaHistorial = apps.get_model('reservas', 'ReservaEstadoHistorial')

    for reserva in Reserva.objects.all():
        if ReservaHistorial.objects.filter(reserva=reserva).exists():
            continue
        ReservaHistorial.objects.create(
            reserva=reserva,
            estado_anterior=None,
            estado_nuevo=reserva.estado,
            cambiado_por=reserva.creado_por,
            comentario='Solicitud creada (backfill)',
        )


def reverse_backfill(apps, schema_editor):
    ReservaHistorial = apps.get_model('reservas', 'ReservaEstadoHistorial')
    ReservaHistorial.objects.filter(comentario='Solicitud creada (backfill)').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0011_remove_reserva_reservas_no_solapamiento'),
    ]

    operations = [
        migrations.RunPython(backfill_historial, reverse_backfill),
    ]
