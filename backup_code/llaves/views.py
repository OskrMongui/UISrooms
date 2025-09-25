from rest_framework import viewsets
from .models import Llave, LlaveRegistro
from .serializers import LlaveSerializer, LlaveRegistroSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class LlaveViewSet(viewsets.ModelViewSet):
    queryset = Llave.objects.all()
    serializer_class = LlaveSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class LlaveRegistroViewSet(viewsets.ModelViewSet):
    queryset = LlaveRegistro.objects.all().order_by('-fecha')
    serializer_class = LlaveRegistroSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
