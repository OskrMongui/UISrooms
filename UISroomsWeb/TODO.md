# TODO - Frontend Web UISrooms (React + Bootstrap)

## Fase 1: Configuración Básica y Autenticación (Prioridad Alta)
- [x] Crear estructura del proyecto React con Create React App
- [x] Instalar dependencias (Axios para API, React Router para navegación, Bootstrap para UI)
- [x] Configurar tema de colores: Gris (#6c757d, #f8f9fa), Blanco (#ffffff), Verde (#28a745)
- [x] Implementar componente Login: Formulario para obtener JWT token del backend (/api/token/)
- [x] Guardar token en localStorage y agregar interceptor Axios para auth en requests
- [x] Probar login y verificar token en llamadas protegidas

## Fase 2: Gestión de Espacios y Horarios (Próxima)
- [x] Componente SpacesList: Lista de espacios (/api/espacios/) con tarjetas Bootstrap
- [x] Componente SpaceDetail: Ver detalles y horarios (/api/espacios-disponibilidad/?espacio=ID)
- [x] Navegación con React Router: Rutas para home, login, espacios, detalle de espacio
- [x] Manejar estados de carga, errores y datos vacíos con spinners y alerts de Bootstrap

## Fase 3: Funcionalidades Adicionales
- [x] Reservas: Lista y crear reservas (/api/reservas/)
- [x] Usuarios y Roles: Perfil, roles para filtrar vistas
- [x] Incidencias, Llaves, Objetos, Notificaciones: Pantallas CRUD básicas
- [ ] Responsive design con Bootstrap para móvil/desktop

## Notas Generales
- Backend URL: http://localhost:8000/api/
- Probar con npm start (corre en http://localhost:3000)
- Asegurar CORS en backend si hay issues (agregar django-cors-headers si necesario)
