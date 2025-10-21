import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const NotificacionCreate = () => {
  const [formData, setFormData] = useState({
    tipo: 'sistema',
    destinatario: '',
    remitente: '',
    mensaje: '',
    metadata: '{}',
    enviado: false,
    leido: false
  });
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await api.get('usuarios/');
        setUsuarios(response.data);
      } catch (err) {
        setError('Error al cargar usuarios');
      }
    };
    fetchUsuarios();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        metadata: JSON.parse(formData.metadata)
      };
      await api.post('notificaciones/', dataToSend);
      navigate('/notificaciones');
    } catch (err) {
      setError('Error al crear notificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Crear Notificación</h3>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Tipo</label>
                <select
                  name="tipo"
                  className="form-control"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="agenda">Agenda</option>
                  <option value="reserva">Reserva</option>
                  <option value="sistema">Sistema</option>
                  <option value="incidencia">Incidencia</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Destinatario</label>
                <select
                  name="destinatario"
                  className="form-control"
                  value={formData.destinatario}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar destinatario</option>
                  {usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Remitente</label>
                <select
                  name="remitente"
                  className="form-control"
                  value={formData.remitente}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar remitente</option>
                  {usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Mensaje</label>
                <textarea
                  name="mensaje"
                  className="form-control"
                  value={formData.mensaje}
                  onChange={handleChange}
                  rows="3"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Metadata (JSON)</label>
                <textarea
                  name="metadata"
                  className="form-control"
                  value={formData.metadata}
                  onChange={handleChange}
                  rows="2"
                />
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  name="enviado"
                  className="form-check-input"
                  checked={formData.enviado}
                  onChange={handleChange}
                />
                <label className="form-check-label">Enviado</label>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  name="leido"
                  className="form-check-input"
                  checked={formData.leido}
                  onChange={handleChange}
                />
                <label className="form-check-label">Leído</label>
              </div>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Notificación'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificacionCreate;

