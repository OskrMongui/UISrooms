from rest_framework import viewsets
from .models import Llave
from .serializers import LlaveSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class LlaveViewSet(viewsets.ModelViewSet):
    queryset = Llave.objects.all()
    serializer_class = LlaveSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

