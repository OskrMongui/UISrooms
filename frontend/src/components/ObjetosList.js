import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const ObjetosList = () => {
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchObjetos = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await api.get('objetos-perdidos/');
        setObjetos(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar objetos perdidos.');
      } finally {
        setLoading(false);
      }
    };

    fetchObjetos();
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

  return (
    <div className="lost-items container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Objetos perdidos</p>
            <h1 className="mb-2">Central de hallazgos UIS</h1>
            <p className="mb-0">
              Registra objetos encontrados en los espacios institucionales y mantente en contacto con sus propietarios.
            </p>
          </div>
          <div>
            <Link to="/objetos/create" className="btn btn-light text-success fw-semibold">
              Reportar objeto
            </Link>
          </div>
        </div>
      </div>

      {objetos.length === 0 ? (
        <div className="card-elevated p-4 bg-white text-center">
          <h4 className="mb-1">Sin registros recientes</h4>
          <p className="text-muted small mb-0">
            Cuando registres un objeto perdido se mostrara aqui para facilitar su devolucion.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {objetos.map((obj) => {
            const espacio = obj.espacio || {};
            const encontradoPor = obj.encontrado_por || {};
            return (
              <div key={obj.id} className="col-lg-6">
                <div className="card-elevated h-100 p-4 bg-white d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h5 className="mb-1">{obj.tipo || 'Objeto perdido'}</h5>
                      <span className="tag">{obj.estado || 'En custodia'}</span>
                    </div>
                    <Link to={`/objetos/${obj.id}/edit`} className="btn btn-sm btn-outline-success">
                      Editar
                    </Link>
                  </div>
                  <p className="text-muted mb-0">{obj.descripcion || 'Sin descripcion registrada.'}</p>
                  <div className="reservation-card__meta">
                    <div className="d-flex flex-column small">
                      <span>
                        <strong>Espacio:</strong> {espacio.nombre || 'No especificado'}
                      </span>
                      <span>
                        <strong>Encontrado por:</strong>{' '}
                        {encontradoPor.first_name
                          ? `${encontradoPor.first_name} ${encontradoPor.last_name || ''}`
                          : 'No especificado'}
                      </span>
                      <span>
                        <strong>Fecha encontrado:</strong>{' '}
                        {obj.fecha_encontrado ? new Date(obj.fecha_encontrado).toLocaleString() : 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ObjetosList;
