from rest_framework import viewsets
from .models import Notificacion
from .serializers import NotificacionSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all().order_by('-creado_en')
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Notificacion.objects.filter(destinatario=user).order_by('-creado_en')
        return Notificacion.objects.none()
