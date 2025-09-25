import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams } from 'react-router-dom';

const SpaceDetail = () => {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spaceRes, availRes] = await Promise.all([
          api.get(`espacios/${id}/`),
          api.get(`espacios-disponibilidad/?espacio=${id}`)
        ]);
        setSpace(spaceRes.data);
        setAvailabilities(availRes.data);
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {space && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h2>{space.nombre}</h2>
          </div>
          <div className="card-body">
            <p>{space.descripcion}</p>
            <p><strong>Capacidad:</strong> {space.capacidad}</p>
            <p><strong>Ubicación:</strong> {space.ubicacion}</p>
          </div>
        </div>
      )}
      <h3>Horarios Disponibles</h3>
      {availabilities.length === 0 ? (
        <div className="alert alert-info">No hay horarios disponibles</div>
      ) : (
        <div className="row">
          {availabilities.map((avail) => (
            <div key={avail.id} className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Día {avail.dia_semana}</h5>
                  <p className="card-text">
                    <strong>Hora Inicio:</strong> {avail.hora_inicio}<br />
                    <strong>Hora Fin:</strong> {avail.hora_fin}
                  </p>
                  {avail.observaciones && <p className="text-muted">{avail.observaciones}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceDetail;
