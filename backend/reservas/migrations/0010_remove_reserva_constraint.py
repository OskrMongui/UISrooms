from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0009_mark_horario_reservas'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE reservas_reserva DROP CONSTRAINT IF EXISTS reservas_no_solapamiento;",
            reverse_sql="",
        ),
    ]
