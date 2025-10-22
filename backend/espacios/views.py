from rest_framework import viewsets
from .models import Espacio, DisponibilidadEspacio
from .serializers import EspacioSerializer, DisponibilidadEspacioSerializer
from .permissions import IsAdminUser

BOOLEAN_FALSE_VALUES = {'false', '0', 'no', 'off'}
BOOLEAN_TRUE_VALUES = {'true', '1', 'yes', 'on'}

class EspacioViewSet(viewsets.ModelViewSet):
    serializer_class = EspacioSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = Espacio.objects.all()
        if self.action == 'list':
            include_param = self.request.query_params.get('incluir_inactivos')
            include_inactive = isinstance(include_param, str) and include_param.strip().lower() in BOOLEAN_TRUE_VALUES
            if not include_inactive:
                queryset = queryset.filter(activo=True)
        return queryset

class DisponibilidadEspacioViewSet(viewsets.ModelViewSet):
    serializer_class = DisponibilidadEspacioSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = DisponibilidadEspacio.objects.all()
        espacio_id = self.request.query_params.get('espacio')
        if espacio_id:
            queryset = queryset.filter(espacio_id=espacio_id)

        bloqueo_param = self.request.query_params.get('bloqueo')
        if bloqueo_param is not None:
            value = bloqueo_param.strip().lower()
            if value in BOOLEAN_TRUE_VALUES:
                queryset = queryset.filter(es_bloqueo=True)
            elif value in BOOLEAN_FALSE_VALUES:
                queryset = queryset.filter(es_bloqueo=False)

        return queryset.order_by('dia_semana', 'fecha_inicio', 'hora_inicio')

    def perform_create(self, serializer):
        es_bloqueo = serializer.validated_data.get('es_bloqueo')
        if es_bloqueo is None:
            es_bloqueo = True
        serializer.save(es_bloqueo=es_bloqueo)
