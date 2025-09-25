from rest_framework import serializers
from .models import Reserva, ReservaEstadoHistorial, Asignacion, Clase, ClaseCancelacion, Asistencia, Incumplimiento
from django.utils import timezone

class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = [
            'id','usuario','espacio','fecha_inicio','fecha_fin','estado','motivo',
            'cantidad_asistentes','requiere_llaves','recurrente','rrule','creado_por','creado_en','actualizado_en','metadata'
        ]
        read_only_fields = ['id','creado_en','actualizado_en']

    def validate(self, data):
        inicio = data.get('fecha_inicio') or getattr(self.instance, 'fecha_inicio', None)
        fin = data.get('fecha_fin') or getattr(self.instance, 'fecha_fin', None)
        espacio = data.get('espacio') or getattr(self.instance, 'espacio', None)

        if inicio and fin and inicio >= fin:
            raise serializers.ValidationError("fecha_inicio debe ser anterior a fecha_fin.")

        # Si se crea (no instancia) comprobamos disponibilidad
        if not self.instance and inicio and fin and espacio:
            if not Reserva.objects.disponible(espacio, inicio, fin):
                raise serializers.ValidationError("El espacio no está disponible en ese rango horario (solapamiento).")

        return data

class ReservaEstadoHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaEstadoHistorial
        fields = ['id','reserva','estado_anterior','estado_nuevo','cambiado_por','comentario','fecha']
        read_only_fields = ['id','fecha']
