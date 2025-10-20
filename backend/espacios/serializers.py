from rest_framework import serializers
from .models import Espacio, DisponibilidadEspacio

class EspacioSerializer(serializers.ModelSerializer):
    ubicacion_display = serializers.CharField(source='get_ubicacion_display', read_only=True)

    class Meta:
        model = Espacio
        fields = [
            'id',
            'codigo',
            'nombre',
            'descripcion',
            'tipo',
            'capacidad',
            'ubicacion',
            'ubicacion_display',
            'recursos',
            'activo',
            'creado_en',
            'actualizado_en',
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'ubicacion_display']

class DisponibilidadEspacioSerializer(serializers.ModelSerializer):
    es_bloqueo = serializers.BooleanField(default=True)

    class Meta:
        model = DisponibilidadEspacio
        fields = [
            'id',
            'espacio',
            'dia_semana',
            'hora_inicio',
            'hora_fin',
            'fecha_inicio',
            'fecha_fin',
            'recurrente',
            'observaciones',
            'es_bloqueo',
        ]
        read_only_fields = ['id']

