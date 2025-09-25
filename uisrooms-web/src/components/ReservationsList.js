import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const ReservationsList = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await api.get('reservas/');
        setReservations(response.data);
      } catch (err) {
        setError('Error al cargar reservas');
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, []);

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h1 className="mb-4">Mis Reservas</h1>
      <Link to="/reservations/create" className="btn btn-success mb-3">Nueva Reserva</Link>
      {reservations.length === 0 ? (
        <div className="alert alert-info">No tienes reservas</div>
      ) : (
        <div className="row">
          {reservations.map((res) => (
            <div key={res.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Espacio: {res.espacio.nombre}</h5>
                  <p className="card-text">
                    <strong>Inicio:</strong> {new Date(res.fecha_inicio).toLocaleString()}<br />
                    <strong>Fin:</strong> {new Date(res.fecha_fin).toLocaleString()}<br />
                    <strong>Estado:</strong> {res.estado}<br />
                    {res.motivo && <><strong>Motivo:</strong> {res.motivo}</>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReservationsList;
