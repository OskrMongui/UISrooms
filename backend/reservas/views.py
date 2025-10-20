from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from espacios.models import TipoEspacio
from .models import EstadoReserva, Reserva, ReservaEstadoHistorial
from .serializer import ReservaSerializer, ReservaEstadoHistorialSerializer


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
            .order_by("fecha_inicio")
        )
        espacio_id = self.request.query_params.get("espacio")
        if espacio_id:
            queryset = queryset.filter(espacio_id=espacio_id)
        estado = self.request.query_params.get("estado")
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            serializer.save(creado_por=user)
        else:
            serializer.save()

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

    def destroy(self, request, *args, **kwargs):
        reserva = self.get_object()
        if not self._can_delete_reserva(request.user, reserva):
            return Response(
                {"detail": "No tienes permisos para eliminar esta reserva."},
                status=status.HTTP_403_FORBIDDEN,
            )
        self.perform_destroy(reserva)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def aprobar(self, request, pk=None):
        reserva = self.get_object()
        if reserva.estado != EstadoReserva.PENDIENTE:
            return Response({"detail": "La reserva no esta en estado pendiente."}, status=status.HTTP_400_BAD_REQUEST)
        if not self._can_manage_reserva(request.user, reserva):
            return Response({"detail": "No tienes permisos para aprobar esta reserva."}, status=status.HTTP_403_FORBIDDEN)

        comentario = request.data.get("comentario", "")
        self._register_historial(reserva, EstadoReserva.APROBADO, comentario, request.user)
        reserva.estado = EstadoReserva.APROBADO
        reserva.save(update_fields=["estado", "actualizado_en"])
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


class ReservaEstadoHistorialViewSet(viewsets.ModelViewSet):
    queryset = ReservaEstadoHistorial.objects.all().order_by("-fecha")
    serializer_class = ReservaEstadoHistorialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
