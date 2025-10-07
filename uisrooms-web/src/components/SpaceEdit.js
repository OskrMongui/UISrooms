import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';

const SpaceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'aula',
    capacidad: '',
    ubicacion: '',
    recursos: '',
    activo: true
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpace = async () => {
      try {
        const response = await api.get(`espacios/${id}/`);
        const space = response.data;
        setFormData({
          ...space,
          recursos: space.recursos.join(', ')
        });
      } catch (err) {
        setError('Error al cargar espacio');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchSpace();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = {
        ...formData,
        recursos: formData.recursos.split(',').map(r => r.trim()).filter(r => r)
      };
      await api.put(`espacios/${id}/`, data);
      navigate('/admin/spaces');
    } catch (err) {
      setError('Error al actualizar espacio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este espacio?')) {
      try {
        await api.delete(`espacios/${id}/`);
        navigate('/admin/spaces');
      } catch (err) {
        setError('Error al eliminar espacio');
      }
    }
  };

  const tipos = [
    { value: 'aula', label: 'Aulas' },
    { value: 'laboratorio', label: 'Laboratorios' },
    { value: 'sala', label: 'Salas' }
  ];

  if (fetchLoading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;

  return (
    <div>
      <h1 className="mb-4">Editar Espacio</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="codigo" className="form-label">Código</label>
          <input
            type="text"
            className="form-control"
            id="codigo"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="nombre" className="form-label">Nombre</label>
          <input
            type="text"
            className="form-control"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="descripcion" className="form-label">Descripción</label>
          <textarea
            className="form-control"
            id="descripcion"
            name="descripcion"
            rows="3"
            value={formData.descripcion}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="tipo" className="form-label">Tipo</label>
          <select
            className="form-select"
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            required
          >
            {tipos.map(tipo => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="capacidad" className="form-label">Capacidad</label>
          <input
            type="number"
            className="form-control"
            id="capacidad"
            name="capacidad"
            value={formData.capacidad}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="ubicacion" className="form-label">Ubicación</label>
          <textarea
            className="form-control"
            id="ubicacion"
            name="ubicacion"
            rows="2"
            value={formData.ubicacion}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="recursos" className="form-label">Recursos (separados por comas)</label>
          <input
            type="text"
            className="form-control"
            id="recursos"
            name="recursos"
            value={formData.recursos}
            onChange={handleChange}
            placeholder="proyector, pizarra, etc."
          />
        </div>
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="activo"
            name="activo"
            checked={formData.activo}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="activo">Activo</label>
        </div>
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar Espacio'}
        </button>
        <button type="button" className="btn btn-danger ms-2" onClick={handleDelete}>
          Eliminar Espacio
        </button>
        <Link to="/admin/spaces" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
};

export default SpaceEdit;
