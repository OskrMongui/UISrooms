import copy
from datetime import date, timedelta

from django.db import transaction

from rest_framework import serializers
from .models import Reserva, ReservaEstadoHistorial, EstadoReserva, RegistroApertura

SEMESTER_START = date(2025, 8, 4)
SEMESTER_END = date(2025, 11, 28)

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
        extra_kwargs = {
            'usuario': {'read_only': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._recurrence_weeks = 1

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

    def _extract_recurrence_weeks(self, data):
        metadata = data.get('metadata') or {}
        recurrencia = metadata.get('recurrencia') or {}
        semanas = recurrencia.get('semanas')

        if isinstance(semanas, str):
            try:
                semanas = int(semanas)
            except ValueError:
                semanas = None
        elif isinstance(semanas, float):
            if semanas.is_integer():
                semanas = int(semanas)
        if isinstance(semanas, int) and semanas > 0:
            return semanas

        rrule = data.get('rrule') or ''
        if isinstance(rrule, str):
            for part in rrule.split(';'):
                if part.upper().startswith('COUNT='):
                    try:
                        count_value = int(part.split('=', 1)[1])
                        if count_value > 0:
                            return count_value
                    except ValueError:
                        continue
        return None

    def validate(self, data):
        inicio = data.get('fecha_inicio') or getattr(self.instance, 'fecha_inicio', None)
        fin = data.get('fecha_fin') or getattr(self.instance, 'fecha_fin', None)
        espacio = data.get('espacio') or getattr(self.instance, 'espacio', None)
        recurrente = data.get('recurrente')
        if recurrente is None and getattr(self.instance, 'recurrente', None) is not None:
            recurrente = self.instance.recurrente

        if inicio and fin and inicio >= fin:
            raise serializers.ValidationError("fecha_inicio debe ser anterior a fecha_fin.")

        recurrence_weeks = 1
        if recurrente:
            recurrence_weeks = self._extract_recurrence_weeks(data) or 1
            if recurrence_weeks < 1:
                raise serializers.ValidationError("Debes indicar un numero valido de semanas para la reserva recurrente.")

            data['semestre_inicio'] = SEMESTER_START
            data['semestre_fin'] = SEMESTER_END

            if inicio and inicio.date() < SEMESTER_START:
                raise serializers.ValidationError("fecha_inicio no puede ser anterior al inicio del semestre.")
            if fin and fin.date() > SEMESTER_END:
                raise serializers.ValidationError("fecha_fin no puede ser posterior al fin del semestre.")

            if inicio:
                ultimo_inicio = (inicio + timedelta(weeks=recurrence_weeks - 1)).date()
                if ultimo_inicio > SEMESTER_END:
                    raise serializers.ValidationError("La ultima ocurrencia de la reserva excede el fin del semestre.")
            if fin:
                ultimo_fin = (fin + timedelta(weeks=recurrence_weeks - 1)).date()
                if ultimo_fin > SEMESTER_END:
                    raise serializers.ValidationError("La ultima ocurrencia de la reserva excede el fin del semestre.")

            self._recurrence_weeks = recurrence_weeks
        else:
            data['semestre_inicio'] = None
            data['semestre_fin'] = None
            if 'rrule' not in data:
                data['rrule'] = None
            self._recurrence_weeks = 1

        if inicio and fin and espacio:
            conflictos_aprobados = Reserva.objects.solapa(
                espacio,
                inicio,
                fin,
                estados=[EstadoReserva.APROBADO],
            )
            if self.instance:
                conflictos_aprobados = conflictos_aprobados.exclude(pk=self.instance.pk)
            if conflictos_aprobados.exists():
                raise serializers.ValidationError("El espacio no esta disponible en el horario seleccionado.")

        if not self.instance and inicio and fin and espacio:
            ocurrencias = [(inicio, fin)]
            if recurrente and recurrence_weeks > 1:
                for offset in range(1, recurrence_weeks):
                    ocurrencias.append(
                        (inicio + timedelta(weeks=offset), fin + timedelta(weeks=offset))
                    )
            for ocurrencia_inicio, ocurrencia_fin in ocurrencias:
                if not Reserva.objects.disponible(espacio, ocurrencia_inicio, ocurrencia_fin):
                    raise serializers.ValidationError(
                        "El espacio no esta disponible en al menos una de las ocurrencias recurrentes."
                    )

        metadata = data.get('metadata')
        if metadata is not None and not isinstance(metadata, dict):
            raise serializers.ValidationError("metadata debe ser un objeto JSON valido.")

        return data

    def create(self, validated_data):
        is_recurrent = validated_data.get('recurrente', False)
        recurrence_weeks = getattr(self, '_recurrence_weeks', 1) or 1
        recurrence_weeks = int(recurrence_weeks)

        if not is_recurrent:
            return Reserva.objects.create(**validated_data)

        metadata_template = copy.deepcopy(validated_data.get('metadata') or {})
        recurrencia = metadata_template.setdefault('recurrencia', {})
        recurrencia.setdefault('semanas', recurrence_weeks)
        recurrencia.setdefault('semestre_inicio', SEMESTER_START.isoformat())
        recurrencia.setdefault('semestre_fin', SEMESTER_END.isoformat())
        recurrencia['ocurrencia'] = 1
        recurrencia['total_ocurrencias'] = recurrence_weeks
        validated_data['metadata'] = metadata_template

        with transaction.atomic():
            reserva = Reserva.objects.create(**validated_data)

            if recurrence_weeks > 1:
                for offset in range(1, recurrence_weeks):
                    ocurrencia_metadata = copy.deepcopy(reserva.metadata or {})
                    ocurrencia_recurrencia = ocurrencia_metadata.setdefault('recurrencia', {})
                    ocurrencia_recurrencia.setdefault('semanas', recurrence_weeks)
                    ocurrencia_recurrencia.setdefault('semestre_inicio', SEMESTER_START.isoformat())
                    ocurrencia_recurrencia.setdefault('semestre_fin', SEMESTER_END.isoformat())
                    ocurrencia_recurrencia['ocurrencia'] = offset + 1
                    ocurrencia_recurrencia['total_ocurrencias'] = recurrence_weeks

                    Reserva.objects.create(
                        usuario=reserva.usuario,
                        espacio=reserva.espacio,
                        fecha_inicio=reserva.fecha_inicio + timedelta(weeks=offset),
                        fecha_fin=reserva.fecha_fin + timedelta(weeks=offset),
                        estado=reserva.estado,
                        motivo=reserva.motivo,
                        cantidad_asistentes=reserva.cantidad_asistentes,
                        requiere_llaves=reserva.requiere_llaves,
                        recurrente=True,
                        semestre_inicio=reserva.semestre_inicio,
                        semestre_fin=reserva.semestre_fin,
                        rrule=None,
                        creado_por=reserva.creado_por,
                        metadata=ocurrencia_metadata,
                    )

        return reserva

class ReservaEstadoHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaEstadoHistorial
        fields = ['id','reserva','estado_anterior','estado_nuevo','cambiado_por','comentario','fecha']
        read_only_fields = ['id','fecha']


class RegistroAperturaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.CharField(source='espacio.nombre', read_only=True)
    registrado_por_nombre = serializers.SerializerMethodField()
    asistencia_estado_display = serializers.CharField(
        source='get_asistencia_estado_display', read_only=True
    )
    cierre_motivo_display = serializers.CharField(
        source='get_cierre_motivo_display', read_only=True
    )

    class Meta:
        model = RegistroApertura
        fields = [
            'id',
            'reserva',
            'espacio',
            'espacio_nombre',
            'fecha_programada',
            'registrado_en',
            'registrado_por',
            'registrado_por_nombre',
            'completado',
            'completado_en',
            'asistencia_estado',
            'asistencia_estado_display',
            'asistencia_registrada_en',
            'hora_llegada_real',
            'ausencia_notificada',
             'cierre_registrado',
             'cierre_registrado_en',
             'cierre_registrado_por',
             'cierre_motivo',
             'cierre_motivo_display',
             'cierre_observaciones',
            'observaciones',
            'metadata',
        ]
        read_only_fields = [
            'id',
            'reserva',
            'espacio',
            'espacio_nombre',
            'fecha_programada',
            'registrado_en',
            'registrado_por',
            'registrado_por_nombre',
            'completado',
            'completado_en',
            'asistencia_estado',
            'asistencia_estado_display',
            'asistencia_registrada_en',
            'hora_llegada_real',
            'ausencia_notificada',
            'cierre_registrado',
            'cierre_registrado_en',
            'cierre_registrado_por',
            'cierre_motivo',
            'cierre_motivo_display',
            'cierre_observaciones',
        ]

    def get_registrado_por_nombre(self, obj):
        if not obj.registrado_por:
            return None
        full_name = f"{obj.registrado_por.first_name} {obj.registrado_por.last_name}".strip()
        return full_name or obj.registrado_por.username
