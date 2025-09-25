import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const ReservationCreate = () => {
  const [spaces, setSpaces] = useState([]);
  const [formData, setFormData] = useState({
    espacio: '',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    cantidad_asistentes: 1,
    requiere_llaves: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await api.get('espacios/');
        setSpaces(response.data);
      } catch (err) {
        setError('Error al cargar espacios');
      }
    };
    fetchSpaces();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('reservas/', formData);
      navigate('/reservations');
    } catch (err) {
      setError('Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Crear Reserva</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Espacio</label>
          <select
            name="espacio"
            className="form-control"
            value={formData.espacio}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar espacio</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha y Hora Inicio</label>
          <input
            type="datetime-local"
            name="fecha_inicio"
            className="form-control"
            value={formData.fecha_inicio}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha y Hora Fin</label>
          <input
            type="datetime-local"
            name="fecha_fin"
            className="form-control"
            value={formData.fecha_fin}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Motivo</label>
          <textarea
            name="motivo"
            className="form-control"
            value={formData.motivo}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Cantidad de Asistentes</label>
          <input
            type="number"
            name="cantidad_asistentes"
            className="form-control"
            value={formData.cantidad_asistentes}
            onChange={handleChange}
            min="1"
          />
        </div>
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            name="requiere_llaves"
            className="form-check-input"
            checked={formData.requiere_llaves}
            onChange={handleChange}
          />
          <label className="form-check-label">Requiere Llaves</label>
        </div>
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Reserva'}
        </button>
      </form>
    </div>
  );
};

export default ReservationCreate;
