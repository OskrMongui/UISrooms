"""
create_default_spaces.py
Seed script to ensure the project always starts with a baseline set of
spaces and their default availability, without reservations or blocks.
Run inside the Django container (or with the project's virtualenv activated):
    python scripts/create_default_spaces.py
"""

import os
import sys
from datetime import time
from pathlib import Path
from typing import Iterable, Tuple

import django
from django.apps import apps as django_apps
from django.db import transaction


BASE_DIR = Path(__file__).resolve().parent.parent
BASE_DIR_STR = str(BASE_DIR)
if BASE_DIR_STR not in sys.path:
    sys.path.insert(0, BASE_DIR_STR)

DEFAULT_SPACES = [
    {
        "codigo": "309",
        "nombre": "309 - Aula",
        "descripcion": "Aula estandar con capacidad para clases regulares.",
        "tipo": "aula",
        "capacidad": 25,
        "ubicacion": "tercer_piso",
        "recursos": ["Video beam", "Tablero acrilico"],
    },
    {
        "codigo": "104",
        "nombre": "Sala de conferencias",
        "descripcion": "Sala equipada para conferencias y reuniones.",
        "tipo": "sala",
        "capacidad": 50,
        "ubicacion": "segundo_piso",
        "recursos": ["Pantalla", "Sonido envolvente"],
    },
    {
        "codigo": "254",
        "nombre": "Laboratorio de Redes y Telematica",
        "descripcion": "Laboratorio especializado para practicas de redes.",
        "tipo": "laboratorio",
        "capacidad": 25,
        "ubicacion": "tercer_piso",
        "recursos": ["Switches administrables", "Routers Cisco"],
    },
]


def _ensure_django_setup() -> None:
    if django_apps.ready:
        return

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()


def _get_models():
    from espacios.models import (  # noqa: WPS433
        DisponibilidadEspacio,
        Espacio,
        TipoEspacio,
        UbicacionEspacio,
    )

    return DisponibilidadEspacio, Espacio, TipoEspacio, UbicacionEspacio


def _default_availability() -> Iterable[dict]:
    """Return availability Monday-Sunday 06:00-20:00 without blocks."""
    for day in range(7):
        yield {
            "dia_semana": day,
            "hora_inicio": time(6, 0),
            "hora_fin": time(20, 0),
            "recurrente": True,
            "es_bloqueo": False,
        }


def _normalize_space_definition(space_data, tipo_model, ubicacion_model):
    normalized = space_data.copy()
    normalized["tipo"] = tipo_model(normalized["tipo"]).value
    normalized["ubicacion"] = ubicacion_model(normalized["ubicacion"]).value
    return normalized


def ensure_spaces() -> Tuple[list, list]:
    _ensure_django_setup()
    (
        DisponibilidadEspacio,
        Espacio,
        TipoEspacio,
        UbicacionEspacio,
    ) = _get_models()

    created: list = []
    updated: list = []

    with transaction.atomic():
        for definition in DEFAULT_SPACES:
            space_data = _normalize_space_definition(
                definition,
                TipoEspacio,
                UbicacionEspacio,
            )
            availability = space_data.pop("availability", None)
            codigo = space_data.pop("codigo")
            if availability is None:
                availability = list(_default_availability())

            space, was_created = Espacio.objects.update_or_create(
                codigo=codigo,
                defaults=space_data,
            )

            if was_created:
                created.append(codigo)
            else:
                updated.append(codigo)

            # Replace existing availability with the baseline set
            DisponibilidadEspacio.objects.filter(espacio=space).delete()
            DisponibilidadEspacio.objects.bulk_create(
                [
                    DisponibilidadEspacio(
                        espacio=space,
                        dia_semana=item["dia_semana"],
                        hora_inicio=item["hora_inicio"],
                        hora_fin=item["hora_fin"],
                        recurrente=item.get("recurrente", True),
                        es_bloqueo=item.get("es_bloqueo", False),
                        observaciones=item.get("observaciones", ""),
                    )
                    for item in availability
                ]
            )

    return created, updated


def main() -> None:
    created, updated = ensure_spaces()
    print("Espacios base sembrados correctamente.")
    if created:
        print(f"  - Creados: {', '.join(created)}")
    if updated:
        print(f"  - Actualizados: {', '.join(updated)}")


if __name__ == "__main__":
    main()
