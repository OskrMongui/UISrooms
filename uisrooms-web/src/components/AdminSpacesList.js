import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const AdminSpacesList = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await api.get('espacios/');
        setSpaces(response.data);
      } catch (err) {
        setError('Error al cargar espacios');
      } finally {
        setLoading(false);
      }
    };
    fetchSpaces();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este espacio?')) {
      try {
        await api.delete(`espacios/${id}/`);
        setSpaces(spaces.filter(space => space.id !== id));
      } catch (err) {
        setError('Error al eliminar espacio');
      }
    }
  };

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Administrar Espacios</h1>
      <Link to="/admin/spaces/create" className="btn btn-success mb-3">Crear Nuevo Espacio</Link>
      <div className="row">
        {spaces.map((space) => (
          <div key={space.id} className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{space.nombre}</h5>
                <p className="card-text">{space.descripcion}</p>
                <p className="text-muted">Capacidad: {space.capacidad}</p>
                <div className="d-flex justify-content-between">
                  <Link to={`/admin/spaces/${space.id}/edit`} className="btn btn-primary">Editar</Link>
                  <Link to={`/admin/spaces/${space.id}/schedule`} className="btn btn-info">Horarios</Link>
                  <button onClick={() => handleDelete(space.id)} className="btn btn-danger">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSpacesList;
