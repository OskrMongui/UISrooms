-- UISrooms: Esquema de base de datos (nombres en español, PostgreSQL)
-- Archivo generado para soportar los endpoints proporcionados.
-- Incluye tablas principales: usuarios, roles, espacios, reservas, asignaciones, llaves,
-- incidencias, objetos perdidos, clases, asistencia, notificaciones, bitácora, incumplimientos.

-- 1) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- para exclusion constraints con gist

-- 2) Tipos enumerados (en español)
CREATE TYPE tipo_espacio AS ENUM ('auditorio','salon','laboratorio','taller','otro');
CREATE TYPE estado_reserva AS ENUM ('pendiente','aprobado','rechazado','cancelado','reagendado');
CREATE TYPE estado_llave AS ENUM ('disponible','prestada','perdida','mantenimiento');
CREATE TYPE tipo_notificacion AS ENUM ('agenda','reserva','sistema','incidencia');
CREATE TYPE estado_incidencia AS ENUM ('abierta','en_proceso','cerrada');
CREATE TYPE tipo_objeto_perdido AS ENUM ('documento','electronico','ropa','otro');

-- 3) Tabla roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Tabla usuarios (perfil general). Si la autenticación se integra con otro sistema,
-- se puede usar 'external_provider' y 'external_id' para enlazar.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(150) UNIQUE,
    email VARCHAR(254) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    telefono VARCHAR(30),
    departamento VARCHAR(100),
    cargo VARCHAR(100),
    rol_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    externo_provider VARCHAR(100), -- ejemplo: 'sso_escuela'
    externo_id VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Tabla espacios (salones, auditorios, laboratorios, etc.)
CREATE TABLE espacios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo tipo_espacio NOT NULL DEFAULT 'salon',
    capacidad INT,
    ubicacion TEXT, -- ej: Edificio A - Piso 2
    recursos JSONB DEFAULT '[]'::jsonb, -- lista de recursos: ['proyector','pizarra',...]
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_espacios_codigo ON espacios(codigo);

-- 6) Disponibilidad por espacio (horarios recurrentes o excepciones)
CREATE TABLE disponibilidad_espacio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    espacio_id UUID REFERENCES espacios(id) ON DELETE CASCADE,
    -- Si es recurrente por días de la semana: 0=lunes .. 6=domingo
    dia_semana SMALLINT, -- NULL si es una excepción por fecha
    hora_inicio TIME,
    hora_fin TIME,
    fecha_inicio DATE, -- para excepciones o ventanas temporales
    fecha_fin DATE,
    recurrente BOOLEAN DEFAULT true,
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disponibilidad_espacio_espacio ON disponibilidad_espacio(espacio_id);

-- 7) Reservas
CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    espacio_id UUID REFERENCES espacios(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    -- periodo es una columna de rango para facilitar comprobación de solapamiento
    periodo TSTZRANGE GENERATED ALWAYS AS (tstzrange(fecha_inicio, fecha_fin, '[)')) STORED,
    estado estado_reserva NOT NULL DEFAULT 'pendiente',
    motivo TEXT,
    cantidad_asistentes INT,
    requiere_llaves BOOLEAN DEFAULT false,
    recurrente BOOLEAN DEFAULT false,
    rrule TEXT, -- si la reserva es recurrente, guardar rrule (RFC 5545) o JSON
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Evitar solapamientos de reservas aprobadas/pendientes para el mismo espacio
-- (se excluyen reservas canceladas o rechazadas)
ALTER TABLE reservas
  ADD CONSTRAINT reservas_no_solapamiento
  EXCLUDE USING GIST (espacio_id WITH =, periodo WITH &&)
  WHERE (estado <> 'rechazado' AND estado <> 'cancelado');

CREATE INDEX idx_reservas_espacio_fecha ON reservas(espacio_id, fecha_inicio, fecha_fin);
CREATE INDEX idx_reservas_estado ON reservas(estado);

-- 8) Historial de cambios de estado de reservas (audit trail)
CREATE TABLE reservas_estado_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES reservas(id) ON DELETE CASCADE,
    estado_anterior estado_reserva,
    estado_nuevo estado_reserva,
    cambiado_por UUID REFERENCES usuarios(id),
    comentario TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9) Asignaciones (manuales o automáticas)
CREATE TABLE asignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES reservas(id) ON DELETE CASCADE,
    espacio_id UUID REFERENCES espacios(id) ON DELETE CASCADE,
    asignado_por UUID REFERENCES usuarios(id),
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    manual BOOLEAN DEFAULT false,
    nota TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_asignaciones_reserva ON asignaciones(reserva_id);

-- 10) Llaves y registros de préstamo/devolución
CREATE TABLE llaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE,
    espacio_id UUID REFERENCES espacios(id) ON DELETE CASCADE,
    responsable_id UUID REFERENCES usuarios(id),
    estado estado_llave NOT NULL DEFAULT 'disponible',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TYPE tipo_movimiento_llave AS ENUM ('registro','devolucion');

CREATE TABLE llaves_registro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    llave_id UUID REFERENCES llaves(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_movimiento tipo_movimiento_llave NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    observaciones TEXT
);

-- 11) Clases y cancelaciones
CREATE TABLE clases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    docente_id UUID REFERENCES usuarios(id),
    espacio_id UUID REFERENCES espacios(id),
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    recurrente BOOLEAN DEFAULT false,
    rrule TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clases_cancelacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
    reservado_por UUID REFERENCES usuarios(id),
    fecha_cancelacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    motivo TEXT,
    registrado_por UUID REFERENCES usuarios(id)
);

-- 12) Incidencias y respuestas
CREATE TABLE incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reportante_id UUID REFERENCES usuarios(id),
    espacio_id UUID REFERENCES espacios(id),
    tipo VARCHAR(100),
    descripcion TEXT,
    estado estado_incidencia NOT NULL DEFAULT 'abierta',
    fecha_reportada TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_cierre TIMESTAMPTZ,
    cerrado_por UUID REFERENCES usuarios(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE incidencias_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidencia_id UUID REFERENCES incidencias(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES usuarios(id),
    mensaje TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13) Objetos perdidos
CREATE TABLE objetos_perdidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descripcion TEXT,
    tipo tipo_objeto_perdido,
    espacio_id UUID REFERENCES espacios(id),
    encontrado_por UUID REFERENCES usuarios(id),
    fecha_encontrado TIMESTAMPTZ,
    estado VARCHAR(50) DEFAULT 'encontrado', -- 'encontrado','entregado'
    entregado_a UUID REFERENCES usuarios(id),
    fecha_entrega TIMESTAMPTZ,
    observaciones TEXT
);

-- 14) Asistencia y anomalías
CREATE TABLE asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    reserva_id UUID REFERENCES reservas(id),
    clase_id UUID REFERENCES clases(id),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    anomalia BOOLEAN DEFAULT false,
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15) Bitácora por espacio (registro de eventos físicos)
CREATE TABLE espacio_bitacora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    espacio_id UUID REFERENCES espacios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(150),
    detalle JSONB,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16) Incumplimientos (historial de violaciones de horario/reglas)
CREATE TABLE incumplimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    espacio_id UUID REFERENCES espacios(id),
    reserva_id UUID REFERENCES reservas(id),
    usuario_id UUID REFERENCES usuarios(id),
    tipo VARCHAR(100),
    descripcion TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    sancion JSONB
);

-- 17) Notificaciones (programadas y de reserva)
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo tipo_notificacion NOT NULL DEFAULT 'sistema',
    destinatario_id UUID REFERENCES usuarios(id),
    remitente_id UUID REFERENCES usuarios(id),
    mensaje TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    enviado BOOLEAN DEFAULT false,
    leido BOOLEAN DEFAULT false,
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_destinatario ON notificaciones(destinatario_id);

-- 18) Vistas útiles (ejemplos) para endpoints
-- Vista: espacios ocupados en una fecha/hora dada (usar en consultas parametrizadas)
CREATE VIEW vw_espacios_ocupados AS
SELECT r.espacio_id, e.codigo, e.nombre, r.id as reserva_id, r.usuario_id, r.fecha_inicio, r.fecha_fin, r.estado
FROM reservas r
JOIN espacios e ON e.id = r.espacio_id
WHERE r.estado = 'aprobado';

-- Vista: disponibilidad en tiempo real (se puede filtrar por espacio o por rango)
CREATE VIEW vw_disponibilidad_tiempo_real AS
SELECT e.id as espacio_id, e.codigo, e.nombre, e.capacidad,
       (CASE WHEN EXISTS(
           SELECT 1 FROM reservas r2
           WHERE r2.espacio_id = e.id
             AND r2.estado = 'aprobado'
             AND tstzrange(r2.fecha_inicio, r2.fecha_fin, '[)') && tstzrange(now(), now(), '[]')
       ) THEN false ELSE true END) as disponible_actual
FROM espacios e;

-- 19) Datos de ejemplo (roles)
INSERT INTO roles (id, nombre, descripcion)
VALUES
  (gen_random_uuid(), 'admin', 'Administrador del sistema con todos los permisos'),
  (gen_random_uuid(), 'coordinador', 'Coordina asignaciones y revisa reservas'),
  (gen_random_uuid(), 'conserje', 'Responsable de llaves y control físico'),
  (gen_random_uuid(), 'docente', 'Profesor o instructor'),
  (gen_random_uuid(), 'estudiante', 'Usuario estudiante');

-- 20) Recomendaciones de índices adicionales
CREATE INDEX idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX idx_reservas_periodo ON reservas(periodo);

-- 21) Permisos (ejemplo mínimo) - adaptar según despliegue y roles OS
-- CREATE USER uisrooms WITH PASSWORD 'cambiar_por_segura';
-- GRANT CONNECT ON DATABASE uisrooms_db TO uisrooms;

-- Fin del esquema inicial. Revisar y adaptar según reglas de negocio específicas.
-- NOTA: Para comprobar solapamientos por reglas más complejas (recurrentes, excepciones, llaves,etc.)
-- se recomienda implementar validaciones adicionales a nivel de aplicación (Django) y/o triggers.
