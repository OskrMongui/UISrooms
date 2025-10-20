from rest_framework import serializers
from .models import Reserva, ReservaEstadoHistorial

class ReservaSerializer(serializers.ModelSerializer):
    espacio_detalle = serializers.SerializerMethodField()
    usuario_detalle = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Reserva
        fields = [
            'id','usuario','usuario_detalle','espacio','espacio_detalle','fecha_inicio','fecha_fin','estado','estado_display','motivo',
            'cantidad_asistentes','requiere_llaves','recurrente','semestre_inicio','semestre_fin','rrule','creado_por','creado_en','actualizado_en','metadata'
        ]
        read_only_fields = ['id','creado_en','actualizado_en','usuario_detalle','espacio_detalle','estado_display']

    def get_espacio_detalle(self, obj):
        espacio = getattr(obj, "espacio", None)
        if not espacio:
            return None
        return {
            "id": str(espacio.id),
            "nombre": espacio.nombre,
            "tipo": espacio.tipo,
            "ubicacion": espacio.ubicacion,
            "ubicacion_display": getattr(espacio, "get_ubicacion_display", lambda: espacio.ubicacion)(),
        }

    def get_usuario_detalle(self, obj):
        usuario = getattr(obj, "usuario", None)
        if not usuario:
            return None
        return {
            "id": usuario.id,
            "nombre": f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
            "email": usuario.email,
            "rol": usuario.rol.nombre if getattr(usuario, "rol", None) else None,
        }

    def validate(self, data):
        inicio = data.get('fecha_inicio') or getattr(self.instance, 'fecha_inicio', None)
        fin = data.get('fecha_fin') or getattr(self.instance, 'fecha_fin', None)
        espacio = data.get('espacio') or getattr(self.instance, 'espacio', None)
        recurrente = data.get('recurrente')
        if recurrente is None and getattr(self.instance, 'recurrente', None) is not None:
            recurrente = self.instance.recurrente

        semestre_inicio = data.get('semestre_inicio')
        if semestre_inicio is None and getattr(self.instance, 'semestre_inicio', None) is not None:
            semestre_inicio = self.instance.semestre_inicio

        semestre_fin = data.get('semestre_fin')
        if semestre_fin is None and getattr(self.instance, 'semestre_fin', None) is not None:
            semestre_fin = self.instance.semestre_fin

        if inicio and fin and inicio >= fin:
            raise serializers.ValidationError("fecha_inicio debe ser anterior a fecha_fin.")

        if not self.instance and inicio and fin and espacio:
            if not Reserva.objects.disponible(espacio, inicio, fin):
                raise serializers.ValidationError("El espacio no esta disponible en ese rango horario (solapamiento).")

        if recurrente:
            if not semestre_inicio or not semestre_fin:
                raise serializers.ValidationError("Debes indicar las fechas de inicio y fin del semestre para reservas recurrentes.")
            if semestre_inicio > semestre_fin:
                raise serializers.ValidationError("semestre_inicio debe ser anterior o igual a semestre_fin.")
            if inicio and semestre_inicio and semestre_inicio > inicio.date():
                raise serializers.ValidationError("semestre_inicio no puede ser posterior a fecha_inicio.")
            if fin and semestre_fin and semestre_fin < fin.date():
                raise serializers.ValidationError("semestre_fin no puede ser anterior a fecha_fin.")
        else:
            data['semestre_inicio'] = None
            data['semestre_fin'] = None
            if 'rrule' not in data:
                data['rrule'] = None

        metadata = data.get('metadata')
        if metadata is not None and not isinstance(metadata, dict):
            raise serializers.ValidationError("metadata debe ser un objeto JSON valido.")

        return data

class ReservaEstadoHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaEstadoHistorial
        fields = ['id','reserva','estado_anterior','estado_nuevo','cambiado_por','comentario','fecha']
        read_only_fields = ['id','fecha']
