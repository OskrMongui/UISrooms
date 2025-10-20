from rest_framework import serializers
from .models import Incidencia, IncidenciaRespuesta

class IncidenciaRespuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidenciaRespuesta
        fields = ['id', 'incidencia', 'autor', 'mensaje', 'fecha']
        read_only_fields = ['id', 'fecha']

class IncidenciaSerializer(serializers.ModelSerializer):
    respuestas = IncidenciaRespuestaSerializer(many=True, read_only=True)

    class Meta:
        model = Incidencia
        fields = [
            'id', 'reportante', 'espacio', 'tipo', 'descripcion', 'estado',
            'fecha_reportada', 'fecha_cierre', 'cerrado_por', 'metadata', 'respuestas'
        ]
        read_only_fields = ['id', 'fecha_reportada', 'fecha_cierre']
