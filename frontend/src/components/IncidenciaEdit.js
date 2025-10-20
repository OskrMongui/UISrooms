import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';

const IncidenciaEdit = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    espacio: '',
    tipo: '',
    descripcion: '',
    estado: ''
  });
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, espRes] = await Promise.all([
          api.get(`incidencias/${id}/`),
          api.get('espacios/')
        ]);
        setFormData({
          espacio: incRes.data.espacio ? incRes.data.espacio.id : '',
          tipo: incRes.data.tipo || '',
          descripcion: incRes.data.descripcion || '',
          estado: incRes.data.estado
        });
        setEspacios(espRes.data);
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`incidencias/${id}/`, formData);
      navigate('/incidencias');
    } catch (err) {
      setError('Error al actualizar incidencia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Editar Incidencia</h3>
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
              <div className="mb-3">
                <label className="form-label">Estado</label>
                <select
                  name="estado"
                  className="form-control"
                  value={formData.estado}
                  onChange={handleChange}
                  required
                >
                  <option value="abierta">Abierta</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Guardando...' : 'Actualizar Incidencia'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidenciaEdit;
