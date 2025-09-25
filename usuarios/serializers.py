from rest_framework import serializers
from .models import Usuario, Rol

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'descripcion']

class UsuarioSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    rol_id = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.all(), write_only=True, source='rol', required=False, allow_null=True
    )

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'telefono',
            'departamento', 'cargo', 'rol', 'rol_id', 'externo_provider', 'externo_id',
            'is_active', 'date_joined', 'actualizado_en'
        ]
        read_only_fields = ['id', 'date_joined', 'actualizado_en']
