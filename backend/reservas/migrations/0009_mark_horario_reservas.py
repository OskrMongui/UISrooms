from django.db import migrations


def mark_horario_reservas(apps, schema_editor):
    Reserva = apps.get_model('reservas', 'Reserva')
    queryset = Reserva.objects.filter(metadata__horario_id__isnull=False)
    for reserva in queryset.iterator():
        metadata = reserva.metadata or {}
        if metadata.get('es_horario'):
            continue
        metadata['es_horario'] = True
        Reserva.objects.filter(pk=reserva.pk).update(metadata=metadata)


def unmark_horario_reservas(apps, schema_editor):
    Reserva = apps.get_model('reservas', 'Reserva')
    queryset = Reserva.objects.filter(metadata__es_horario=True)
    for reserva in queryset.iterator():
        metadata = reserva.metadata or {}
        if 'es_horario' in metadata:
            metadata.pop('es_horario', None)
            Reserva.objects.filter(pk=reserva.pk).update(metadata=metadata)


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0008_alter_reserva_reservas_no_solapamiento'),
    ]

    operations = [
        migrations.RunPython(mark_horario_reservas, unmark_horario_reservas),
    ]
