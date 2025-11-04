from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0005_registro_apertura'),
    ]

    operations = [
        migrations.AddField(
            model_name='registroapertura',
            name='asistencia_estado',
            field=models.CharField(blank=True, choices=[('presente', 'Presente'), ('tarde', 'Llegada tarde'), ('ausente', 'Ausente')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='asistencia_registrada_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='ausencia_notificada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='hora_llegada_real',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

