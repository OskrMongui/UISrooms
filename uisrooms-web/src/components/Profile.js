import React, { useState, useEffect } from 'react';
import api from '../api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('usuarios/me/');
        setUser(response.data);
      } catch (err) {
        setError('Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Mi Perfil</h1>
      {user && (
        <div className="card">
          <div className="card-header bg-success text-white">
            <h2>{user.first_name} {user.last_name}</h2>
          </div>
          <div className="card-body">
            <p><strong>Usuario:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Teléfono:</strong> {user.telefono || 'No especificado'}</p>
            <p><strong>Departamento:</strong> {user.departamento || 'No especificado'}</p>
            <p><strong>Cargo:</strong> {user.cargo || 'No especificado'}</p>
            <p><strong>Rol:</strong> {user.rol ? user.rol.nombre : 'No asignado'}</p>
            <p><strong>Fecha de Registro:</strong> {new Date(user.date_joined).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
