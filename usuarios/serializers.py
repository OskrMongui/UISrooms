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
            'id', 'usuario', 'email', 'nombre', 'apellido', 'telefono',
            'departamento', 'cargo', 'rol', 'rol_id', 'externo_provider', 'externo_id',
            'activo', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en']
