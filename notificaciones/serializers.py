from rest_framework import serializers
from .models import Notificacion

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'destinatario', 'remitente', 'mensaje', 'metadata', 'enviado', 'leido', 'enviado_en', 'creado_en']
        read_only_fields = ['id', 'creado_en']
