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
from typing import Iterable, Optional, Tuple

import django
from django.apps import apps as django_apps
from django.db import transaction


BASE_DIR = Path(__file__).resolve().parent.parent
BASE_DIR_STR = str(BASE_DIR)
if BASE_DIR_STR not in sys.path:
    sys.path.insert(0, BASE_DIR_STR)

CLASS_EVENT_PREFIX = "[CLASE]"


DEFAULT_SPACES = [
    {
        "codigo": "309",
        "nombre": "309 - Aula",
        "descripcion": "Aula estandar con capacidad para clases regulares.",
        "tipo": "aula",
        "capacidad": 25,
        "ubicacion": "tercer_piso",
        "recursos": ["Video beam", "Tablero acrilico"],
        "class_schedule": [
            {"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "22979", "grupo": "PB4"},
            {"dia_semana": 2, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "27136", "grupo": "B2A"},
            {"dia_semana": 3, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "22979", "grupo": "PB4"},
            {"dia_semana": 4, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "27136", "grupo": "B2A"},
            {"dia_semana": 2, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "20253", "grupo": "C1"},
            {"dia_semana": 3, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "28546", "grupo": "PC1"},
            {"dia_semana": 0, "hora_inicio": "14:00", "hora_fin": "16:00", "codigo": "20253", "grupo": "E7"},
            {"dia_semana": 2, "hora_inicio": "14:00", "hora_fin": "16:00", "codigo": "22979", "grupo": "PC7"},
            {"dia_semana": 0, "hora_inicio": "16:00", "hora_fin": "18:00", "codigo": "40514", "grupo": "F1"},
            {"dia_semana": 4, "hora_inicio": "16:00", "hora_fin": "18:00", "codigo": "22979", "grupo": "PF6"},
        ],
    },
    {
        "codigo": "104",
        "nombre": "Sala de conferencias",
        "descripcion": "Sala equipada para conferencias y reuniones.",
        "tipo": "sala",
        "capacidad": 50,
        "ubicacion": "segundo_piso",
        "recursos": ["Pantalla", "Sonido envolvente"],
        "class_schedule": [
            {"dia_semana": 1, "hora_inicio": "07:00", "hora_fin": "09:00", "codigo": "41330", "grupo": "PC1"},
            {"dia_semana": 1, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "41609", "grupo": "PC1"},
            {"dia_semana": 1, "hora_inicio": "14:00", "hora_fin": "16:00", "codigo": "22962", "grupo": "E1"},
            {"dia_semana": 2, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "22962", "grupo": "C1"},
            {"dia_semana": 3, "hora_inicio": "09:00", "hora_fin": "11:00", "codigo": "41022", "grupo": "B1"},
            {"dia_semana": 4, "hora_inicio": "10:00", "hora_fin": "13:00", "codigo": "41330", "grupo": "PC1"},
            {"dia_semana": 5, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "27586", "grupo": "C1"},
        ],
    },
    {
        "codigo": "254",
        "nombre": "Laboratorio de Redes y Telematica",
        "descripcion": "Laboratorio especializado para practicas de redes.",
        "tipo": "laboratorio",
        "capacidad": 25,
        "ubicacion": "tercer_piso",
        "recursos": ["Switches administrables", "Routers Cisco"],
        "class_schedule": [
            # Lunes
            {"dia_semana": 0, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "22948", "grupo": "PB1"},
            {"dia_semana": 0, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "28091", "grupo": "C1"},
            # Martes
            {"dia_semana": 1, "hora_inicio": "06:00", "hora_fin": "08:00", "codigo": "28091", "grupo": "A1"},
            {"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "22948", "grupo": "PC2"},
            {"dia_semana": 1, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "22971", "grupo": "E1"},
            {"dia_semana": 1, "hora_inicio": "14:00", "hora_fin": "16:00", "codigo": "28997", "grupo": "E1"},
            {"dia_semana": 1, "hora_inicio": "18:00", "hora_fin": "20:00", "codigo": "22490", "grupo": "G1"},
            # Miércoles
            {"dia_semana": 2, "hora_inicio": "06:00", "hora_fin": "08:00", "codigo": "28091", "grupo": "A1"},
            {"dia_semana": 2, "hora_inicio": "08:00", "hora_fin": "11:00", "codigo": "22948", "grupo": "PB1"},
            {"dia_semana": 2, "hora_inicio": "14:00", "hora_fin": "17:00", "codigo": "28997", "grupo": "E1"},
            {"dia_semana": 2, "hora_inicio": "18:00", "hora_fin": "20:00", "codigo": "22490", "grupo": "G2"},
            # Jueves
            {"dia_semana": 3, "hora_inicio": "06:00", "hora_fin": "08:00", "codigo": "22967", "grupo": "A1"},
            {"dia_semana": 3, "hora_inicio": "08:00", "hora_fin": "11:00", "codigo": "22948", "grupo": "PC2"},
            {"dia_semana": 3, "hora_inicio": "11:00", "hora_fin": "12:00", "codigo": "41609", "grupo": "PC1"},
            {"dia_semana": 3, "hora_inicio": "14:00", "hora_fin": "16:00", "codigo": "21857", "grupo": "E2"},
            {"dia_semana": 3, "hora_inicio": "18:00", "hora_fin": "20:00", "codigo": "22490", "grupo": "G1"},
            # Viernes
            {"dia_semana": 4, "hora_inicio": "08:00", "hora_fin": "10:00", "codigo": "22961", "grupo": "B1"},
            {"dia_semana": 4, "hora_inicio": "10:00", "hora_fin": "12:00", "codigo": "22961", "grupo": "C1"},
            {"dia_semana": 4, "hora_inicio": "18:00", "hora_fin": "20:00", "codigo": "22490", "grupo": "G2"},
        ],
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


def _parse_time_value(value) -> time:
    """Normalize supported time formats into a time object."""
    if isinstance(value, time):
        return value
    if isinstance(value, (tuple, list)):
        hours = int(value[0])
        minutes = int(value[1]) if len(value) > 1 else 0
        return time(hours, minutes)
    if isinstance(value, (int, float)):
        return time(int(value), 0)
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Empty time value provided")
        if ":" not in normalized:
            normalized = f"{normalized}:00"
        return time.fromisoformat(normalized)
    raise ValueError(f"Unsupported time value: {value!r}")


def _build_class_observation(code: str, group: Optional[str]) -> str:
    parts = []
    if code:
        parts.append(str(code).strip())
    if group:
        parts.append(f"Grupo {str(group).strip()}")
    label = " | ".join(parts).strip()
    return f"{CLASS_EVENT_PREFIX} {label}".strip()


def _sync_class_schedule(espacio, schedule, DisponibilidadEspacio):
    if not schedule:
        return

    DisponibilidadEspacio.objects.filter(
        espacio=espacio,
        es_bloqueo=True,
        observaciones__istartswith=CLASS_EVENT_PREFIX,
    ).delete()

    entries = []
    for slot in schedule:
        hora_inicio = _parse_time_value(slot["hora_inicio"])
        hora_fin = _parse_time_value(slot["hora_fin"])
        entries.append(
            DisponibilidadEspacio(
                espacio=espacio,
                dia_semana=int(slot["dia_semana"]),
                hora_inicio=hora_inicio,
                hora_fin=hora_fin,
                recurrente=slot.get("recurrente", True),
                observaciones=_build_class_observation(
                    slot.get("codigo", ""),
                    slot.get("grupo"),
                ),
                es_bloqueo=True,
                fecha_inicio=slot.get("fecha_inicio"),
                fecha_fin=slot.get("fecha_fin"),
            )
        )

    DisponibilidadEspacio.objects.bulk_create(entries)


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
            class_schedule = space_data.pop("class_schedule", None)
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
            DisponibilidadEspacio.objects.filter(
                espacio=space,
                es_bloqueo=False,
            ).delete()
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

            _sync_class_schedule(space, class_schedule, DisponibilidadEspacio)

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
