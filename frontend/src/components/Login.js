import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const DEMO_USERS = [
  { role: 'Admin', username: 'admin_demo', password: 'Admin123!' },
  { role: 'Laboratorista', username: 'laboratorista_demo', password: 'Laboratorista123!' },
  { role: 'Secretaria', username: 'secretaria_demo', password: 'Secretaria123!' },
  { role: 'Profesor', username: 'profesor_demo', password: 'Profesor123!' },
];

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('token/', {
        username,
        password,
      });

      localStorage.setItem('token', response.data.access);

      const userResponse = await api.get('usuarios/me/');
      localStorage.setItem('user', JSON.stringify(userResponse.data));

      navigate('/');
    } catch (submitError) {
      setError('Credenciales invalidas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrefill = (demoUser) => {
    setUsername(demoUser.username);
    setPassword(demoUser.password);
    setError('');
  };

  return (
    <div className="container-xxl py-5">
      <div className="row g-4 align-items-stretch">
        <div className="col-lg-6">
          <div className="auth-hero h-100">
            <p className="text-uppercase small mb-2">Plataforma UIS Rooms</p>
            <h1 className="mb-3">Gestiona reservas con confianza</h1>
            <p className="mb-4">
              Ingresa para coordinar espacios, reportar incidencias y colaborar con los equipos de apoyo.
              Todo en un solo panel pensado para la comunidad UIS.
            </p>
            <ul className="feature-list">
              <li className="feature-item">
                <span>01</span>
                Disponibilidad de espacios en tiempo real.
              </li>
              <li className="feature-item">
                <span>02</span>
                Seguimiento de solicitudes y estados pendientes.
              </li>
              <li className="feature-item">
                <span>03</span>
                Reporte de incidencias y comunicacion centralizada.
              </li>
            </ul>
          </div>
        </div>
        <div className="col-lg-5 ms-lg-auto">
          <div className="auth-card h-100 d-flex flex-column gap-4">
            <div>
              <h2 className="h4 fw-semibold text-success mb-2">Inicia sesion</h2>
              <p className="text-muted small mb-4">
                Usa tus credenciales institucionales. Si solo quieres explorar, prueba los perfiles de demostracion.
              </p>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="username">
                    Usuario
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="form-label d-flex justify-content-between align-items-center"
                    htmlFor="password"
                  >
                    <span>Contrasena</span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-decoration-none p-0"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success w-100 fw-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar sesion'}
                </button>
              </form>
            </div>

            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-semibold text-success-emphasis">
                  Usuarios de demostracion
                </span>
                <span className="tag">Autocompletar</span>
              </div>
              <div className="demo-table">
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Rol</th>
                        <th scope="col">Usuario</th>
                        <th scope="col" className="text-end">
                          Accion
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_USERS.map((demoUser) => (
                        <tr key={demoUser.username}>
                          <td>{demoUser.role}</td>
                          <td>
                            <code>{demoUser.username}</code>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm fw-semibold"
                              onClick={() => handlePrefill(demoUser)}
                              disabled={isSubmitting}
                            >
                              Usar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
