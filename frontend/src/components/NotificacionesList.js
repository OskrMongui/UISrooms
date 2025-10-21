import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const NotificacionesList = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotificaciones = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await api.get('notificaciones/');
        setNotificaciones(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar notificaciones.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotificaciones();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="notifications container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Centro de avisos</p>
            <h1 className="mb-2">Mantente al dia con las notificaciones</h1>
            <p className="mb-0">
              Publica comunicados para la comunidad y revisa su estado de envio y lectura en un solo lugar.
            </p>
          </div>
          <div>
            <Link to="/notificaciones/create" className="btn btn-light text-success fw-semibold">
              Crear notificacion
            </Link>
          </div>
        </div>
      </div>

      {notificaciones.length === 0 ? (
        <div className="card-elevated p-4 bg-white text-center">
          <h4 className="mb-1">Sin notificaciones</h4>
          <p className="text-muted small mb-0">
            Cuando publiques un nuevo aviso aparecera aqui para su seguimiento.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {notificaciones.map((notif) => {
            const destinatario = notif.destinatario || {};
            const remitente = notif.remitente || {};
            return (
              <div key={notif.id} className="col-lg-6">
                <div className="card-elevated h-100 p-4 bg-white d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h5 className="mb-1">{notif.tipo || 'Notificacion'}</h5>
                      <span
                        className={`status-chip ${
                          notif.leido ? 'status-chip--success' : 'status-chip--warning'
                        }`}
                      >
                        {notif.leido ? 'Leido' : 'Pendiente'}
                      </span>
                    </div>
                    <Link to={`/notificaciones/${notif.id}/edit`} className="btn btn-sm btn-outline-success">
                      Editar
                    </Link>
                  </div>
                  <p className="text-muted mb-0">{notif.mensaje || 'Sin mensaje registrado.'}</p>
                  <div className="reservation-card__meta">
                    <div className="d-flex flex-column small">
                      <span>
                        <strong>Destinatario:</strong>{' '}
                        {`${destinatario.first_name || ''} ${destinatario.last_name || ''}`.trim() || 'Sin asignar'}
                      </span>
                      <span>
                        <strong>Remitente:</strong>{' '}
                        {remitente.first_name ? `${remitente.first_name} ${remitente.last_name || ''}` : 'Sistema'}
                      </span>
                      <span>
                        <strong>Enviada:</strong> {notif.enviado ? 'Si' : 'No'}
                      </span>
                      <span>
                        <strong>Creada:</strong>{' '}
                        {notif.creado_en ? new Date(notif.creado_en).toLocaleString() : 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificacionesList;
