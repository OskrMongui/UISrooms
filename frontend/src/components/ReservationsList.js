 import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const STATUS_VARIANTS = {
  pendiente: 'warning',
  aprobado: 'success',
  rechazado: 'danger',
  cancelado: 'secondary',
  reagendado: 'info',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
};

const formatDateTime = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const ReservationCard = ({ reservation, onDelete, deletingId }) => {
  const status = String(reservation.estado || '').toLowerCase();
  const statusVariant = STATUS_VARIANTS[status] || 'secondary';
  const statusLabel = reservation.estado_display || STATUS_LABELS[status] || reservation.estado || 'N/D';
  const space = reservation.espacio_detalle;
  const start = new Date(reservation.fecha_inicio);
  const end = new Date(reservation.fecha_fin);
  const isPast = end.getTime() < Date.now();
  const isUpcoming = start.getTime() >= Date.now();

  return (
    <div className="card reservation-card h-100 border-0 shadow-sm">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="card-title mb-1">{space?.nombre || `Espacio ${reservation.espacio}`}</h5>
            <div className="text-muted small">
              {space?.tipo || 'Tipo no disponible'} | {space?.ubicacion_display || space?.ubicacion || 'Ubicacion sin definir'}
            </div>
          </div>
          <span className={`badge text-bg-${statusVariant} text-uppercase small fw-semibold`}>
            {statusLabel}
          </span>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <span className="fw-semibold">Inicio</span>
            <span>{formatDateTime(reservation.fecha_inicio)}</span>
          </div>
          <div className="d-flex align-items-center justify-content-between">
            <span className="fw-semibold">Fin</span>
            <span>{formatDateTime(reservation.fecha_fin)}</span>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-muted small mb-2">
            {reservation.motivo || 'Sin motivo registrado.'}
          </p>
          <div className="d-flex flex-wrap gap-2 small">
            {reservation.cantidad_asistentes ? (
              <span className="badge text-bg-light border">
                {reservation.cantidad_asistentes} asistentes
              </span>
            ) : null}
            {reservation.requiere_llaves ? (
              <span className="badge text-bg-light border">Requiere llaves</span>
            ) : null}
            {reservation.recurrente ? (
              <span className="badge text-bg-light border">
                Recurrente | {reservation.semestre_inicio || '--'} - {reservation.semestre_fin || '--'}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-3">
          <div className="d-flex justify-content-between align-items-center text-muted small">
            <span>{isUpcoming ? 'Reserva proxima' : isPast ? 'Reserva pasada' : 'Reserva en curso'}</span>
            <span>Solicitada: {formatDateTime(reservation.creado_en)}</span>
          </div>
          {onDelete ? (
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onDelete(reservation.id)}
                disabled={deletingId === reservation.id}
              >
                {deletingId === reservation.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ReservationsList = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await api.get('reservas/');
        setReservations(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar tus reservas.');
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, []);

  const handleDelete = async (reservationId) => {
    if (!reservationId) {
      return;
    }

    const confirmed = window.confirm('¿Deseas eliminar esta reserva? Esta accion no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    setActionError('');
    setActionMessage('');
    setDeletingId(reservationId);

    try {
      await api.delete(`reservas/${reservationId}/`);
      setReservations((prev) => prev.filter((reservation) => String(reservation.id) !== String(reservationId)));
      setActionMessage('Reserva eliminada correctamente.');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data ||
        'No se pudo eliminar la reserva.';
      setActionError(typeof detail === 'string' ? detail : 'No se pudo eliminar la reserva.');
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = reservations.length;
    const byStatus = reservations.reduce((acc, reservation) => {
      const status = String(reservation.estado || '').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const nextReservation = [...reservations]
      .filter((reservation) => new Date(reservation.fecha_inicio).getTime() >= Date.now())
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))[0];

    return {
      total,
      pending: byStatus.pendiente || 0,
      approved: byStatus.aprobado || 0,
      next: nextReservation,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return reservations
      .filter((reservation) => {
        const status = String(reservation.estado || '').toLowerCase();
        if (statusFilter !== 'todos' && status !== statusFilter) {
          return false;
        }

        if (!term) return true;

        const haystack = [
          reservation.espacio_detalle?.nombre,
          reservation.espacio_detalle?.codigo,
          reservation.motivo,
          reservation.estado_display,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
  }, [reservations, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="text-muted mt-3">Cargando tus reservas...</p>
      </div>
    );
  }

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="reservations-view">
      <div className="hero-card mb-4 p-4 border-0 rounded-3 shadow-sm bg-success-subtle">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <h1 className="mb-1">Mis reservas</h1>
            <p className="text-muted mb-0">
              Revisa el estado de tus solicitudes, identifica las proximas y encuentra rapidamente lo que necesitas.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/spaces" className="btn btn-outline-success">
              Explorar espacios
            </Link>
            <Link to="/reservations/create" className="btn btn-success">
              Nueva reserva
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Total de solicitudes</p>
              <div className="display-6">{stats.total}</div>
              <p className="small text-muted mb-0">
                {stats.pending} pendientes | {stats.approved} aprobadas
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Proxima reserva</p>
              {stats.next ? (
                <>
                  <div className="fw-semibold">{stats.next.espacio_detalle?.nombre || 'Espacio sin nombre'}</div>
                  <p className="small text-muted mb-0">
                    {formatDateTime(stats.next.fecha_inicio)}
                  </p>
                </>
              ) : (
                <p className="text-muted small mb-0">No tienes reservas proximas.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Buscar</p>
              <input
                type="search"
                className="form-control"
                placeholder="Espacio, estado o motivo"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {actionMessage ? <div className="alert alert-success">{actionMessage}</div> : null}
      {actionError ? <div className="alert alert-danger">{actionError}</div> : null}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted small fw-semibold text-uppercase">Filtrar por estado:</span>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-sm btn-outline-success ${statusFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setStatusFilter('todos')}
              >
                Todos
              </button>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-sm btn-outline-success ${statusFilter === value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {searchTerm && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary ms-auto"
                onClick={() => setSearchTerm('')}
              >
                Limpiar busqueda
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="alert alert-light border text-center py-5">
          <h4 className="mb-2">No encontramos reservas</h4>
          <p className="text-muted mb-3">
            Ajusta los filtros o crea una nueva solicitud para el espacio que necesitas.
          </p>
          <Link to="/reservations/create" className="btn btn-success">
            Crear una reserva
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {filteredReservations.map((reservation) => (
            <div key={reservation.id} className="col-xl-4 col-lg-6">
              <ReservationCard
                reservation={reservation}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReservationsList;


