#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

from usuarios.models import Usuario
from django.contrib.auth.hashers import make_password

# Create test users
users = [
    {'username': 'admin', 'email': 'admin@uis.edu.co', 'first_name': 'Admin', 'last_name': 'User', 'password': 'admin123'},
    {'username': 'profesor1', 'email': 'profesor1@uis.edu.co', 'first_name': 'Profesor', 'last_name': 'Uno', 'password': 'prof123'},
    {'username': 'estudiante1', 'email': 'estudiante1@uis.edu.co', 'first_name': 'Estudiante', 'last_name': 'Uno', 'password': 'est123'},
    {'username': 'estudiante2', 'email': 'estudiante2@uis.edu.co', 'first_name': 'Estudiante', 'last_name': 'Dos', 'password': 'est123'},
]

for user_data in users:
    if not Usuario.objects.filter(username=user_data['username']).exists():
        user = Usuario.objects.create(
            username=user_data['username'],
            email=user_data['email'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            password=make_password(user_data['password']),
            rol=None
        )
        print(f'Created user: {user.username}')
    else:
        print(f'User {user_data["username"]} already exists')

print('Test users creation completed.')
