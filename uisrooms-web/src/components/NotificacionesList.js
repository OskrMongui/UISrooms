import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const NotificacionesList = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const response = await api.get('notificaciones/');
        setNotificaciones(response.data);
      } catch (err) {
        setError('Error al cargar notificaciones');
      } finally {
        setLoading(false);
      }
    };
    fetchNotificaciones();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Notificaciones</h1>
      <Link to="/notificaciones/create" className="btn btn-success mb-3">Crear Notificación</Link>
      {notificaciones.length === 0 ? (
        <div className="alert alert-info">No hay notificaciones</div>
      ) : (
        <div className="row">
          {notificaciones.map((notif) => (
            <div key={notif.id} className="col-md-6 mb-4">
              <div className={`card ${notif.leido ? '' : 'border-primary'}`}>
                <div className="card-body">
                  <h5 className="card-title">{notif.tipo}</h5>
                  <p className="card-text">{notif.mensaje}</p>
                  <p className="text-muted">
                    <strong>Destinatario:</strong> {notif.destinatario.first_name} {notif.destinatario.last_name}<br />
                    <strong>Remitente:</strong> {notif.remitente ? `${notif.remitente.first_name} ${notif.remitente.last_name}` : 'Sistema'}<br />
                    <strong>Enviado:</strong> {notif.enviado ? 'Sí' : 'No'}<br />
                    <strong>Leído:</strong> {notif.leido ? 'Sí' : 'No'}<br />
                    <strong>Creado:</strong> {new Date(notif.creado_en).toLocaleString()}
                  </p>
                  <Link to={`/notificaciones/${notif.id}/edit`} className="btn btn-primary">Editar</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificacionesList;
