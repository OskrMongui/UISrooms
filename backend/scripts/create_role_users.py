"""
create_role_users.py

Utility script to seed one demo user for each default role.
Run inside the Django container (or with the project's virtualenv activated):

    python scripts/create_role_users.py
"""

import os
import sys
from pathlib import Path

import django
from django.contrib.auth.hashers import make_password


BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from usuarios.models import Rol, Usuario  # noqa  E402  pylint: disable=C0413


ROLE_DEFINITIONS = [
    {
        "name": "admin",
        "descripcion": "Acceso total a las funciones administrativas.",
        "permisos": {"usuarios": "full", "sistemas": "full"},
        "user": {
            "username": "admin_demo",
            "email": "admin.demo@uisrooms.test",
            "first_name": "Admin",
            "last_name": "Demo",
            "is_staff": True,
            "is_superuser": True,
        },
        "password": "Admin123!",
    },
    {
        "name": "laboratorista",
        "descripcion": "Gestiona y aprueba reservas de laboratorios.",
        "permisos": {"reservas": "manage_labs", "espacios": "view"},
        "user": {
            "username": "laboratorista_demo",
            "email": "laboratorista.demo@uisrooms.test",
            "first_name": "Laboratorista",
            "last_name": "Demo",
            "is_staff": True,
            "is_superuser": False,
        },
        "password": "Laboratorista123!",
    },
    {
        "name": "profesor",
        "descripcion": "Puede gestionar espacios y reservas propias.",
        "permisos": {"espacios": "manage", "reservas": "manage"},
        "user": {
            "username": "profesor_demo",
            "email": "profesor.demo@uisrooms.test",
            "first_name": "Profesor",
            "last_name": "Demo",
            "is_staff": True,
            "is_superuser": False,
        },
        "password": "Profesor123!",
    },
    {
        "name": "secretaria",
        "descripcion": "Administra solicitudes y aprobaciones de aulas.",
        "permisos": {"reservas": "manage_aulas", "espacios": "view"},
        "user": {
            "username": "secretaria_demo",
            "email": "secretaria.demo@uisrooms.test",
            "first_name": "Secretaria",
            "last_name": "Demo",
            "is_staff": True,
            "is_superuser": False,
        },
        "password": "Secretaria123!",
    },
]


def main() -> None:
    credentials = []

    for definition in ROLE_DEFINITIONS:
        role, _ = Rol.objects.get_or_create(
            nombre=definition["name"],
            defaults={
                "descripcion": definition["descripcion"],
                "permisos": definition["permisos"],
            },
        )

        user_defaults = {
            key: value
            for key, value in definition["user"].items()
            if key != "username"
        }
        user_defaults["rol"] = role
        user_defaults["password"] = make_password(definition["password"])

        user, created = Usuario.objects.update_or_create(
            username=definition["user"]["username"],
            defaults=user_defaults,
        )

        action = "CREATED" if created else "UPDATED"
        credentials.append(
            {
                "role": role.nombre,
                "username": user.username,
                "password": definition["password"],
                "email": user.email,
                "action": action,
            }
        )

    print("Usuarios por rol:")
    for cred in credentials:
        print(
            f"- Rol: {cred['role']:<11} | Usuario: {cred['username']:<17} "
            f"| Password: {cred['password']:<15} | Email: {cred['email']} "
            f"({cred['action']})"
        )


if __name__ == "__main__":
    main()
