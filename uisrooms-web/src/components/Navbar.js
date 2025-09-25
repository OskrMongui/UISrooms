import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success">
      <div className="container">
        <Link className="navbar-brand" to="/">UISrooms</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Espacios</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/reservations">Reservas</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/profile">Perfil</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/incidencias">Incidencias</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/llaves">Llaves</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/objetos">Objetos</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/notificaciones">Notificaciones</Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            {token ? (
              <li className="nav-item">
                <button className="btn btn-outline-light" onClick={handleLogout}>Cerrar Sesión</button>
              </li>
            ) : (
              <li className="nav-item">
                <Link className="btn btn-outline-light" to="/login">Iniciar Sesión</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
