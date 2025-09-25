from rest_framework import viewsets
from .models import Incidencia, IncidenciaRespuesta
from .serializers import IncidenciaSerializer, IncidenciaRespuestaSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class IncidenciaViewSet(viewsets.ModelViewSet):
    queryset = Incidencia.objects.all().order_by('-fecha_reportada')
    serializer_class = IncidenciaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated:
            serializer.save(reportante=user)

class IncidenciaRespuestaViewSet(viewsets.ModelViewSet):
    queryset = IncidenciaRespuesta.objects.all().order_by('-fecha')
    serializer_class = IncidenciaRespuestaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated:
            serializer.save(autor=user)
