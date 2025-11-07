from django.db import migrations, models
import django.contrib.postgres.constraints

class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0007_registro_apertura_cierre'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='reserva',
            name='reservas_no_solapamiento',
        ),
        migrations.AddConstraint(
            model_name='reserva',
            constraint=django.contrib.postgres.constraints.ExclusionConstraint(
                name='reservas_no_solapamiento',
                expressions=[
                    (models.F('espacio'), '='),
                    (models.F('periodo'), '&&'),
                ],
                condition=(models.Q(('estado', 'aprobado')) & ~models.Q(('metadata__es_horario', True))),
            ),
        ),
    ]
