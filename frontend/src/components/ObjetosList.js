import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const ObjetosList = () => {
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchObjetos = async () => {
      try {
        const response = await api.get('objetos-perdidos/');
        setObjetos(response.data);
      } catch (err) {
        setError('Error al cargar objetos perdidos');
      } finally {
        setLoading(false);
      }
    };
    fetchObjetos();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Objetos Perdidos</h1>
      <Link to="/objetos/create" className="btn btn-success mb-3">Reportar Objeto Perdido</Link>
      {objetos.length === 0 ? (
        <div className="alert alert-info">No hay objetos perdidos</div>
      ) : (
        <div className="row">
          {objetos.map((obj) => (
            <div key={obj.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{obj.tipo || 'Objeto Perdido'}</h5>
                  <p className="card-text">
                    <strong>Descripción:</strong> {obj.descripcion || 'Sin descripción'}<br />
                    <strong>Espacio:</strong> {obj.espacio ? obj.espacio.nombre : 'No especificado'}<br />
                    <strong>Estado:</strong> {obj.estado}<br />
                    <strong>Encontrado por:</strong> {obj.encontrado_por ? `${obj.encontrado_por.first_name} ${obj.encontrado_por.last_name}` : 'No especificado'}<br />
                    <strong>Fecha Encontrado:</strong> {obj.fecha_encontrado ? new Date(obj.fecha_encontrado).toLocaleString() : 'No especificada'}
                  </p>
                  <Link to={`/objetos/${obj.id}/edit`} className="btn btn-primary">Editar</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ObjetosList;
