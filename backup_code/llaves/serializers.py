from rest_framework import serializers
from .models import Llave, LlaveRegistro

class LlaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Llave
        fields = ['id','codigo','espacio','responsable','estado','creado_en','actualizado_en','metadata']
        read_only_fields = ['id','creado_en','actualizado_en']

class LlaveRegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model = LlaveRegistro
        fields = ['id','llave','usuario','tipo_movimiento','fecha','observaciones']
        read_only_fields = ['id','fecha']
