import React, { useEffect, useState } from 'react';
import api from '../api';
import { canApproveReservations, getUserRole } from '../utils/auth';

const formatDateTime = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString();
};

const ReservationApprovals = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const role = getUserRole();
  const canManage = canApproveReservations();

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    const fetchReservations = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('reservas/?estado=pendiente');
        setReservations(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('No fue posible cargar las solicitudes pendientes.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [canManage]);

  const applyAction = async (reservationId, action) => {
    setActionLoading(true);
    setFeedback('');
    setError('');
    try {
      let comentario = '';
      if (action === 'rechazar') {
        const userComment = window.prompt('Ingresa un comentario (opcional) para el solicitante:');
        if (userComment === null) {
          setActionLoading(false);
          return;
        }
        comentario = userComment;
      }
      await api.post(`reservas/${reservationId}/${action}/`, { comentario });
      setReservations((prev) => prev.filter((item) => item.id !== reservationId));
      setFeedback(action === 'aprobar' ? 'Reserva aprobada correctamente.' : 'Reserva rechazada.');
      setSelectedReservation((prev) => (prev?.id === reservationId ? null : prev));
    } catch (err) {
      const serverMsg = err.response?.data;
      const readable =
        typeof serverMsg === 'string'
          ? serverMsg
          : serverMsg?.detail || 'No fue posible completar la accion.';
      setError(readable);
    } finally {
      setActionLoading(false);
    }
  };

  const closeDetail = () => setSelectedReservation(null);

  if (!canManage) {
    return (
      <div className="alert alert-info">
        Tu rol actual ({role || 'sin rol definido'}) no tiene permisos para aprobar o rechazar reservas.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="mt-3 text-muted">Cargando solicitudes pendientes...</p>
      </div>
    );
  }

  return (
    <div className="reservation-approvals">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h1 className="mb-1">Solicitudes de reserva</h1>
          <p className="text-muted mb-0">Aprueba o rechaza las solicitudes pendientes para los espacios a tu cargo.</p>
        </div>
      </div>

      {feedback && <div className="alert alert-success">{feedback}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {reservations.length === 0 ? (
        <div className="alert alert-info">No hay solicitudes pendientes.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Espacio</th>
                <th>Solicitante</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>
                    <div className="fw-semibold">{reservation.espacio_detalle?.nombre || reservation.espacio}</div>
                    <div className="text-muted small text-capitalize">
                      {reservation.espacio_detalle?.tipo}
                    </div>
                  </td>
                  <td>
                    <div>{reservation.usuario_detalle?.nombre || 'Sin asignar'}</div>
                    <div className="text-muted small">{reservation.usuario_detalle?.email}</div>
                  </td>
                  <td>{formatDateTime(reservation.fecha_inicio)}</td>
                  <td>{formatDateTime(reservation.fecha_fin)}</td>
                  <td className="text-muted">{reservation.motivo || 'Sin motivo'}</td>
                  <td className="text-end">
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        disabled={actionLoading}
                        onClick={() => applyAction(reservation.id, 'aprobar')}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={actionLoading}
                        onClick={() => applyAction(reservation.id, 'rechazar')}
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReservation && (
        <>
          <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Detalle de solicitud</h5>
                  <button type="button" className="btn-close" onClick={closeDetail} aria-label="Cerrar"></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-1">Espacio</h6>
                      <p className="mb-0">
                        {selectedReservation.espacio_detalle?.nombre || 'Sin nombre'}
                      </p>
                      <p className="text-muted small mb-0">
                        ID {selectedReservation.espacio_detalle?.id || selectedReservation.espacio} | Tipo {selectedReservation.espacio_detalle?.tipo || 'N/D'}
                      </p>
                      <p className="text-muted small mb-0">
                        Ubicacion {selectedReservation.espacio_detalle?.ubicacion_display || selectedReservation.espacio_detalle?.ubicacion || 'Sin especificar'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-1">Solicitante</h6>
                      <p className="mb-0">{selectedReservation.usuario_detalle?.nombre || 'Sin asignar'}</p>
                      <p className="text-muted small mb-0">{selectedReservation.usuario_detalle?.email || 'Sin correo'}</p>
                      <p className="text-muted small mb-0">Rol {selectedReservation.usuario_detalle?.rol || 'No disponible'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-1">Programacion</h6>
                      <p className="mb-0"><strong>Inicio:</strong> {formatDateTime(selectedReservation.fecha_inicio)}</p>
                      <p className="mb-0"><strong>Fin:</strong> {formatDateTime(selectedReservation.fecha_fin)}</p>
                      <p className="mb-0"><strong>Creada:</strong> {formatDateTime(selectedReservation.creado_en)}</p>
                      <p className="mb-0"><strong>Actualizada:</strong> {formatDateTime(selectedReservation.actualizado_en)}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-1">Detalles adicionales</h6>
                      <p className="mb-0"><strong>Asistentes:</strong> {selectedReservation.cantidad_asistentes ?? 'N/D'}</p>
                      <p className="mb-0"><strong>Llaves:</strong> {selectedReservation.requiere_llaves ? 'Si' : 'No'}</p>
                      <p className="mb-0">
                        <strong>Recurrente:</strong> {selectedReservation.recurrente ? 'Si' : 'No'}
                      </p>
                      {selectedReservation.recurrente && (
                        <p className="mb-0">
                          <strong>Semestre:</strong> {formatDate(selectedReservation.semestre_inicio)} - {formatDate(selectedReservation.semestre_fin)}
                        </p>
                      )}
                    </div>
                    <div className="col-12">
                      <h6 className="fw-semibold mb-1">Motivo</h6>
                      <p className="text-muted mb-0">{selectedReservation.motivo || 'Sin motivo suministrado.'}</p>
                    </div>
                    {selectedReservation.metadata?.recurrencia && (
                      <div className="col-12">
                        <h6 className="fw-semibold mb-1">Recurrencia</h6>
                        <div className="alert alert-light border mb-0 small">
                          {Object.entries(selectedReservation.metadata.recurrencia).map(([key, value]) => (
                            <div key={key}><strong>{key}:</strong> {String(value)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <div className="me-auto text-muted small">
                    Estado actual: {selectedReservation.estado_display || selectedReservation.estado}
                  </div>
                  <button type="button" className="btn btn-outline-secondary" onClick={closeDetail}>
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    disabled={actionLoading}
                    onClick={() => applyAction(selectedReservation.id, 'rechazar')}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={actionLoading}
                    onClick={() => applyAction(selectedReservation.id, 'aprobar')}
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
};

export default ReservationApprovals;
