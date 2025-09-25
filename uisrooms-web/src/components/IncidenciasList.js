import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const IncidenciasList = () => {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIncidencias = async () => {
      try {
        const response = await api.get('incidencias/');
        setIncidencias(response.data);
      } catch (err) {
        setError('Error al cargar incidencias');
      } finally {
        setLoading(false);
      }
    };
    fetchIncidencias();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Incidencias</h1>
      <Link to="/incidencias/create" className="btn btn-success mb-3">Reportar Incidencia</Link>
      {incidencias.length === 0 ? (
        <div className="alert alert-info">No hay incidencias</div>
      ) : (
        <div className="row">
          {incidencias.map((inc) => (
            <div key={inc.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{inc.tipo || 'Incidencia'}</h5>
                  <p className="card-text">
                    <strong>Espacio:</strong> {inc.espacio ? inc.espacio.nombre : 'No especificado'}<br />
                    <strong>Estado:</strong> {inc.estado}<br />
                    <strong>Reportada:</strong> {new Date(inc.fecha_reportada).toLocaleString()}<br />
                    {inc.descripcion && <><strong>Descripción:</strong> {inc.descripcion}</>}
                  </p>
                  <Link to={`/incidencias/${inc.id}/edit`} className="btn btn-primary">Editar</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncidenciasList;
