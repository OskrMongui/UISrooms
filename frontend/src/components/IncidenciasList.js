import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const IncidenciasList = () => {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIncidencias = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await api.get('incidencias/');
        setIncidencias(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar incidencias.');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidencias();
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
    <div className="incidencias container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Centro de soporte</p>
            <h1 className="mb-2">Reportes de incidencias</h1>
            <p className="mb-0">
              Visualiza los reportes abiertos, revisa su estado y coordina acciones para restablecer los espacios.
            </p>
          </div>
          <div>
            <Link to="/incidencias/create" className="btn btn-light text-success fw-semibold">
              Reportar incidencia
            </Link>
          </div>
        </div>
      </div>

      {incidencias.length === 0 ? (
        <div className="card-elevated p-4 bg-white text-center">
          <h4 className="mb-1">Sin incidencias activas</h4>
          <p className="text-muted small mb-0">
            Cuando se registre un nuevo incidente se mostrara aqui para hacer seguimiento.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {incidencias.map((inc) => {
            const espacio = inc.espacio || {};
            return (
              <div key={inc.id} className="col-lg-6">
                <div className="card-elevated h-100 p-4 bg-white d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h5 className="mb-1">{inc.tipo || 'Incidencia'}</h5>
                      <span className="tag is-warning">{inc.estado || 'Pendiente'}</span>
                    </div>
                    <Link to={`/incidencias/${inc.id}/edit`} className="btn btn-sm btn-outline-success">
                      Editar
                    </Link>
                  </div>
                  <div className="reservation-card__meta">
                    <div className="d-flex flex-column small">
                      <span>
                        <strong>Espacio:</strong> {espacio.nombre || 'No especificado'}
                      </span>
                      <span>
                        <strong>Reportada:</strong>{' '}
                        {inc.fecha_reportada ? new Date(inc.fecha_reportada).toLocaleString() : 'N/D'}
                      </span>
                    </div>
                  </div>
                  {inc.descripcion ? (
                    <p className="text-muted mb-0">{inc.descripcion}</p>
                  ) : (
                    <p className="text-muted mb-0">Sin descripcion proporcionada.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IncidenciasList;
