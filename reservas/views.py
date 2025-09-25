from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Reserva, ReservaEstadoHistorial
from .serializer import ReservaSerializer, ReservaEstadoHistorialSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all().order_by('-fecha_inicio')
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # setear creado_por si viene en request.user (si usas auth)
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            serializer.save(creado_por=user)
        else:
            serializer.save()

class ReservaEstadoHistorialViewSet(viewsets.ModelViewSet):
    queryset = ReservaEstadoHistorial.objects.all().order_by('-fecha')
    serializer_class = ReservaEstadoHistorialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
