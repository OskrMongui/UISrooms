import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const IncidenciaCreate = () => {
  const [formData, setFormData] = useState({
    espacio: '',
    tipo: '',
    descripcion: ''
  });
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEspacios = async () => {
      try {
        const response = await api.get('espacios/');
        setEspacios(response.data);
      } catch (err) {
        setError('Error al cargar espacios');
      }
    };
    fetchEspacios();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('incidencias/', formData);
      navigate('/incidencias');
    } catch (err) {
      setError('Error al crear incidencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Reportar Incidencia</h3>
          </div>
          <div className="card-body">
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
                  {espacios.map((esp) => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Tipo</label>
                <input
                  type="text"
                  name="tipo"
                  className="form-control"
                  value={formData.tipo}
                  onChange={handleChange}
                  placeholder="Ej: Daño, Limpieza, etc."
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="form-control"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows="4"
                  required
                />
              </div>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Creando...' : 'Reportar Incidencia'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidenciaCreate;
