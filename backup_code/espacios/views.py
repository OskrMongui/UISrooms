from rest_framework import viewsets
from .models import Espacio, DisponibilidadEspacio, EspacioBitacora
from .serializers import EspacioSerializer, DisponibilidadEspacioSerializer, EspacioBitacoraSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class EspacioViewSet(viewsets.ModelViewSet):
    queryset = Espacio.objects.filter(activo=True)
    serializer_class = EspacioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class DisponibilidadEspacioViewSet(viewsets.ModelViewSet):
    queryset = DisponibilidadEspacio.objects.all()
    serializer_class = DisponibilidadEspacioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class EspacioBitacoraViewSet(viewsets.ModelViewSet):
    queryset = EspacioBitacora.objects.all()
    serializer_class = EspacioBitacoraSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
