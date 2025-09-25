from rest_framework import viewsets
from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('-date_joined')
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
