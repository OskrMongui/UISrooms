-- UISrooms: esquema de base de datos reducido a las tablas activas.
-- Este archivo cubre únicamente las entidades de negocio utilizadas por las apps Django.
-- Las tablas internas de Django (auth, sessions, etc.) se generan mediante migraciones y no se incluyen aquí.

-- 1) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- UUIDs
CREATE EXTENSION IF NOT EXISTS btree_gist;    -- índices/constraints GIST para rangos

-- 2) Tipos enumerados (valores vigentes en el código)
CREATE TYPE tipo_espacio AS ENUM ('aula','laboratorio','sala');
CREATE TYPE ubicacion_espacio AS ENUM ('primer_piso','segundo_piso','tercer_piso');
CREATE TYPE estado_reserva AS ENUM ('pendiente','aprobado','rechazado');
CREATE TYPE estado_llave AS ENUM ('disponible','prestada','perdida','mantenimiento');
CREATE TYPE estado_incidencia AS ENUM ('abierta','en_proceso','cerrada');
CREATE TYPE tipo_notificacion AS ENUM ('agenda','reserva','sistema','incidencia');
CREATE TYPE tipo_objeto_perdido AS ENUM ('documento','electronico','ropa','otro');
CREATE TYPE estado_asistencia AS ENUM ('presente','tarde','ausente');
CREATE TYPE motivo_cierre AS ENUM ('fin_clase','ausencia','instruccion');

-- 3) Tabla de roles (usuarios.Rol)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Usuarios (usuarios.Usuario basado en AbstractUser)
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT now(),
    telefono VARCHAR(30) NOT NULL DEFAULT '',
    departamento VARCHAR(100) NOT NULL DEFAULT '',
    cargo VARCHAR(100) NOT NULL DEFAULT '',
    rol_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    externo_provider VARCHAR(100),
    externo_id VARCHAR(255),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Espacios
CREATE TABLE espacios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo tipo_espacio NOT NULL DEFAULT 'aula',
    capacidad INT,
    ubicacion ubicacion_espacio NOT NULL DEFAULT 'primer_piso',
    recursos TEXT[] NOT NULL DEFAULT '{}'::text[],
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_espacios_codigo ON espacios(codigo);

-- 6) Disponibilidad por espacio
CREATE TABLE disponibilidad_espacio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    espacio_id UUID NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    dia_semana SMALLINT,
    hora_inicio TIME,
    hora_fin TIME,
    fecha_inicio DATE,
    fecha_fin DATE,
    recurrente BOOLEAN NOT NULL DEFAULT true,
    observaciones TEXT,
    es_bloqueo BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disponibilidad_espacio_espacio ON disponibilidad_espacio(espacio_id);

-- 7) Reservas
CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    espacio_id UUID NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    periodo TSTZRANGE,
    estado estado_reserva NOT NULL DEFAULT 'pendiente',
    motivo TEXT,
    cantidad_asistentes INT,
    requiere_llaves BOOLEAN NOT NULL DEFAULT false,
    recurrente BOOLEAN NOT NULL DEFAULT false,
    semestre_inicio DATE,
    semestre_fin DATE,
    rrule TEXT,
    creado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_reservas_espacio_fecha ON reservas(espacio_id, fecha_inicio, fecha_fin);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_periodo ON reservas USING GIST (periodo);

ALTER TABLE reservas
  ADD CONSTRAINT reservas_no_solapamiento
  EXCLUDE USING GIST (espacio_id WITH =, periodo WITH &&)
  WHERE (estado = 'aprobado');

-- 8) Historial de estados de reserva
CREATE TABLE reservas_estado_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    estado_anterior estado_reserva,
    estado_nuevo estado_reserva NOT NULL,
    cambiado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    comentario TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9) Registros de apertura/cierre
CREATE TABLE registro_apertura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    espacio_id UUID NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    registrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_programada TIMESTAMPTZ NOT NULL,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    completado BOOLEAN NOT NULL DEFAULT false,
    completado_en TIMESTAMPTZ,
    asistencia_estado estado_asistencia,
    asistencia_registrada_en TIMESTAMPTZ,
    hora_llegada_real TIMESTAMPTZ,
    ausencia_notificada BOOLEAN NOT NULL DEFAULT false,
    cierre_registrado BOOLEAN NOT NULL DEFAULT false,
    cierre_registrado_en TIMESTAMPTZ,
    cierre_registrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    cierre_motivo motivo_cierre,
    cierre_observaciones TEXT,
    observaciones TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE registro_apertura
  ADD CONSTRAINT registro_apertura_unico_reserva_fecha
  UNIQUE (reserva_id, fecha_programada);

-- 10) Llaves
CREATE TABLE llaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE,
    espacio_id UUID NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    responsable_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado estado_llave NOT NULL DEFAULT 'disponible',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 11) Incidencias
CREATE TABLE incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reportante_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    espacio_id UUID REFERENCES espacios(id) ON DELETE SET NULL,
    tipo VARCHAR(100),
    descripcion TEXT,
    estado estado_incidencia NOT NULL DEFAULT 'abierta',
    fecha_reportada TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_cierre TIMESTAMPTZ,
    cerrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE incidencias_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    autor_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12) Objetos perdidos
CREATE TABLE objetos_perdidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descripcion TEXT,
    tipo tipo_objeto_perdido,
    espacio_id UUID REFERENCES espacios(id) ON DELETE SET NULL,
    encontrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_encontrado TIMESTAMPTZ,
    estado VARCHAR(50) NOT NULL DEFAULT 'encontrado',
    entregado_a BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_entrega TIMESTAMPTZ,
    observaciones TEXT
);

-- 13) Notificaciones
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo tipo_notificacion NOT NULL DEFAULT 'sistema',
    destinatario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    remitente_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    mensaje TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    enviado BOOLEAN NOT NULL DEFAULT false,
    leido BOOLEAN NOT NULL DEFAULT false,
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notificaciones_destinatario ON notificaciones(destinatario_id);

-- Fin del esquema reducido.
