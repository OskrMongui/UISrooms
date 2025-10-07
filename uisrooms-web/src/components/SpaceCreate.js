import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const SpaceCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'aula',
    capacidad: '',
    ubicacion: '',
    recursos: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      await api.post('espacios/', data);
      navigate('/admin/spaces');
    } catch (err) {
      setError('Error al crear espacio');
    } finally {
      setLoading(false);
    }
  };

  const tipos = [
    { value: 'aula', label: 'Aulas' },
    { value: 'laboratorio', label: 'Laboratorios' },
    { value: 'sala', label: 'Salas' }
  ];

  return (
    <div>
      <h1 className="mb-4">Crear Nuevo Espacio</h1>
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
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Espacio'}
        </button>
        <Link to="/admin/spaces" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
};

export default SpaceCreate;
