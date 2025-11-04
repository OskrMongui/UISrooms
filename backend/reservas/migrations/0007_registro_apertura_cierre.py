from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
        ('reservas', '0006_registro_apertura_asistencia'),
    ]

    operations = [
        migrations.AddField(
            model_name='registroapertura',
            name='cierre_motivo',
            field=models.CharField(blank=True, choices=[('fin_clase', 'Fin de clase o reserva'), ('ausencia', 'Ausencia del profesor'), ('instruccion', 'Instruccion administrativa')], max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='cierre_observaciones',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='cierre_registrado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='cierre_registrado_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registroapertura',
            name='cierre_registrado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='cierres_registrados', to='usuarios.usuario'),
        ),
    ]

