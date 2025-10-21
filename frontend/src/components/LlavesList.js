import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const LlavesList = () => {
  const [llaves, setLlaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLlaves = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await api.get('llaves/');
        setLlaves(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar llaves.');
      } finally {
        setLoading(false);
      }
    };

    fetchLlaves();
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
    <div className="keys-view container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Control de llaves</p>
            <h1 className="mb-2">Gestiona accesos fisicos</h1>
            <p className="mb-0">
              Revisa el inventario de llaves, sus responsables y registra nuevos prestamos cuando sea necesario.
            </p>
          </div>
          <div>
            <Link to="/llaves/create" className="btn btn-light text-success fw-semibold">
              Agregar llave
            </Link>
          </div>
        </div>
      </div>

      {llaves.length === 0 ? (
        <div className="card-elevated p-4 bg-white text-center">
          <h4 className="mb-1">Sin llaves registradas</h4>
          <p className="text-muted small mb-0">
            Crea una nueva llave para comenzar a seguir los prestamos y responsables asociados.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {llaves.map((llave) => {
            const responsable = llave.responsable || {};
            const espacio = llave.espacio || {};
            return (
              <div key={llave.id} className="col-lg-6">
                <div className="card-elevated h-100 p-4 bg-white d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h5 className="mb-1">{llave.codigo || 'Llave sin codigo'}</h5>
                      <span className="tag">{llave.estado || 'Sin estado'}</span>
                    </div>
                    <Link to={`/llaves/${llave.id}/edit`} className="btn btn-sm btn-outline-success">
                      Editar
                    </Link>
                  </div>
                  <div className="reservation-card__meta">
                    <div className="d-flex flex-column small">
                      <span>
                        <strong>Espacio:</strong> {espacio.nombre || 'No asignado'}
                      </span>
                      <span>
                        <strong>Responsable:</strong>{' '}
                        {responsable.first_name
                          ? `${responsable.first_name} ${responsable.last_name || ''}`
                          : 'No asignado'}
                      </span>
                      <span>
                        <strong>Creada:</strong>{' '}
                        {llave.creado_en ? new Date(llave.creado_en).toLocaleString() : 'N/D'}
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

export default LlavesList;
