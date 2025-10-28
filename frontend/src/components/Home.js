import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { getUserFromToken } from '../utils/auth';

const quickActions = [
  {
    title: 'Nueva reserva',
    description: 'Explora los espacios y elige el que necesitas.',
    to: '/spaces',
    badge: 'Reservas',
  },
  {
    title: 'Mis reservas',
    description: 'Revisa estados y gestiona solicitudes vigentes.',
    to: '/reservations',
    badge: 'Seguimiento',
  },
  {
    title: 'Reportar incidencia',
    description: 'Notifica problemas en aulas o recursos para que el equipo pueda ayudarte.',
    to: '/incidencias/create',
    badge: 'Soporte',
  },
  {
    title: 'Prestamo de llaves',
    description: 'Registra prestamos y devoluciones sin perder el control.',
    to: '/llaves',
    badge: 'Accesos',
  },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString();
};

const Home = () => {
  const [user, setUser] = useState(getUserFromToken());
  const [reservations, setReservations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userRole = useMemo(
    () => (user?.rol?.nombre ? user.rol.nombre.toLowerCase() : ''),
    [user]
  );

  const quickActionsList = useMemo(() => {
    const base = quickActions.slice();
    if (userRole === 'conserje') {
      base.unshift({
        title: 'Aperturas realizadas',
        description: 'Revisa aperturas completadas y registra cierres pendientes.',
        to: '/aperturas/verificacion',
        badge: 'Conserjeria',
      });
      base.unshift({
        title: 'Aperturas del dia',
        description: 'Confirma aperturas programadas y registra asistencia.',
        to: '/aperturas',
        badge: 'Conserjeria',
      });
    }
    return base;
  }, [userRole]);

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
          setError('No pudimos cargar toda la informacion. Algunos bloques muestran datos parciales.');
        }
      } catch (err) {
        setError('Ocurrio un problema cargando tu panel inicial.');
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
        const startDate = new Date(reservation.fecha_inicio);
        const end = new Date(reservation.fecha_fin);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(end.getTime())) {
          return false;
        }
        return end >= now;
      })
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      .slice(0, 3);
  }, [reservations]);

  const highlightedSpaces = useMemo(() => spaces.slice(0, 3), [spaces]);

  const recentNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

  const statsCards = useMemo(() => {
    const upcomingCount = upcomingReservations.length;
    const pendingCount = reservations.filter(
      (reservation) => reservation.estado && /pendiente/i.test(reservation.estado)
    ).length;
    const uniqueSpacesUsed = new Set(
      reservations.map((reservation) => reservation.espacio?.id).filter(Boolean)
    ).size;
    const unreadCount = notifications.filter((notification) => notification.leido === false).length;

    return [
      {
        label: 'Reservas futuras',
        value: upcomingCount.toLocaleString(),
        detail: pendingCount > 0 ? `${pendingCount} pendientes` : 'Sin pendientes',
      },
      {
        label: 'Espacios disponibles',
        value: spaces.length.toLocaleString(),
        detail: uniqueSpacesUsed > 0 ? `${uniqueSpacesUsed} usados recientemente` : 'Explora las opciones',
      },
      {
        label: 'Avisos sin leer',
        value: unreadCount.toLocaleString(),
        detail: `${notifications.length.toLocaleString()} en total`,
      },
      {
        label: 'Reservas registradas',
        value: reservations.length.toLocaleString(),
        detail: 'Historico dentro de la plataforma',
      },
    ];
  }, [upcomingReservations, reservations, spaces, notifications]);

  const greetingName = useMemo(() => {
    if (!user) return 'Hola, bienvenido';
    if (user.first_name) return `Hola, ${user.first_name}`;
    if (user.username) return `Hola, ${user.username}`;
    return 'Hola, bienvenido';
  }, [user]);

  const latestReservation = useMemo(() => {
    if (!Array.isArray(reservations) || reservations.length === 0) {
      return null;
    }

    const pendingReservations = reservations.filter((reservation) =>
      reservation.estado ? /pendiente/i.test(reservation.estado) : false
    );

    const source = pendingReservations.length > 0 ? pendingReservations : reservations;

    const byStartDate = source
      .filter((reservation) => reservation.fecha_inicio)
      .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));

    if (byStartDate.length > 0) {
      return byStartDate[0];
    }

    return source[source.length - 1] || null;
  }, [reservations]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  return (
    <div className="home container-xxl py-4">
      {error && <div className="alert alert-warning mb-4">{error}</div>}

      <section className="home-hero position-relative overflow-hidden rounded-4 p-4 p-md-5 mb-4 text-white shadow-sm">
        <div className="row align-items-center gy-4">
          <div className="col-lg-7">
            <p className="text-uppercase small text-white-50 mb-2">Panel principal UIS Rooms</p>
            <h1 className="display-5 fw-bold mb-3">{greetingName}</h1>
            <p className="fs-5 text-white-50 mb-4">
              Organiza tus reservas, revisa avisos y accede a los recursos clave desde un mismo lugar.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/spaces" className="btn btn-light text-success fw-semibold">
                Nueva reserva
              </Link>
              <Link to="/reservations" className="btn btn-outline-light">
                Ver mis reservas
              </Link>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="p-4 bg-dark bg-opacity-25 border border-white border-opacity-25 rounded-4 shadow-sm">
              <p className="small text-uppercase text-white-50 mb-2">Tu reserva mas reciente</p>
              {latestReservation ? (
                <>
                  <h3 className="h5 text-white mb-2">
                    {latestReservation.espacio?.nombre || 'Espacio por confirmar'}
                  </h3>
                  <p className="text-white-50 small mb-3">
                    {latestReservation.motivo || 'Reserva sin motivo registrado'}
                  </p>
                  <div className="d-flex flex-wrap gap-3 text-white small">
                    <span>Inicio: {formatDateTime(latestReservation.fecha_inicio)}</span>
                    <span>Fin: {formatDateTime(latestReservation.fecha_fin)}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
                    {latestReservation.estado && (
                      <span className="badge bg-light text-success text-uppercase fw-semibold">
                        {latestReservation.estado}
                      </span>
                    )}
                    <Link to="/reservations" className="btn btn-sm btn-outline-light">
                      Ver agenda completa
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-white-50">
                  <p className="mb-2">Aun no tienes reservas registradas.</p>
                  <p className="small mb-3">
                    Empieza programando un espacio o revisa las opciones disponibles en la plataforma.
                  </p>
                  <Link to="/spaces" className="btn btn-sm btn-light text-success fw-semibold">
                    Programar mi primera reserva
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="row g-3">
          {statsCards.map((card) => (
            <div key={card.label} className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="small text-uppercase text-muted mb-2">{card.label}</p>
                  <p className="display-6 fw-semibold mb-1">{card.value}</p>
                  <p className="text-muted small mb-0">{card.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
              <div>
                <h2 className="h5 mb-1">Empieza rapido</h2>
                <p className="text-muted small mb-0">Acceso directo a tus flujos mas frecuentes.</p>
              </div>              
            </div>
            <div className="row row-cols-1 row-cols-md-2 g-3">
              {quickActionsList.map((action, index) => {
                const isPrimary = index < 2;
                const cardClassName = `card h-100 shadow-sm quick-action-card ${
                  isPrimary ? 'quick-action-card--primary' : 'quick-action-card--secondary'
                }`;
                const badgeClass = `badge ${
                  isPrimary ? 'bg-success-subtle text-success' : 'bg-light text-success'
                } mb-2`;
                const titleClass = 'h5 mb-2 text-success';
                const descriptionClass = 'small mb-0 quick-action-card__description';
                return (
                  <div key={action.to} className="col">
                    <Link to={action.to} className="text-decoration-none">
                      <div className={cardClassName}>
                        <div className="card-body">
                          <span className={badgeClass}>{action.badge}</span>
                          <h3 className={titleClass}>{action.title}</h3>
                          <p className={descriptionClass}>{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h2 className="h5 mb-1">Avisos recientes</h2>
                <p className="text-muted small mb-0">Mantente al dia con los cambios importantes.</p>
              </div>
              <Link to="/notificaciones" className="btn btn-sm btn-outline-success">
                Ver avisos
              </Link>
            </div>
            {recentNotifications.length === 0 ? (
              <div className="alert alert-info mb-0">
                No tienes avisos nuevos. Te contactaremos si surge alguna novedad.
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 g-3">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="col">
                    <div className="notification-card h-100 border rounded-4 p-3">
                      <h3 className="h6 mb-2 text-success text-capitalize">
                        {notification.tipo || 'Aviso'}
                      </h3>
                      <p className="text-muted small mb-3">
                        {notification.mensaje || 'Sin detalles adicionales.'}
                      </p>
                      <div className="d-flex gap-2 flex-wrap small">
                        {notification.creado_en && (
                          <span className="badge bg-light text-success">
                            {formatDateTime(notification.creado_en)}
                          </span>
                        )}
                        {notification.leido === false && (
                          <span className="badge bg-success-subtle text-success fw-semibold">Nuevo</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h2 className="h5 mb-1">Espacios destacados</h2>
                <p className="text-muted small mb-0">
                  Descubre ubicaciones listas para reservar y revisa su capacidad rapidamente.
                </p>
              </div>
              <Link to="/spaces" className="btn btn-sm btn-outline-success">
                Ver todos los espacios
              </Link>
            </div>
            {highlightedSpaces.length === 0 ? (
              <div className="alert alert-info mb-0">Aun no hay espacios registrados.</div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                {highlightedSpaces.map((space) => (
                  <div key={space.id} className="col">
                    <div className="space-card h-100 rounded-4 p-3">
                      <h3 className="h6 mb-2 text-success">{space.nombre}</h3>
                      <p className="text-muted small mb-3">
                        {space.descripcion || 'Espacio sin descripcion'}
                      </p>
                      <div className="d-flex flex-wrap gap-2 small">
                        {typeof space.capacidad !== 'undefined' && (
                          <span className="badge bg-light text-success">
                            Capacidad: {space.capacidad}
                          </span>
                        )}
                        {space.ubicacion && (
                          <span className="badge bg-light text-success">Ubicacion: {space.ubicacion}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;