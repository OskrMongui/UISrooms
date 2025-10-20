import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const DEMO_USERS = [
  { role: 'Admin', username: 'admin_demo', password: 'Admin123!' },
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
    <div className="row justify-content-center">
      <div className="col-lg-5 col-md-6">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-success text-white">
            <h3 className="mb-0">Iniciar Sesion</h3>
          </div>
          <div className="card-body">
            <p className="text-muted small mb-4">
              Ingresa con tus credenciales institucionales o selecciona uno de los perfiles de demostracion para explorar el sistema.
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

              <div className="mb-3">
                <label className="form-label d-flex justify-content-between align-items-center" htmlFor="password">
                  <span>Contrasena</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-decoration-none p-0"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </label>
                <div className="input-group">
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
              </div>

              <button
                type="submit"
                className="btn btn-success w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Iniciando...' : 'Iniciar Sesion'}
              </button>
            </form>
          </div>

          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-semibold">Usuarios de demostracion</span>
              <span className="badge bg-success text-white">
                Un clic para autocompletar
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Rol</th>
                    <th scope="col">Usuario</th>
                    <th scope="col">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_USERS.map((demoUser) => (
                    <tr key={demoUser.username}>
                      <td>{demoUser.role}</td>
                      <td>
                        <code>{demoUser.username}</code>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
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
  );
};

export default Login;
