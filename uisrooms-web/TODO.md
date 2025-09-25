# TODO - Completar Frontend Web UISrooms

## Paso 1: Configurar Autenticación Automática
- [x] Crear archivo api.js para configurar Axios con interceptor de auth
- [x] Modificar App.js para importar y usar la configuración de Axios
- [x] Proteger componentes que requieren auth (redirect to login si no hay token)

## Paso 2: Implementar Reservas
- [x] Crear componente ReservationsList.js para listar reservas del usuario
- [x] Crear componente ReservationCreate.js para crear nueva reserva
- [x] Agregar rutas en App.js para /reservations y /reservations/create
- [x] Actualizar Navbar.js para incluir enlace a Reservas

## Paso 3: Perfil de Usuario
- [x] Crear componente Profile.js para mostrar info del usuario
- [x] Agregar ruta /profile en App.js
- [x] Actualizar Navbar.js para incluir enlace a Perfil

## Paso 4: CRUD para Incidencias
- [x] Crear componentes IncidenciasList.js, IncidenciaCreate.js, IncidenciaEdit.js
- [x] Agregar rutas en App.js
- [x] Actualizar Navbar.js

## Paso 5: CRUD para Llaves
- [x] Crear componentes LlavesList.js, LlaveCreate.js, LlaveEdit.js
- [x] Agregar rutas
- [x] Actualizar Navbar

## Paso 6: CRUD para Objetos
- [x] Crear componentes ObjetosList.js, ObjetoCreate.js, ObjetoEdit.js
- [x] Agregar rutas
- [x] Actualizar Navbar

## Paso 7: CRUD para Notificaciones
- [x] Crear componentes NotificacionesList.js, NotificacionCreate.js, NotificacionEdit.js
- [x] Agregar rutas
- [x] Actualizar Navbar

## Paso 8: Mejorar Diseño Responsivo
- [x] Revisar y ajustar clases Bootstrap en todos los componentes para móvil/desktop
- [x] Probar en diferentes tamaños de pantalla

## Paso 9: Pruebas y Finalización
- [x] Ejecutar npm start y probar todas las funcionalidades
- [ ] Verificar CORS si hay errores
- [x] Actualizar TODO.md original en UISroomsWeb/
