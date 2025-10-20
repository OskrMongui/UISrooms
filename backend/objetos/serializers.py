from rest_framework import serializers
from .models import ObjetoPerdido

class ObjetoPerdidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetoPerdido
        fields = [
            'id', 'descripcion', 'tipo', 'espacio', 'encontrado_por',
            'fecha_encontrado', 'estado', 'entregado_a', 'fecha_entrega', 'observaciones'
        ]
        read_only_fields = ['id']
