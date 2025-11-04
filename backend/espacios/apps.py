import logging

from django.apps import AppConfig
from django.db.models.signals import post_migrate


logger = logging.getLogger(__name__)


class EspaciosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'espacios'

    def ready(self):
        # Importar señales para crear la disponibilidad base al crear nuevos espacios
        from . import signals  # noqa: F401

        post_migrate.connect(self._seed_default_spaces, sender=self)

    def _seed_default_spaces(self, **kwargs):
        try:
            from create_default_spaces import ensure_spaces

            created, updated = ensure_spaces()
            if created or updated:
                logger.info(
                    "Semilla de espacios ejecutada. Creados: %s. Actualizados: %s.",
                    created,
                    updated,
                )
        except Exception:
            logger.exception("No fue posible sembrar los espacios por defecto.")
