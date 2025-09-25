import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const SpacesList = () => {
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

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Espacios Disponibles</h1>
      <div className="row">
        {spaces.map((space) => (
          <div key={space.id} className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{space.nombre}</h5>
                <p className="card-text">{space.descripcion}</p>
                <p className="text-muted">Capacidad: {space.capacidad}</p>
                <Link to={`/spaces/${space.id}`} className="btn btn-success">Ver Horarios</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpacesList;
