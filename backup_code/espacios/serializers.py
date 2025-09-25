from rest_framework import serializers
from .models import Espacio, DisponibilidadEspacio, EspacioBitacora

class EspacioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Espacio
        fields = ['id','codigo','nombre','descripcion','tipo','capacidad','ubicacion','recursos','activo','creado_en','actualizado_en']
        read_only_fields = ['id','creado_en','actualizado_en']

class DisponibilidadEspacioSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisponibilidadEspacio
        fields = ['id','espacio','dia_semana','hora_inicio','hora_fin','fecha_inicio','fecha_fin','recurrente','observaciones']

class EspacioBitacoraSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspacioBitacora
        fields = ['id','espacio','usuario','accion','detalle','fecha']
        read_only_fields = ['id','fecha']
