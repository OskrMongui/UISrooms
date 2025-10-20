from django.apps import AppConfig


class EspaciosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'espacios'

    def ready(self):
        # Importar senales para crear la disponibilidad base al crear nuevos espacios
        from . import signals  # noqa: F401
