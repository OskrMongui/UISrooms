import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { getUserFromToken } from '../utils/auth';

const quickActions = [
  {
    title: 'Reservar un espacio',
    description: 'Consulta la disponibilidad y agenda un espacio para tu actividad.',
    to: '/reservations/create',
  },
  {
    title: 'Reportar incidencia',
    description: 'Notifica problemas en aulas o recursos para que el equipo pueda ayudarte.',
    to: '/incidencias/create',
  },
  {
    title: 'Solicitar llaves',
    description: 'Registra el préstamo de llaves y haz seguimiento a tus entregas.',
    to: '/llaves',
  },
];

const Home = () => {
  const [user, setUser] = useState(getUserFromToken());
  const [reservations, setReservations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const responses = await Promise.allSettled([
          api.get('usuarios/me/'),
          api.get('reservas/'),
          api.get('espacios/'),
          api.get('notificaciones/'),
        ]);

        const [userRes, reservationsRes, spacesRes, notificationsRes] = responses;

        if (userRes.status === 'fulfilled' && userRes.value?.data) {
          setUser(userRes.value.data);
        }

        if (reservationsRes.status === 'fulfilled' && Array.isArray(reservationsRes.value?.data)) {
          setReservations(reservationsRes.value.data);
        }

        if (spacesRes.status === 'fulfilled' && Array.isArray(spacesRes.value?.data)) {
          setSpaces(spacesRes.value.data);
        }

        if (notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value?.data)) {
          setNotifications(notificationsRes.value.data);
        }

        const hasRejections = responses.some((res) => res.status === 'rejected');
        if (hasRejections) {
          setError('No pudimos cargar toda la información. Algunos bloques muestran datos parciales.');
        }
      } catch (err) {
        setError('Ocurrió un problema cargando tu panel inicial.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const upcomingReservations = useMemo(() => {
    const now = new Date();
    return reservations
      .filter((reservation) => {
        if (!reservation.fecha_inicio || !reservation.fecha_fin) return false;
        const start = new Date(reservation.fecha_inicio);
        const end = new Date(reservation.fecha_fin);
        return end >= now;
      })
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      .slice(0, 3);
  }, [reservations]);

  const highlightedSpaces = useMemo(() => spaces.slice(0, 3), [spaces]);

  const recentNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

  const greetingName = useMemo(() => {
    if (!user) return '¡Bienvenido!';
    if (user.first_name) return `¡Hola, ${user.first_name}!`;
    if (user.username) return `¡Hola, ${user.username}!`;
    return '¡Bienvenido!';
  }, [user]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  return (
    <div className="home">
      {error && <div className="alert alert-warning">{error}</div>}

      <section className="home-hero rounded-4 p-4 p-md-5 mb-4 text-white">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h1 className="display-6 fw-semibold mb-2">{greetingName}</h1>
            <p className="lead mb-0">
              Aquí encontrarás un resumen rápido de tus reservas, avisos y accesos a las acciones más frecuentes.
            </p>
          </div>
          <div className="text-md-end">
            <p className="mb-1 text-uppercase small">Próxima acción sugerida</p>
            <Link to="/reservations/create" className="btn btn-light text-success fw-semibold">
              Nueva reserva
            </Link>
          </div>
        </div>
      </section>

      <div className="row gy-4">
        <div className="col-lg-8">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Próximas reservas</h2>
                <Link to="/reservations" className="btn btn-sm btn-outline-success">
                  Ver todas
                </Link>
              </div>
              {upcomingReservations.length === 0 ? (
                <div className="alert alert-info mb-0">
                  No tienes reservas próximas. Usa el botón &quot;Nueva reserva&quot; para agendar un espacio.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingReservations.map((reservation) => (
                    <div key={reservation.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                          <h3 className="h6 mb-1">{reservation.espacio?.nombre || 'Espacio sin nombre'}</h3>
                          <p className="mb-1 text-muted small">
                            {reservation.motivo || 'Reserva sin motivo registrado'}
                          </p>
                          <span className="badge bg-light text-success text-uppercase fw-semibold">
                            {reservation.estado}
                          </span>
                        </div>
                        <div className="text-md-end">
                          <p className="mb-1 small text-muted">
                            Inicio: {reservation.fecha_inicio ? new Date(reservation.fecha_inicio).toLocaleString() : '-'}
                          </p>
                          <p className="mb-0 small text-muted">
                            Fin: {reservation.fecha_fin ? new Date(reservation.fecha_fin).toLocaleString() : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Accesos rápidos</h2>
              <div className="list-group list-group-flush">
                {quickActions.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="list-group-item list-group-item-action rounded-3 border mb-2"
                  >
                    <h3 className="h6 mb-1 text-success">{action.title}</h3>
                    <p className="mb-0 small text-muted">{action.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Espacios destacados</h2>
                <Link to="/spaces" className="btn btn-sm btn-outline-success">
                  Ver espacios
                </Link>
              </div>
              {highlightedSpaces.length === 0 ? (
                <div className="alert alert-info mb-0">Aún no hay espacios registrados.</div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {highlightedSpaces.map((space) => (
                    <li key={space.id} className="mb-3">
                      <h3 className="h6 mb-1">{space.nombre}</h3>
                      <p className="mb-1 small text-muted">{space.descripcion || 'Espacio sin descripción'}</p>
                      {typeof space.capacidad !== 'undefined' && (
                        <span className="badge bg-light text-success">
                          Capacidad: {space.capacidad}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Avisos recientes</h2>
                <Link to="/notificaciones" className="btn btn-sm btn-outline-success">
                  Ver avisos
                </Link>
              </div>
              {recentNotifications.length === 0 ? (
                <div className="alert alert-info mb-0">
                  No tienes avisos nuevos. Te avisaremos si surge algo importante.
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {recentNotifications.map((notification) => (
                    <li key={notification.id} className="mb-3">
                      <h3 className="h6 mb-1 text-capitalize">{notification.tipo || 'Aviso'}</h3>
                      <p className="mb-1 small text-muted">
                        {notification.mensaje || 'Sin detalles adicionales.'}
                      </p>
                      <div className="d-flex gap-2 flex-wrap">
                        {notification.creado_en && (
                          <span className="badge bg-light text-success">
                            {new Date(notification.creado_en).toLocaleString()}
                          </span>
                        )}
                        {notification.leido === false && (
                          <span className="badge bg-success-subtle text-success fw-semibold">
                            Nuevo
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
