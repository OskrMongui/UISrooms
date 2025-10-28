import json
from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from espacios.models import TipoEspacio
from notificaciones.models import Notificacion, TipoNotificacion
from incidencias.models import Incidencia
from usuarios.models import Usuario
from .models import (
    EstadoReserva,
    Reserva,
    ReservaEstadoHistorial,
    RegistroApertura,
    EstadoAsistencia,
    MotivoCierre,
)
from .serializer import (
    ReservaSerializer,
    ReservaEstadoHistorialSerializer,
    RegistroAperturaSerializer,
)


def _is_admin_user(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    rol = getattr(user, "rol", None)
    nombre = getattr(rol, "nombre", None)
    return bool(nombre and nombre.lower() == "admin")


def _localized(dt):
    if not dt:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return timezone.localtime(dt)


def _format_duration(delta):
    total_seconds = int(abs(delta.total_seconds()))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    parts = []
    if hours:
        parts.append(f"{hours}h")
    if minutes or hours:
        parts.append(f"{minutes}m")
    parts.append(f"{seconds}s")
    return " ".join(parts)


class ReservaViewSet(viewsets.ModelViewSet):
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    # Roles responsables por tipo de espacio. admin siempre puede gestionar.
    tipo_responsable_map = {
        TipoEspacio.AULA: {"secretaria", "admin"},
        TipoEspacio.LABORATORIO: {"laboratorista", "admin"},
        TipoEspacio.SALA: {"admin"},
    }

    def get_queryset(self):
        queryset = (
            Reserva.objects.all()
            .select_related("espacio", "usuario")
            .prefetch_related("registros_apertura__registrado_por")
            .order_by("fecha_inicio")
        )
        espacio_id = self.request.query_params.get("espacio")
        if espacio_id:
            queryset = queryset.filter(espacio_id=espacio_id)
        estado = self.request.query_params.get("estado")
        if estado:
            queryset = queryset.filter(estado=estado)

        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return queryset.none()

        role = self._user_role(user)
        manager_roles = {"admin", "secretaria", "laboratorista"}

        if role in manager_roles:
            if role == "admin":
                return queryset

            filters = Q(usuario=user)
            if role == "laboratorista":
                filters |= Q(espacio__tipo__iexact=TipoEspacio.LABORATORIO)
            if role == "secretaria":
                filters |= Q(espacio__tipo__iexact=TipoEspacio.AULA)
            return queryset.filter(filters)

        if role == "conserje":
            # Conserjes necesitan acceder a la reserva para aperturas/cierres
            return queryset

        return queryset.filter(usuario=user)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Debes iniciar sesion para crear una reserva.")
        serializer.save(creado_por=user, usuario=user)

    def _user_role(self, user):
        if not user or not getattr(user, "is_authenticated", False):
            return None
        if getattr(user, "is_superuser", False):
            return "admin"
        rol = getattr(user, "rol", None)
        if rol and rol.nombre:
            return rol.nombre.lower()
        return None

    def _allowed_roles_for_reserva(self, reserva):
        tipo = reserva.espacio.tipo
        allowed = self.tipo_responsable_map.get(tipo, {"admin"})
        return allowed | {"admin"}

    def _can_manage_reserva(self, user, reserva):
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        role = self._user_role(user)
        return role in self._allowed_roles_for_reserva(reserva)

    def _register_historial(self, reserva, estado_nuevo, comentario, user):
        ReservaEstadoHistorial.objects.create(
            reserva=reserva,
            estado_anterior=reserva.estado,
            estado_nuevo=estado_nuevo,
            cambiado_por=user if getattr(user, "is_authenticated", False) else None,
            comentario=comentario or "",
        )

    def _can_delete_reserva(self, user, reserva):
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        if reserva.usuario_id and reserva.usuario_id == getattr(user, "id", None):
            return True
        if reserva.creado_por_id and reserva.creado_por_id == getattr(user, "id", None):
            return True
        return self._can_manage_reserva(user, reserva)

    def _ensure_registro_apertura(self, reserva):
        fecha_programada = reserva.fecha_inicio
        if not fecha_programada or not reserva.espacio_id:
            return None
        registro, _ = RegistroApertura.objects.get_or_create(
            reserva=reserva,
            fecha_programada=fecha_programada,
            defaults={
                "espacio": reserva.espacio,
            },
        )
        if registro.espacio_id != reserva.espacio_id:
            registro.espacio = reserva.espacio
            registro.save(update_fields=["espacio"])
        return registro

    def destroy(self, request, *args, **kwargs):
        reserva = self.get_object()
        if not self._can_delete_reserva(request.user, reserva):
            return Response(
                {"detail": "No tienes permisos para eliminar esta reserva."},
                status=status.HTTP_403_FORBIDDEN,
            )
        self.perform_destroy(reserva)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _tipo_uso_desde_reserva(self, reserva):
        metadata = reserva.metadata or {}
        tipo_raw = metadata.get("tipo_uso") or metadata.get("tipo") or metadata.get("uso")
        tipo_norm = str(tipo_raw or "").strip().lower()
        if reserva.recurrente or tipo_norm in {"clase", "clase programada", "academico"}:
            return "Clase programada"
        return "Reserva especial"

    def _can_manage_aperturas(self, user):
        role = self._user_role(user)
        return role in {"conserje", "admin"}

    def _admin_recipients(self):
        return (
            Usuario.objects.filter(
                Q(is_superuser=True) | Q(rol__nombre__iexact="admin")
            )
            .distinct()
        )

    def _notify_apertura(self, reserva, registro, user):
        destinatario = reserva.usuario
        if not destinatario:
            return

        aula = reserva.espacio.nombre if reserva.espacio else "Espacio sin nombre"
        hora = (
            registro.completado_en.strftime("%H:%M")
            if registro.completado_en
            else "sin hora"
        )
        mensaje = (
            f"Se registro la apertura del aula {aula} a las {hora}. "
            "Puedes dirigirte al espacio para iniciar la actividad."
        )
        metadata_detalle = {
            "reserva_id": str(reserva.id),
            "espacio_id": str(reserva.espacio_id) if reserva.espacio_id else None,
            "aula": aula,
            "hora_programada": reserva.fecha_inicio.isoformat()
            if reserva.fecha_inicio
            else None,
            "hora_apertura": registro.completado_en.isoformat()
            if registro.completado_en
            else None,
            "tipo_uso": self._tipo_uso_desde_reserva(reserva),
            "evento": "apertura",
        }

        Notificacion.objects.create(
            tipo=TipoNotificacion.AGENDA,
            destinatario=destinatario,
            remitente=user if getattr(user, "is_authenticated", False) else None,
            mensaje=mensaje,
            metadata=metadata_detalle,
        )

    def _notify_ausencia(self, reserva, registro, profesor_solicitante, user):
        if registro.ausencia_notificada:
            return

        admins = list(self._admin_recipients())
        if not admins:
            return

        aula = reserva.espacio.nombre if reserva.espacio else "Espacio sin nombre"
        hora_programada = (
            reserva.fecha_inicio.isoformat() if reserva.fecha_inicio else None
        )
        mensaje = (
            f"Ausencia detectada en {aula}. "
            "El profesor o responsable no se presento a la hora programada."
        )

        metadata_detalle = {
            "reserva_id": str(reserva.id),
            "espacio_id": str(reserva.espacio_id) if reserva.espacio_id else None,
            "aula": aula,
            "hora_programada": hora_programada,
            "profesor": profesor_solicitante,
            "evento": "ausencia",
        }

        for admin in admins:
            Notificacion.objects.create(
                tipo=TipoNotificacion.AGENDA,
                destinatario=admin,
                remitente=user if getattr(user, "is_authenticated", False) else None,
                mensaje=mensaje,
                metadata=metadata_detalle.copy(),
            )

        registro.ausencia_notificada = True

    def _registrar_cierre_registro(
        self,
        registro,
        motivo,
        observaciones,
        user,
        hora_cierre=None,
        automatico=False,
    ):
        if registro.cierre_registrado:
            return registro

        hora_cierre = hora_cierre or timezone.now()
        registro.cierre_registrado = True
        registro.cierre_registrado_en = hora_cierre
        registro.cierre_registrado_por = (
            user if getattr(user, "is_authenticated", False) else None
        )
        registro.cierre_motivo = motivo
        registro.cierre_observaciones = observaciones or ""

        metadata_registro = registro.metadata or {}
        cierre_meta = metadata_registro.setdefault("cierre", {})
        cierre_meta.update(
            {
                "motivo": motivo,
                "motivo_display": registro.get_cierre_motivo_display(),
                "registrado_en": hora_cierre.isoformat(),
                "registrado_por": getattr(
                    registro.cierre_registrado_por, "id", None
                ),
                "observaciones": registro.cierre_observaciones,
                "automatico": automatico,
            }
        )
        metadata_registro["estado_aula"] = "cerrada"
        registro.metadata = metadata_registro

        reserva = registro.reserva
        reserva_metadata = reserva.metadata or {}
        reserva_metadata.update(
            {
                "estado_aula": "cerrada",
                "cierre_registrado_en": hora_cierre.isoformat(),
                "cierre_motivo": motivo,
            }
        )

        registro.save(
            update_fields=[
                "cierre_registrado",
                "cierre_registrado_en",
                "cierre_registrado_por",
                "cierre_motivo",
                "cierre_observaciones",
                "metadata",
            ]
        )
        reserva.metadata = reserva_metadata
        reserva.save(update_fields=["metadata", "actualizado_en"])
        registro.refresh_from_db()
        return registro

    def _detalles_para_apertura(self, reserva):
        metadata = reserva.metadata or {}
        curso_data = metadata.get("curso") or metadata.get("materia") or {}

        def _first_value(keys):
            for key in keys:
                value = metadata.get(key)
                if value:
                    return value
                value = curso_data.get(key)
                if value:
                    return value
            return None

        tipo_uso = self._tipo_uso_desde_reserva(reserva)
        codigo_materia = _first_value(
            ["codigo_materia", "codigo", "materia_codigo", "codigoCurso"]
        )
        codigo_grupo = _first_value(
            ["codigo_grupo", "grupo", "grupo_codigo", "grupoCurso"]
        )

        return {
            "tipo_uso": tipo_uso,
            "codigo_materia": codigo_materia,
            "codigo_grupo": codigo_grupo,
            "es_clase": tipo_uso == "Clase programada",
        }

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def aprobar(self, request, pk=None):
        reserva = self.get_object()
        if reserva.estado != EstadoReserva.PENDIENTE:
            return Response({"detail": "La reserva no esta en estado pendiente."}, status=status.HTTP_400_BAD_REQUEST)
        if not self._can_manage_reserva(request.user, reserva):
            return Response({"detail": "No tienes permisos para aprobar esta reserva."}, status=status.HTTP_403_FORBIDDEN)

        comentario = request.data.get("comentario", "")
        conflictos_aprobados = Reserva.objects.solapa(
            reserva.espacio,
            reserva.fecha_inicio,
            reserva.fecha_fin,
            estados=[EstadoReserva.APROBADO],
        ).exclude(pk=reserva.pk)
        if conflictos_aprobados.exists():
            return Response(
                {"detail": "Ya existe una reserva aprobada que se cruza con este horario."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            self._register_historial(reserva, EstadoReserva.APROBADO, comentario, request.user)
            reserva.estado = EstadoReserva.APROBADO
            reserva.save(update_fields=["estado", "actualizado_en"])
            self._ensure_registro_apertura(reserva)

            pendientes_conflictivos = Reserva.objects.solapa(
                reserva.espacio,
                reserva.fecha_inicio,
                reserva.fecha_fin,
                estados=[EstadoReserva.PENDIENTE],
            ).exclude(pk=reserva.pk).select_for_update()

            for otra_reserva in pendientes_conflictivos:
                self._register_historial(
                    otra_reserva,
                    EstadoReserva.RECHAZADO,
                    "Rechazada automaticamente por aprobacion de otra reserva en el mismo horario.",
                    request.user,
                )
                otra_reserva.estado = EstadoReserva.RECHAZADO
                otra_reserva.save(update_fields=["estado", "actualizado_en"])

        serializer = self.get_serializer(reserva)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def rechazar(self, request, pk=None):
        reserva = self.get_object()
        if reserva.estado != EstadoReserva.PENDIENTE:
            return Response({"detail": "La reserva no esta en estado pendiente."}, status=status.HTTP_400_BAD_REQUEST)
        if not self._can_manage_reserva(request.user, reserva):
            return Response({"detail": "No tienes permisos para rechazar esta reserva."}, status=status.HTTP_403_FORBIDDEN)

        comentario = request.data.get("comentario", "")
        self._register_historial(reserva, EstadoReserva.RECHAZADO, comentario, request.user)
        reserva.estado = EstadoReserva.RECHAZADO
        reserva.save(update_fields=["estado", "actualizado_en"])
        serializer = self.get_serializer(reserva)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="aperturas", permission_classes=[IsAuthenticated])
    def aperturas(self, request):
        if not self._can_manage_aperturas(request.user):
            return Response(
                {"detail": "No tienes permisos para consultar las aperturas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        fecha_param = request.query_params.get("fecha")
        if fecha_param:
            try:
                fecha_objetivo = datetime.strptime(fecha_param, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "Formato de fecha invalido. Usa YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            fecha_objetivo = timezone.localdate()

        reservas = (
            Reserva.objects.filter(
                estado=EstadoReserva.APROBADO,
                fecha_inicio__date=fecha_objetivo,
            )
            .select_related("espacio", "usuario")
            .prefetch_related("registros_apertura__registrado_por")
            .order_by("fecha_inicio")
        )

        resultados = []
        for reserva in reservas:
            registro = self._ensure_registro_apertura(reserva)
            if registro and registro.fecha_programada.date() != fecha_objetivo:
                registro = None
            detalles = self._detalles_para_apertura(reserva)
            if reserva.usuario:
                nombre = f"{reserva.usuario.first_name} {reserva.usuario.last_name}".strip()
                solicitante = nombre or reserva.usuario.username
            else:
                solicitante = None

            estado_inicial = (
                "Aula abierta, esperando llegada del profesor o responsable."
            )

            apertura_registrada = bool(registro and registro.completado)
            apertura_registrada_en = (
                registro.completado_en.isoformat()
                if registro and registro.completado_en
                else None
            )
            asistencia_estado = (
                registro.asistencia_estado
                if registro and registro.asistencia_estado
                else None
            )
            asistencia_estado_display = (
                registro.get_asistencia_estado_display()
                if registro and registro.asistencia_estado
                else None
            )
            asistencia_registrada_en = (
                registro.asistencia_registrada_en.isoformat()
                if registro and registro.asistencia_registrada_en
                else None
            )
            hora_llegada_real = (
                registro.hora_llegada_real.isoformat()
                if registro and registro.hora_llegada_real
                else None
            )
            ausencia_notificada = bool(registro and registro.ausencia_notificada)
            cierre_registrado = bool(registro and registro.cierre_registrado)
            cierre_registrado_en = (
                registro.cierre_registrado_en.isoformat()
                if registro and registro.cierre_registrado_en
                else None
            )
            cierre_motivo = registro.cierre_motivo if registro else None
            cierre_motivo_display = (
                registro.get_cierre_motivo_display()
                if registro and registro.cierre_motivo
                else None
            )
            cierre_observaciones = (
                registro.cierre_observaciones if registro else None
            )
            registro_data = (
                RegistroAperturaSerializer(registro).data if registro else None
            )
            estado_aula = "cerrada" if cierre_registrado else "abierta"

            resultados.append(
                {
                    "reserva_id": str(reserva.id),
                    "espacio_id": str(reserva.espacio_id),
                    "aula": reserva.espacio.nombre if reserva.espacio else None,
                    "hora_programada": reserva.fecha_inicio.isoformat()
                    if reserva.fecha_inicio
                    else None,
                    "profesor_solicitante": solicitante,
                    "tipo_uso": detalles["tipo_uso"],
                    "requiere_llaves": reserva.requiere_llaves,
                    "codigo_materia": detalles["codigo_materia"],
                    "codigo_grupo": detalles["codigo_grupo"],
                    "es_clase": detalles["es_clase"],
                    "estado_inicial": estado_inicial,
                    "apertura_registrada": apertura_registrada,
                    "apertura_registrada_en": apertura_registrada_en,
                    "asistencia_estado": asistencia_estado,
                    "asistencia_estado_display": asistencia_estado_display,
                    "asistencia_registrada_en": asistencia_registrada_en,
                    "hora_llegada_real": hora_llegada_real,
                    "ausencia_notificada": ausencia_notificada,
                    "cierre_registrado": cierre_registrado,
                    "cierre_registrado_en": cierre_registrado_en,
                    "cierre_motivo": cierre_motivo,
                    "cierre_motivo_display": cierre_motivo_display,
                    "cierre_observaciones": cierre_observaciones,
                    "estado_aula": estado_aula,
                    "registro": registro_data,
                }
            )

        estado_filtro = request.query_params.get("estado")
        if estado_filtro:
            estado_filtro = estado_filtro.lower()
            filtrados = []
            for item in resultados:
                apertura_ok = bool(item.get("apertura_registrada"))
                cierre_ok = bool(item.get("cierre_registrado"))
                if estado_filtro in {"pendiente", "pendientes"}:
                    if not apertura_ok:
                        filtrados.append(item)
                elif estado_filtro in {
                    "abierta",
                    "abiertas",
                    "realizada",
                    "realizadas",
                }:
                    if apertura_ok and not cierre_ok:
                        filtrados.append(item)
                elif estado_filtro in {"cerrada", "cerradas"}:
                    if cierre_ok:
                        filtrados.append(item)
            resultados = filtrados

        return Response(
            {
                "fecha": fecha_objetivo.isoformat(),
                "total": len(resultados),
                "resultados": resultados,
            }
        )

    @action(detail=True, methods=["post"], url_path="registrar-apertura", permission_classes=[IsAuthenticated])
    def registrar_apertura(self, request, pk=None):
        reserva = self.get_object()
        if not self._can_manage_aperturas(request.user):
            return Response(
                {"detail": "No tienes permisos para registrar aperturas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if reserva.estado != EstadoReserva.APROBADO:
            return Response(
                {"detail": "Solo puedes registrar aperturas de reservas aprobadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fecha_programada = reserva.fecha_inicio
        fecha_param = request.data.get("fecha")
        if fecha_param:
            try:
                fecha_param_date = datetime.strptime(fecha_param, "%Y-%m-%d").date()
                fecha_programada = datetime.combine(
                    fecha_param_date,
                    reserva.fecha_inicio.timetz(),
                )
                if timezone.is_naive(fecha_programada):
                    fecha_programada = timezone.make_aware(
                        fecha_programada,
                        timezone.get_current_timezone(),
                    )
            except ValueError:
                return Response(
                    {"detail": "Formato de fecha invalido. Usa YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existente = reserva.registros_apertura.filter(
            fecha_programada__date=fecha_programada.date()
        ).first()
        if existente and existente.completado:
            serializer = RegistroAperturaSerializer(existente)
            return Response(
                {"detail": "La apertura ya fue registrada.", "registro": serializer.data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hora_programada = (
            existente.fecha_programada if existente and existente.fecha_programada else fecha_programada
        )
        if not hora_programada:
            return Response(
                {"detail": "La reserva no tiene una hora programada valida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(hora_programada):
            hora_programada = timezone.make_aware(
                hora_programada, timezone.get_current_timezone()
            )

        now = timezone.now()
        ventana_inicio = hora_programada - timedelta(minutes=20)
        ventana_fin = hora_programada + timedelta(minutes=30)
        if now < ventana_inicio:
            espera = _format_duration(ventana_inicio - now)
            return Response(
                {
                    "detail": (
                        "La ventana para registrar la apertura aun no esta activa. "
                        f"Se habilitara en {espera}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if now > ventana_fin:
            cierre = _format_duration(now - ventana_fin)
            return Response(
                {
                    "detail": (
                        "La ventana para registrar la apertura ha finalizado. "
                        f"Se cerro hace {cierre}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        observaciones = request.data.get("observaciones") or None
        metadata_input = request.data.get("metadata")
        metadata = None
        if metadata_input is not None:
            if isinstance(metadata_input, str):
                metadata_str = metadata_input.strip()
                if metadata_str:
                    try:
                        metadata = json.loads(metadata_str)
                    except json.JSONDecodeError:
                        return Response(
                            {"detail": "metadata debe ser un objeto JSON valido."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    metadata = {}
            elif isinstance(metadata_input, dict):
                metadata = metadata_input
            else:
                return Response(
                    {"detail": "metadata debe ser un objeto JSON valido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if metadata is not None and not isinstance(metadata, dict):
                return Response(
                    {"detail": "metadata debe ser un objeto JSON valido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        registro = existente or self._ensure_registro_apertura(reserva)
        if not registro:
            return Response(
                {"detail": "No se pudo preparar el registro de apertura."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if registro.completado:
            serializer = RegistroAperturaSerializer(registro)
            return Response(
                {"detail": "La apertura ya fue registrada.", "registro": serializer.data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if registro.fecha_programada.date() != fecha_programada.date():
            registro.fecha_programada = fecha_programada
            registro.save(update_fields=["fecha_programada"])

        detalles = self._detalles_para_apertura(reserva)
        tipo_uso = request.data.get("tipo_uso") or detalles["tipo_uso"]
        codigo_materia = request.data.get("codigo_materia") or detalles["codigo_materia"]
        codigo_grupo = request.data.get("codigo_grupo") or detalles["codigo_grupo"]
        profesor_solicitante = request.data.get("profesor_solicitante")
        if not profesor_solicitante and reserva.usuario:
            nombre = f"{reserva.usuario.first_name} {reserva.usuario.last_name}".strip()
            profesor_solicitante = nombre or reserva.usuario.username

        estado_inicial = request.data.get(
            "estado_inicial",
            "Aula abierta, esperando llegada del profesor o responsable.",
        )

        hora_actual_input = request.data.get("hora_actual")
        hora_registro = timezone.now()
        if hora_actual_input:
            parsed = parse_datetime(hora_actual_input)
            if parsed:
                if timezone.is_naive(parsed):
                    parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
                hora_registro = parsed

        registro.completado = True
        registro.completado_en = hora_registro
        registro.registrado_por = request.user if request.user.is_authenticated else None
        registro.observaciones = observaciones or registro.observaciones
        if metadata is not None:
            registro.metadata = metadata
        else:
            metadata_registro = registro.metadata or {}
            metadata_registro.update(
                {
                    "tipo_uso": tipo_uso,
                    "profesor_solicitante": profesor_solicitante,
                    "codigo_materia": codigo_materia,
                    "codigo_grupo": codigo_grupo,
                    "id_reserva": str(reserva.id),
                    "hora_programada": reserva.fecha_inicio.isoformat()
                    if reserva.fecha_inicio
                    else None,
                    "fecha": timezone.localdate().isoformat(),
                    "hora_actual": hora_registro.isoformat(),
                    "estado_inicial": estado_inicial,
                    "confirmado": True,
                }
            )
            registro.metadata = metadata_registro
        registro.save(
            update_fields=[
                "completado",
                "completado_en",
                "registrado_por",
                "observaciones",
                "metadata",
            ]
        )
        registro.refresh_from_db()
        self._notify_apertura(reserva, registro, request.user)

        serializer = RegistroAperturaSerializer(registro)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path="registrar-asistencia",
        permission_classes=[IsAuthenticated],
    )
    def registrar_asistencia(self, request, pk=None):
        reserva = self.get_object()
        if not self._can_manage_aperturas(request.user):
            return Response(
                {"detail": "No tienes permisos para registrar asistencia."},
                status=status.HTTP_403_FORBIDDEN,
            )

        registro = self._ensure_registro_apertura(reserva)
        if not registro or not registro.completado:
            return Response(
                {
                    "detail": "Debes registrar la apertura antes de verificar la asistencia."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        hora_programada = registro.fecha_programada or reserva.fecha_inicio
        if not hora_programada:
            return Response(
                {"detail": "La reserva no tiene una hora programada valida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(hora_programada):
            hora_programada = timezone.make_aware(
                hora_programada, timezone.get_current_timezone()
            )

        now = timezone.now()
        ventana_inicio = hora_programada
        ventana_fin = hora_programada + timedelta(minutes=30)
        if now < ventana_inicio:
            espera = _format_duration(ventana_inicio - now)
            return Response(
                {
                    "detail": (
                        "La verificacion de asistencia aun no esta disponible. "
                        f"Se habilitara en {espera}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if now > ventana_fin:
            cierre = _format_duration(now - ventana_fin)
            return Response(
                {
                    "detail": (
                        "La ventana para registrar la asistencia ha finalizado. "
                        f"Se cerro hace {cierre}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado_input = (request.data.get("estado") or "").strip().lower()
        estado_map = {
            "si": EstadoAsistencia.PRESENTE,
            "presente": EstadoAsistencia.PRESENTE,
            "llego": EstadoAsistencia.PRESENTE,
            "present": EstadoAsistencia.PRESENTE,
            "tarde": EstadoAsistencia.TARDE,
            "llego tarde": EstadoAsistencia.TARDE,
            "ausente": EstadoAsistencia.AUSENTE,
            "no": EstadoAsistencia.AUSENTE,
            "no llego": EstadoAsistencia.AUSENTE,
        }
        estado = estado_map.get(estado_input)
        if not estado:
            return Response(
                {
                    "detail": "Estado de asistencia invalido. Usa presente, tarde o ausente."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        hora_real_input = request.data.get("hora_real") or request.data.get(
            "hora_actual"
        )
        hora_real = None
        if hora_real_input:
            parsed = parse_datetime(hora_real_input)
            if not parsed:
                return Response(
                    {"detail": "Formato de hora invalido. Usa ISO 8601."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            hora_real = parsed

        if estado == EstadoAsistencia.TARDE and not hora_real:
            return Response(
                {"detail": "Debes indicar la hora real de llegada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if estado == EstadoAsistencia.PRESENTE and not hora_real:
            hora_real = now

        observaciones = request.data.get("observaciones") or ""

        registro.asistencia_estado = estado
        registro.asistencia_registrada_en = now
        registro.hora_llegada_real = hora_real if estado != EstadoAsistencia.AUSENTE else None
        if estado != EstadoAsistencia.AUSENTE:
            registro.ausencia_notificada = False

        metadata_registro = registro.metadata or {}
        asistencia_meta = metadata_registro.setdefault("asistencia", {})
        asistencia_meta.update(
            {
                "estado": estado,
                "registrado_en": now.isoformat(),
                "llegada_real": hora_real.isoformat() if hora_real else None,
                "observaciones": observaciones or asistencia_meta.get("observaciones"),
            }
        )
        if estado == EstadoAsistencia.AUSENTE:
            asistencia_meta["ausencia"] = True
            asistencia_meta["aula_cerrada"] = True
        else:
            asistencia_meta["ausencia"] = False
            asistencia_meta["aula_cerrada"] = False

        metadata_registro["asistencia"] = asistencia_meta
        registro.metadata = metadata_registro

        profesor_solicitante = request.data.get("profesor_solicitante")
        if not profesor_solicitante and reserva.usuario:
            nombres = f"{reserva.usuario.first_name} {reserva.usuario.last_name}".strip()
            profesor_solicitante = nombres or reserva.usuario.username

        if estado == EstadoAsistencia.AUSENTE:
            self._notify_ausencia(reserva, registro, profesor_solicitante, request.user)

        registro.save(
            update_fields=[
                "asistencia_estado",
                "asistencia_registrada_en",
                "hora_llegada_real",
                "ausencia_notificada",
                "metadata",
            ]
        )
        if estado == EstadoAsistencia.AUSENTE:
            registro = self._registrar_cierre_registro(
                registro,
                MotivoCierre.AUSENCIA,
                observaciones or "Cierre automatico por ausencia del responsable.",
                request.user,
                hora_cierre=now,
                automatico=True,
            )

        serializer = RegistroAperturaSerializer(registro)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="registrar-cierre",
        permission_classes=[IsAuthenticated],
    )
    def registrar_cierre(self, request, pk=None):
        reserva = self.get_object()
        if not self._can_manage_aperturas(request.user):
            return Response(
                {"detail": "No tienes permisos para registrar cierres."},
                status=status.HTTP_403_FORBIDDEN,
            )

        registro = self._ensure_registro_apertura(reserva)
        if not registro or not registro.completado:
            return Response(
                {"detail": "Debes registrar la apertura antes de cerrar el aula."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if registro.cierre_registrado:
            serializer = RegistroAperturaSerializer(registro)
            return Response(
                {"detail": "El cierre ya fue registrado.", "registro": serializer.data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motivo_input = (request.data.get("motivo") or "").strip().lower()
        motivo_map = {
            "fin": MotivoCierre.FIN_CLASE,
            "fin_clase": MotivoCierre.FIN_CLASE,
            "fin de clase": MotivoCierre.FIN_CLASE,
            "fin de clase / reserva": MotivoCierre.FIN_CLASE,
            "reserva": MotivoCierre.FIN_CLASE,
            "ausencia": MotivoCierre.AUSENCIA,
            "ausencia del profesor": MotivoCierre.AUSENCIA,
            "administrativa": MotivoCierre.INSTRUCCION,
            "instruccion administrativa": MotivoCierre.INSTRUCCION,
            "instruccion": MotivoCierre.INSTRUCCION,
        }
        motivo = motivo_map.get(motivo_input)
        if not motivo:
            return Response(
                {
                    "detail": "Motivo invalido. Usa fin_clase, ausencia o instruccion."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        hora_actual_input = request.data.get("hora_actual")
        hora_cierre = timezone.now()
        if hora_actual_input:
            parsed = parse_datetime(hora_actual_input)
            if not parsed:
                return Response(
                    {"detail": "Formato de hora invalido. Usa ISO 8601."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            hora_cierre = parsed

        observaciones = request.data.get("observaciones") or ""

        registro = self._registrar_cierre_registro(
            registro,
            motivo,
            observaciones,
            request.user,
            hora_cierre=hora_cierre,
            automatico=False,
        )

        serializer = RegistroAperturaSerializer(registro)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReservaEstadoHistorialViewSet(viewsets.ModelViewSet):
    queryset = ReservaEstadoHistorial.objects.all().order_by("-fecha")
    serializer_class = ReservaEstadoHistorialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ReporteAdminMixin:
    permission_classes = [IsAuthenticated]

    def _require_admin(self, user):
        if not _is_admin_user(user):
            raise PermissionDenied("Solo administradores pueden acceder a los reportes.")

    def _parse_rango_fechas(self, request):
        inicio_param = request.query_params.get("inicio")
        fin_param = request.query_params.get("fin")
        inicio = fin = None
        if inicio_param:
            inicio = parse_date(inicio_param)
            if not inicio:
                raise ValueError("Formato de fecha invalido para 'inicio'. Usa YYYY-MM-DD.")
        if fin_param:
            fin = parse_date(fin_param)
            if not fin:
                raise ValueError("Formato de fecha invalido para 'fin'. Usa YYYY-MM-DD.")
        return inicio, fin

    def _reporte_aperturas(self, request):
        self._require_admin(request.user)
        try:
            inicio, fin = self._parse_rango_fechas(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        registros = (
            RegistroApertura.objects.filter(completado=True)
            .select_related("espacio", "reserva__usuario")
            .order_by("-completado_en")
        )

        if inicio:
            registros = registros.filter(completado_en__date__gte=inicio)
        if fin:
            registros = registros.filter(completado_en__date__lte=fin)

        resultados = []
        for registro in registros:
            reserva = registro.reserva
            usuario = getattr(reserva, "usuario", None)
            nombre_usuario = None
            if usuario:
                nombre_usuario = (
                    f"{usuario.first_name} {usuario.last_name}".strip()
                    or usuario.username
                )
            metadata = registro.metadata or {}
            solicitante = metadata.get("profesor_solicitante") or nombre_usuario
            momento = _localized(registro.completado_en or registro.fecha_programada)

            resultados.append(
                {
                    "reserva_id": str(registro.reserva_id),
                    "fecha": momento.date().isoformat() if momento else None,
                    "hora": momento.isoformat() if momento else None,
                    "aula": registro.espacio.nombre if registro.espacio else None,
                    "solicitante": solicitante,
                }
            )

        return Response({"total": len(resultados), "resultados": resultados})

    def _reporte_ausencias(self, request):
        self._require_admin(request.user)
        try:
            inicio, fin = self._parse_rango_fechas(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        registros = (
            RegistroApertura.objects.filter(
                asistencia_estado=EstadoAsistencia.AUSENTE
            )
            .select_related("espacio", "reserva")
            .order_by("-asistencia_registrada_en")
        )

        if inicio:
            registros = registros.filter(asistencia_registrada_en__date__gte=inicio)
        if fin:
            registros = registros.filter(asistencia_registrada_en__date__lte=fin)

        resultados = []
        for registro in registros:
            reserva = registro.reserva
            metadata = registro.metadata or {}
            reserva_metadata = reserva.metadata if isinstance(reserva.metadata, dict) else {}
            curso_data = reserva_metadata.get("curso") if isinstance(reserva_metadata.get("curso"), dict) else {}

            def _first_value(data, keys):
                if not isinstance(data, dict):
                    return None
                for key in keys:
                    value = data.get(key)
                    if value:
                        return value
                return None

            codigo_materia = (
                _first_value(metadata, ["codigo_materia", "codigo", "materia_codigo", "codigoCurso"])
                or _first_value(reserva_metadata, ["codigo_materia", "codigo", "materia_codigo"])
                or _first_value(curso_data, ["codigo", "codigo_materia", "materia_codigo"])
            )
            codigo_grupo = (
                _first_value(metadata, ["codigo_grupo", "grupo", "grupo_codigo", "grupoCurso"])
                or _first_value(reserva_metadata, ["codigo_grupo", "grupo", "grupo_codigo"])
                or _first_value(curso_data, ["grupo", "codigo_grupo", "grupo_codigo"])
            )
            asistencia_meta = metadata.get("asistencia") if isinstance(metadata.get("asistencia"), dict) else {}
            momento_registro = _localized(registro.asistencia_registrada_en)

            resultados.append(
                {
                    "reserva_id": str(registro.reserva_id),
                    "aula": registro.espacio.nombre if registro.espacio else None,
                    "fecha": momento_registro.date().isoformat() if momento_registro else None,
                    "hora_registro": momento_registro.isoformat() if momento_registro else None,
                    "codigo_materia": codigo_materia,
                    "codigo_grupo": codigo_grupo,
                    "tipo_uso": metadata.get("tipo_uso") or reserva_metadata.get("tipo_uso"),
                    "observaciones": asistencia_meta.get("observaciones") if asistencia_meta else None,
                }
            )

        return Response({"total": len(resultados), "resultados": resultados})

    def _reporte_incidencias(self, request):
        self._require_admin(request.user)
        try:
            inicio, fin = self._parse_rango_fechas(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        incidencias = (
            Incidencia.objects.all()
            .select_related("espacio")
            .order_by("-fecha_reportada")
        )
        if inicio:
            incidencias = incidencias.filter(fecha_reportada__date__gte=inicio)
        if fin:
            incidencias = incidencias.filter(fecha_reportada__date__lte=fin)

        resultados = []
        for incidencia in incidencias:
            fecha_reportada = _localized(incidencia.fecha_reportada)
            resultados.append(
                {
                    "incidencia_id": str(incidencia.id),
                    "fecha": fecha_reportada.isoformat() if fecha_reportada else None,
                    "espacio": incidencia.espacio.nombre if incidencia.espacio else None,
                    "tipo": incidencia.tipo,
                    "descripcion": incidencia.descripcion,
                    "estado": incidencia.estado,
                }
            )

        return Response({"total": len(resultados), "resultados": resultados})


class ReporteAdminViewSet(ReporteAdminMixin, viewsets.ViewSet):
    @action(detail=False, methods=["get"], url_path="aperturas")
    def aperturas(self, request):
        return self._reporte_aperturas(request)

    @action(detail=False, methods=["get"], url_path="ausencias")
    def ausencias(self, request):
        return self._reporte_ausencias(request)

    @action(detail=False, methods=["get"], url_path="incidencias")
    def incidencias(self, request):
        return self._reporte_incidencias(request)


class ReporteAperturasAPIView(ReporteAdminMixin, APIView):
    def get(self, request, *args, **kwargs):
        return self._reporte_aperturas(request)


class ReporteAusenciasAPIView(ReporteAdminMixin, APIView):
    def get(self, request, *args, **kwargs):
        return self._reporte_ausencias(request)


class ReporteIncidenciasAPIView(ReporteAdminMixin, APIView):
    def get(self, request, *args, **kwargs):
        return self._reporte_incidencias(request)
