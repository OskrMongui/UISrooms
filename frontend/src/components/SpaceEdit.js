import React, { useEffect, useMemo, useState } from 'react';
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
    ubicacion: 'primer_piso',
    recursos: '',
    activo: true,
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
          codigo: space.codigo || '',
          nombre: space.nombre || '',
          descripcion: space.descripcion || '',
          tipo: space.tipo || 'aula',
          capacidad: space.capacidad !== null && space.capacidad !== undefined ? String(space.capacidad) : '',
          ubicacion: space.ubicacion || 'primer_piso',
          recursos: Array.isArray(space.recursos) ? space.recursos.join(', ') : '',
          activo: typeof space.activo === 'boolean' ? space.activo : true,
        });
      } catch (err) {
        setError('Error al cargar espacio');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchSpace();
  }, [id]);

  const resourceChips = useMemo(() => {
    return formData.recursos
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [formData.recursos]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = {
        ...formData,
        capacidad: formData.capacidad === '' ? null : Number(formData.capacidad),
        recursos: resourceChips,
      };
      await api.put(`espacios/${id}/`, data);
      navigate('/admin/spaces');
    } catch (err) {
      const readable = err.response?.data?.detail || err.response?.data || 'Error al actualizar espacio';
      setError(typeof readable === 'string' ? readable : 'Error al actualizar espacio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Seguro que deseas eliminar este espacio?')) {
      return;
    }
    try {
      await api.delete(`espacios/${id}/`);
      navigate('/admin/spaces');
    } catch (err) {
      setError('Error al eliminar espacio');
    }
  };

  const tipos = [
    { value: 'aula', label: 'Aula' },
    { value: 'laboratorio', label: 'Laboratorio' },
    { value: 'sala', label: 'Sala' },
  ];

  const ubicaciones = [
    { value: 'primer_piso', label: 'Primer piso' },
    { value: 'segundo_piso', label: 'Segundo piso' },
    { value: 'tercer_piso', label: 'Tercer piso' },
  ];

  if (fetchLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="mt-3 text-muted">Cargando datos del espacio...</p>
      </div>
    );
  }

  return (
    <div className="space-form">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="mb-1">Editar espacio</h1>
          <p className="text-muted mb-0">Actualiza la informacion y disponibilidad del espacio.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-danger" onClick={handleDelete}>Eliminar espacio</button>
          <Link to="/admin/spaces" className="btn btn-outline-secondary">Volver</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="space-form-body">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">Datos generales</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="codigo" className="form-label">Codigo</label>
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
                  <div className="col-md-6">
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
                  <div className="col-12">
                    <label htmlFor="descripcion" className="form-label">Descripcion</label>
                    <textarea
                      className="form-control"
                      id="descripcion"
                      name="descripcion"
                      rows="3"
                      value={formData.descripcion}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">Caracteristicas</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="tipo" className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      id="tipo"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      required
                    >
                      {tipos.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="ubicacion" className="form-label">Ubicacion</label>
                    <select
                      className="form-select"
                      id="ubicacion"
                      name="ubicacion"
                      value={formData.ubicacion}
                      onChange={handleChange}
                      required
                    >
                      {ubicaciones.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="capacidad" className="form-label">Capacidad</label>
                    <input
                      type="number"
                      className="form-control"
                      id="capacidad"
                      name="capacidad"
                      min="0"
                      value={formData.capacidad}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="recursos" className="form-label">Recursos (separados por coma)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="recursos"
                      name="recursos"
                      value={formData.recursos}
                      onChange={handleChange}
                    />
                    {resourceChips.length > 0 && (
                      <div className="space-card-resources mt-2">
                        {resourceChips.map((resource) => (
                          <span key={resource} className="resource-pill">{resource}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="activo"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="activo">Espacio activo y visible para reservas</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Resumen</h5>
                <p className="text-muted small mb-3">Revisa los datos modificados antes de guardar.</p>
                <ul className="list-unstyled small mb-0">
                  <li><strong>Codigo:</strong> {formData.codigo || '---'}</li>
                  <li><strong>Nombre:</strong> {formData.nombre || '---'}</li>
                  <li><strong>Tipo:</strong> {tipos.find((item) => item.value === formData.tipo)?.label}</li>
                  <li><strong>Ubicacion:</strong> {ubicaciones.find((item) => item.value === formData.ubicacion)?.label}</li>
                  <li><strong>Capacidad:</strong> {formData.capacidad || 'No definida'}</li>
                  <li><strong>Recursos:</strong> {resourceChips.length ? resourceChips.join(', ') : 'Sin recursos'}</li>
                  <li><strong>Estado:</strong> {formData.activo ? 'Activo' : 'Inactivo'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Link to="/admin/spaces" className="btn btn-outline-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpaceEdit;
