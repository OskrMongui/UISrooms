from rest_framework import serializers
from .models import Llave

class LlaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Llave
        fields = ['id','codigo','espacio','responsable','estado','creado_en','actualizado_en','metadata']
        read_only_fields = ['id','creado_en','actualizado_en']

