import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  canApproveReservations,
  getUserFromToken,
  isAdmin,
} from '../utils/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => getUserFromToken());
  const [openSectionId, setOpenSectionId] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const closeAllMenus = useCallback(() => {
    setOpenSectionId(null);
    setIsUserMenuOpen(false);
  }, []);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setUser(getUserFromToken());
    closeAllMenus();
    setIsNavCollapsed(true);
  }, [location.pathname, closeAllMenus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        closeAllMenus();
        setIsNavCollapsed(true);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [closeAllMenus]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    closeAllMenus();
    setIsNavCollapsed(true);
    navigate('/login');
  };

  const primaryLinks = useMemo(
    () => [{ to: '/', label: 'Inicio', requiresAuth: false }],
    []
  );

  const navSections = useMemo(() => {
    const baseSections = [
      {
        id: 'reservas',
        label: 'Reservas',
        description: 'Gestiona tus reservas y solicitudes pendientes.',
        items: [
          {
            to: '/reservations',
            label: 'Mis reservas',
            description: 'Consulta tus próximas reservas y su estado.',
            requiresAuth: true,
            activeMatch: '/reservations',
          },
          {
            to: '/reservations/create',
            label: 'Nueva reserva',
            description: 'Agenda un espacio con disponibilidad garantizada.',
            requiresAuth: true,
            highlight: 'Nuevo',
            activeMatch: '/reservations/create',
          },
        ],
      },
      {
        id: 'recursos',
        label: 'Recursos',
        description: 'Accede a espacios, llaves y materiales institucionales.',
        items: [
          {
            to: '/spaces',
            label: 'Espacios',
            description: 'Explora aulas, laboratorios y su disponibilidad.',
            requiresAuth: true,
            activeMatch: '/spaces',
          },
          {
            to: '/llaves',
            label: 'Llaves',
            description: 'Gestiona llaves asignadas y solicitudes.',
            requiresAuth: true,
            activeMatch: '/llaves',
          },
          {
            to: '/objetos',
            label: 'Objetos',
            description: 'Solicita o devuelve equipos y recursos.',
            requiresAuth: true,
            activeMatch: '/objetos',
          },
        ],
      },
      {
        id: 'apoyo',
        label: 'Apoyo',
        description: 'Mantén la comunicación y reporta novedades.',
        items: [
          {
            to: '/notificaciones',
            label: 'Notificaciones',
            description: 'Revisa avisos y recordatorios importantes.',
            requiresAuth: true,
            activeMatch: '/notificaciones',
          },
          {
            to: '/incidencias',
            label: 'Incidencias',
            description: 'Reporta problemas y haz seguimiento en línea.',
            requiresAuth: true,
            activeMatch: '/incidencias',
          },
        ],
      },
    ];

    const sections = baseSections.map((section) => ({
      ...section,
      items: [...section.items],
    }));

    const reservasSection = sections.find(
      (section) => section.id === 'reservas'
    );
    const recursosSection = sections.find(
      (section) => section.id === 'recursos'
    );

    if (token && canApproveReservations()) {
      reservasSection?.items.push({
        to: '/reservations/pending',
        label: 'Solicitudes pendientes',
        description: 'Aprueba o rechaza solicitudes en espera.',
        requiresAuth: true,
        activeMatch: '/reservations/pending',
        highlight: 'Equipo',
      });
    }

    if (token && isAdmin()) {
      recursosSection?.items.push({
        to: '/admin/spaces',
        label: 'Panel de administración',
        description: 'Configura espacios, horarios y recursos.',
        requiresAuth: true,
        activeMatch: '/admin/spaces',
      });
    }

    return sections;
  }, [token]);

  const userDisplayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      user.username
    : '';

  const userRoleName = user?.rol?.nombre || '';

  const isSectionActive = (section) =>
    section.items.some((item) => {
      const matchPath = item.activeMatch || item.to;
      if (!matchPath) return false;
      if (matchPath === '/') return location.pathname === '/';
      return location.pathname.startsWith(matchPath);
    });

  const renderPrimaryLink = (link) => (
    <li className="nav-item" key={link.to}>
      <NavLink
        end={link.to === '/'}
        className={({ isActive }) =>
          `nav-link px-lg-3${isActive ? ' active fw-semibold' : ''}`
        }
        to={link.to}
        onClick={() => {
          closeAllMenus();
          setIsNavCollapsed(true);
        }}
      >
        {link.label}
      </NavLink>
    </li>
  );

  const renderSectionItem = (item) => {
    const accessible = !item.requiresAuth || token;
    const baseClasses =
      'dropdown-item rounded-3 py-3 px-3 transition-all d-flex flex-column gap-1';

    if (!accessible) {
      return (
        <span
          key={item.to}
          className={`${baseClasses} disabled text-muted pe-none`}
        >
          <span className="fw-semibold">{item.label}</span>
          <span className="small">
            {item.description || 'Requiere iniciar sesión'}
          </span>
          <span className="badge bg-light text-muted mt-1 align-self-start">
            Requiere iniciar sesión
          </span>
        </span>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `${baseClasses}${
            isActive ? ' active-item border border-success-subtle' : ''
          }`
        }
        onClick={() => {
          closeAllMenus();
          setIsNavCollapsed(true);
        }}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-dark">{item.label}</span>
          {item.highlight && (
            <span className="badge rounded-pill bg-success-subtle text-success fw-semibold">
              {item.highlight}
            </span>
          )}
        </span>
        {item.description && (
          <span className="small text-muted">{item.description}</span>
        )}
      </NavLink>
    );
  };

  const renderSection = (section) => {
    const visibleItems = section.items.filter((item) => {
      if (item.requiresAuth && !token) {
        return true;
      }
      if (item.requiresAdmin && !isAdmin()) {
        return false;
      }
      if (item.requiresApprover && !canApproveReservations()) {
        return false;
      }
      return true;
    });

    if (visibleItems.length === 0) return null;

    const sectionIsActive = isSectionActive(section);
    const isOpen = openSectionId === section.id;

    return (
      <li
        className={`nav-item dropdown position-static${
          isOpen ? ' show' : ''
        }`}
        key={section.id}
      >
        <button
          type="button"
          className={`nav-link dropdown-toggle px-lg-3 d-flex align-items-center gap-1 ${
            sectionIsActive || isOpen ? 'active fw-semibold' : ''
          }`}
          id={`navbar-${section.id}`}
          aria-expanded={isOpen}
          onClick={() => {
            setOpenSectionId((current) =>
              current === section.id ? null : section.id
            );
            setIsUserMenuOpen(false);
          }}
        >
          {section.label}
        </button>
        <div
          className={`dropdown-menu dropdown-menu-xl shadow border-0 rounded-4 p-0 mt-3${
            isOpen ? ' show' : ''
          }`}
          aria-labelledby={`navbar-${section.id}`}
        >
          <div className="px-4 py-4 border-bottom">
            <h6 className="text-uppercase text-success fw-semibold mb-1 small">
              {section.label}
            </h6>
            <p className="mb-0 text-muted small">{section.description}</p>
          </div>
          <div className="d-flex flex-column p-3 gap-2">
            {visibleItems.map((item) => renderSectionItem(item))}
          </div>
        </div>
      </li>
    );
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm"
      ref={navRef}
    >
      <div className="container">
        <Link className="navbar-brand fw-bold text-success" to="/">
          UISrooms
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={!isNavCollapsed}
          aria-label="Alternar navegacion"
          onClick={() => {
            closeAllMenus();
            setIsNavCollapsed((prev) => !prev);
          }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className={`collapse navbar-collapse align-items-lg-center${
            isNavCollapsed ? '' : ' show'
          }`}
          id="navbarNav"
        >
          <ul className="navbar-nav me-lg-auto mb-3 mb-lg-0 align-items-lg-center gap-lg-1">
            {primaryLinks
              .filter((link) => !link.requiresAuth || token)
              .map((link) => renderPrimaryLink(link))}
            {navSections.map((section) => renderSection(section))}
          </ul>
          <ul className="navbar-nav align-items-lg-center gap-2 gap-lg-3 ms-lg-4">
            {token ? (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/reservations/create"
                    className="btn btn-success btn-sm px-3 fw-semibold shadow-sm"
                    onClick={() => {
                      closeAllMenus();
                      setIsNavCollapsed(true);
                    }}
                  >
                    Nueva reserva
                  </NavLink>
                </li>
                <li
                  className={`nav-item dropdown${
                    isUserMenuOpen ? ' show' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="btn btn-outline-success dropdown-toggle d-flex align-items-center gap-2 px-3 py-2"
                    id="navbarUserMenu"
                    aria-expanded={isUserMenuOpen}
                    onClick={() => {
                      setIsUserMenuOpen((prev) => !prev);
                      setOpenSectionId(null);
                    }}
                  >
                    <span
                      className="rounded-circle bg-success text-white fw-semibold text-uppercase d-inline-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px' }}
                    >
                      {user?.first_name?.charAt(0) ||
                        user?.username?.charAt(0) ||
                        '?'}
                    </span>
                    <span className="d-none d-lg-flex flex-column text-start lh-sm">
                      <span className="fw-semibold text-success-emphasis">
                        {userDisplayName || 'Usuario'}
                      </span>
                      <span className="small text-muted">
                        {userRoleName || 'Cuenta institucional'}
                      </span>
                    </span>
                  </button>
                  <ul
                    className={`dropdown-menu dropdown-menu-end shadow border-0 rounded-4 p-2${
                      isUserMenuOpen ? ' show' : ''
                    }`}
                    aria-labelledby="navbarUserMenu"
                  >
                    <li className="dropdown-item-text small text-muted">
                      Conectado como{' '}
                      <span className="fw-semibold text-dark">
                        {userDisplayName || user?.username || 'Usuario'}
                      </span>
                    </li>
                    <li>
                      <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                          `dropdown-item rounded-3${
                            isActive ? ' active' : ''
                          }`
                        }
                        onClick={() => {
                          closeAllMenus();
                          setIsNavCollapsed(true);
                        }}
                      >
                        Mi perfil
                      </NavLink>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        className="dropdown-item rounded-3 text-danger fw-semibold"
                        onClick={handleLogout}
                      >
                        Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link
                  className="btn btn-outline-success btn-sm px-3 fw-semibold"
                  to="/login"
                  onClick={() => {
                    closeAllMenus();
                    setIsNavCollapsed(true);
                  }}
                >
                  Iniciar sesión
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
