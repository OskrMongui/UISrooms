import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const LlavesList = () => {
  const [llaves, setLlaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLlaves = async () => {
      try {
        const response = await api.get('llaves/');
        setLlaves(response.data);
      } catch (err) {
        setError('Error al cargar llaves');
      } finally {
        setLoading(false);
      }
    };
    fetchLlaves();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Llaves</h1>
      <Link to="/llaves/create" className="btn btn-success mb-3">Agregar Llave</Link>
      {llaves.length === 0 ? (
        <div className="alert alert-info">No hay llaves</div>
      ) : (
        <div className="row">
          {llaves.map((llave) => (
            <div key={llave.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{llave.codigo || 'Llave sin código'}</h5>
                  <p className="card-text">
                    <strong>Espacio:</strong> {llave.espacio.nombre}<br />
                    <strong>Estado:</strong> {llave.estado}<br />
                    <strong>Responsable:</strong> {llave.responsable ? `${llave.responsable.first_name} ${llave.responsable.last_name}` : 'No asignado'}<br />
                    <strong>Creado:</strong> {new Date(llave.creado_en).toLocaleString()}
                  </p>
                  <Link to={`/llaves/${llave.id}/edit`} className="btn btn-primary">Editar</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LlavesList;
