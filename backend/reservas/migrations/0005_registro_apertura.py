import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
        ('espacios', '0001_initial'),
        ('reservas', '0004_remove_reserva_reservas_no_solapamiento_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroApertura',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('fecha_programada', models.DateTimeField()),
                ('registrado_en', models.DateTimeField(auto_now_add=True)),
                ('completado', models.BooleanField(default=False)),
                ('completado_en', models.DateTimeField(blank=True, null=True)),
                ('observaciones', models.TextField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('espacio', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='registros_apertura', to='espacios.espacio')),
                ('registrado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='aperturas_registradas', to='usuarios.usuario')),
                ('reserva', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='registros_apertura', to='reservas.reserva')),
            ],
            options={
                'verbose_name': 'registro_apertura',
                'verbose_name_plural': 'registros_apertura',
                'ordering': ['fecha_programada'],
            },
        ),
        migrations.AddConstraint(
            model_name='registroapertura',
            constraint=models.UniqueConstraint(fields=('reserva', 'fecha_programada'), name='unico_registro_apertura_reserva_fecha'),
        ),
    ]

