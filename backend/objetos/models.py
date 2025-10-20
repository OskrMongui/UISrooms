# objetos/models.py
import uuid
from django.db import models
from django.db import models

class TipoObjetoPerdido(models.TextChoices):
    DOCUMENTO = 'documento', 'Documento'
    ELECTRONICO = 'electronico', 'Electrónico'
    ROPA = 'ropa', 'Ropa'
    OTRO = 'otro', 'Otro'

class ObjetoPerdido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    descripcion = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=50, choices=TipoObjetoPerdido.choices, null=True, blank=True)
    espacio = models.ForeignKey('espacios.Espacio', on_delete=models.SET_NULL, null=True, blank=True)
    encontrado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    fecha_encontrado = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=50, default='encontrado')  # 'encontrado','entregado'
    entregado_a = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "objeto_perdido"
        verbose_name_plural = "objetos_perdidos"
