#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

from usuarios.models import Usuario, Rol
from django.contrib.auth.hashers import make_password

# Create admin role if it doesn't exist
admin_rol, created = Rol.objects.get_or_create(
    nombre='admin',
    defaults={'descripcion': 'Rol de administrador'}
)
if created:
    print('Created admin role')

# Create test users
users = [
    {'username': 'admin', 'email': 'admin@uis.edu.co', 'first_name': 'Admin', 'last_name': 'User', 'password': 'admin123', 'rol': admin_rol},
    {'username': 'profesor1', 'email': 'profesor1@uis.edu.co', 'first_name': 'Profesor', 'last_name': 'Uno', 'password': 'prof123', 'rol': None},
    {'username': 'estudiante1', 'email': 'estudiante1@uis.edu.co', 'first_name': 'Estudiante', 'last_name': 'Uno', 'password': 'est123', 'rol': None},
    {'username': 'estudiante2', 'email': 'estudiante2@uis.edu.co', 'first_name': 'Estudiante', 'last_name': 'Dos', 'password': 'est123', 'rol': None},
]

for user_data in users:
    user, created = Usuario.objects.get_or_create(
        username=user_data['username'],
        defaults={
            'email': user_data['email'],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'password': make_password(user_data['password']),
            'rol': user_data['rol']
        }
    )
    if created:
        print(f'Created user: {user.username}')
    else:
        # Update existing user if rol is None
        if user.rol is None and user_data['rol'] is not None:
            user.rol = user_data['rol']
            user.save()
            print(f'Updated user: {user.username} with admin role')
        else:
            print(f'User {user_data["username"]} already exists')

print('Test users creation completed.')
