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

import django
from django.db import transaction


BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from espacios.models import DisponibilidadEspacio, Espacio, TipoEspacio, UbicacionEspacio  # noqa: E402


DEFAULT_SPACES = [
    {
        "codigo": "309",
        "nombre": "309 - Aula",
        "descripcion": "Aula estándar con capacidad para clases regulares.",
        "tipo": TipoEspacio.AULA,
        "capacidad": 25,
        "ubicacion": UbicacionEspacio.TERCER_PISO,
        "recursos": ["Video beam", "Tablero acrílico"],
    },
    {
        "codigo": "104",
        "nombre": "Sala de conferencias",
        "descripcion": "Sala equipada para conferencias y reuniones.",
        "tipo": TipoEspacio.SALA,
        "capacidad": 50,
        "ubicacion": UbicacionEspacio.SEGUNDO_PISO,
        "recursos": ["Pantalla", "Sonido envolvente"],
    },
    {
        "codigo": "254",
        "nombre": "Laboratorio de Redes y Telemática",
        "descripcion": "Laboratorio especializado para prácticas de redes.",
        "tipo": TipoEspacio.LABORATORIO,
        "capacidad": 25,
        "ubicacion": UbicacionEspacio.TERCER_PISO,
        "recursos": ["Switches administrables", "Routers Cisco"],
    },
]


def _default_availability():
    """Return availability Monday-Sunday 06:00-20:00 without blocks."""
    hours = []
    for day in range(7):
        hours.append(
            {
                "dia_semana": day,
                "hora_inicio": time(6, 0),
                "hora_fin": time(20, 0),
                "recurrente": True,
                "es_bloqueo": False,
            }
        )
    return hours


def ensure_spaces():
    created = []
    updated = []

    with transaction.atomic():
        for definition in DEFAULT_SPACES:
            space_data = definition.copy()
            availability = space_data.pop("availability", None)
            codigo = space_data.pop("codigo")
            if availability is None:
                availability = _default_availability()

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


def main():
    created, updated = ensure_spaces()
    print("Espacios base sembrados correctamente.")
    if created:
        print(f"  - Creados: {', '.join(created)}")
    if updated:
        print(f"  - Actualizados: {', '.join(updated)}")


if __name__ == "__main__":
    main()
