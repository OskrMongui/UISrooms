import React, { useEffect, useState } from 'react';
import api from '../api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await api.get('usuarios/me/');
        setUser(response.data);
      } catch (err) {
        setError('Error al cargar tu perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
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

  if (!user) {
    return (
      <div className="alert alert-warning">
        No encontramos la informacion de tu perfil en este momento.
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  return (
    <div className="profile-view container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Cuenta UIS Rooms</p>
            <h1 className="mb-2">Hola, {fullName}</h1>
            <p className="mb-0">
              Revisa tus datos personales y mantelos actualizados para que la plataforma pueda ayudarte mejor.
            </p>
          </div>
        </div>
      </div>

      <div className="card-elevated bg-white p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="surface-muted h-100">
              <h2 className="h6 text-success mb-3">Informacion principal</h2>
              <ul className="list-unstyled mb-0 small">
                <li className="mb-2">
                  <strong>Usuario:</strong> {user.username}
                </li>
                <li className="mb-2">
                  <strong>Email:</strong> {user.email || 'No registrado'}
                </li>
                <li className="mb-2">
                  <strong>Telefono:</strong> {user.telefono || 'No especificado'}
                </li>
                <li className="mb-2">
                  <strong>Rol asignado:</strong> {user.rol?.nombre || 'No asignado'}
                </li>
                <li className="mb-2">
                  <strong>Fecha de registro:</strong>{' '}
                  {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/D'}
                </li>
              </ul>
            </div>
          </div>
          <div className="col-md-6">
            <div className="surface-muted h-100">
              <h2 className="h6 text-success mb-3">Informacion adicional</h2>
              <ul className="list-unstyled mb-0 small">
                <li className="mb-2">
                  <strong>Departamento:</strong> {user.departamento || 'No especificado'}
                </li>
                <li className="mb-2">
                  <strong>Cargo:</strong> {user.cargo || 'No especificado'}
                </li>
                <li className="mb-2">
                  <strong>Documento:</strong> {user.documento || 'No registrado'}
                </li>
                <li className="mb-2">
                  <strong>Estado de cuenta:</strong> {user.is_active ? 'Activo' : 'Inactivo'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
