from rest_framework import viewsets
from .models import ObjetoPerdido
from .serializers import ObjetoPerdidoSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class ObjetoPerdidoViewSet(viewsets.ModelViewSet):
    queryset = ObjetoPerdido.objects.all().order_by('-fecha_encontrado')
    serializer_class = ObjetoPerdidoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated:
            serializer.save(encontrado_por=user)
