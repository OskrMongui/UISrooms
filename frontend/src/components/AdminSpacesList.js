import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const TYPE_LABELS = {
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  sala: 'Sala',
};

const FLOOR_LABELS = {
  primer_piso: 'Primer piso',
  segundo_piso: 'Segundo piso',
  tercer_piso: 'Tercer piso',
};

const AdminSpacesList = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [floorFilter, setFloorFilter] = useState('todos');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSpaces = async (withSpinner = true) => {
    if (withSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      const response = await api.get('espacios/');
      setSpaces(response.data);
    } catch (err) {
      setError('No fue posible cargar los espacios. Intentalo de nuevo.');
    } finally {
      if (withSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const typeOptions = useMemo(() => {
    const unique = new Set();
    spaces.forEach((space) => {
      if (space.tipo) unique.add(space.tipo);
    });
    return Array.from(unique);
  }, [spaces]);

  const floorOptions = useMemo(() => {
    const map = new Map();
    spaces.forEach((space) => {
      if (space.ubicacion) {
        map.set(space.ubicacion, space.ubicacion_display || FLOOR_LABELS[space.ubicacion] || space.ubicacion);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [spaces]);

  const filteredSpaces = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return spaces.filter((space) => {
      const matchesSearch =
        !term ||
        [space.nombre, space.codigo, space.descripcion]
          .filter(Boolean)
          .some((field) => field.toString().toLowerCase().includes(term));

      const matchesType = typeFilter === 'todos' || space.tipo === typeFilter;
      const matchesFloor = floorFilter === 'todos' || space.ubicacion === floorFilter;
      return matchesSearch && matchesType && matchesFloor;
    });
  }, [spaces, searchTerm, typeFilter, floorFilter]);

  const stats = useMemo(() => {
    const total = spaces.length;
    const active = spaces.filter((space) => space.activo).length;
    const withResources = spaces.filter((space) => Array.isArray(space.recursos) && space.recursos.length > 0).length;
    return {
      total,
      active,
      inactive: total - active,
      withResources,
    };
  }, [spaces]);

  const getTypeLabel = (key) => {
    if (!key) return 'Sin tipo';
    if (TYPE_LABELS[key]) return TYPE_LABELS[key];
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const getFloorLabel = (space) => {
    if (!space) return 'Sin ubicacion';
    return space.ubicacion_display || FLOOR_LABELS[space.ubicacion] || space.ubicacion || 'Sin ubicacion';
  };

  const formatUpdatedAt = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminaras el espacio y sus horarios asociados. Deseas continuar?')) {
      return;
    }
    setDeletingId(id);
    setError('');
    try {
      await api.delete(`espacios/${id}/`);
      setSpaces((prev) => prev.filter((space) => space.id !== id));
    } catch (err) {
      setError('No se pudo eliminar el espacio. Revisa la conexion o intenta mas tarde.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('todos');
    setFloorFilter('todos');
  };

  const hasActiveFilters = Boolean(searchTerm) || typeFilter !== 'todos' || floorFilter !== 'todos';

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="text-muted mt-3">Cargando espacios...</p>
      </div>
    );
  }

  const isEmpty = filteredSpaces.length === 0;

  return (
    <div className="admin-spaces">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="mb-1">Administrar espacios</h1>
          <p className="text-muted mb-0">Gestiona aulas, laboratorios y salas desde un solo lugar.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={() => fetchSpaces(false)}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <Link to="/admin/spaces/create" className="btn btn-success">
            Crear nuevo espacio
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card stats-card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Espacios totales</p>
              <div className="display-number">{stats.total}</div>
              <span className="text-muted small">Incluye todos los tipos registrados</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stats-card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Activos</p>
              <div className="display-number text-success">{stats.active}</div>
              <span className="text-muted small">{stats.inactive} inactivos actualmente</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stats-card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted text-uppercase small mb-1">Con recursos</p>
              <div className="display-number text-primary">{stats.withResources}</div>
              <span className="text-muted small">Espacios con equipamiento registrado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card admin-spaces-toolbar border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <label className="form-label text-muted small" htmlFor="searchSpaces">Buscar</label>
              <input
                id="searchSpaces"
                type="search"
                className="form-control"
                placeholder="Nombre, codigo o descripcion"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="form-label text-muted small" htmlFor="filterType">Tipo</label>
              <select
                id="filterType"
                className="form-select"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="todos">Todos los tipos</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{getTypeLabel(option)}</option>
                ))}
              </select>
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="form-label text-muted small" htmlFor="filterFloor">Ubicacion</label>
              <select
                id="filterFloor"
                className="form-select"
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
              >
                <option value="todos">Todas las ubicaciones</option>
                {floorOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-6 d-grid">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <h4 className="mb-2">No encontramos espacios para tu busqueda</h4>
          <p className="text-muted mb-3">Prueba ajustando los filtros o creando un nuevo espacio.</p>
          <Link to="/admin/spaces/create" className="btn btn-success">
            Crear espacio
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {filteredSpaces.map((space) => {
            const updatedAt = formatUpdatedAt(space.actualizado_en);
            return (
              <div key={space.id} className="col-xl-4 col-lg-6">
                <div className="space-card h-100">
                  <div className="space-card-header d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex flex-wrap gap-2">
                      <span className="badge badge-soft">{getTypeLabel(space.tipo)}</span>
                      <span className="badge badge-soft-secondary">{getFloorLabel(space)}</span>
                    </div>
                    <span className={`badge ${space.activo ? 'badge-soft' : 'badge-soft-secondary'}`}>
                      {space.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-card-title mb-2">
                    <h5 className="mb-1">{space.nombre}</h5>
                    <p className="text-muted small mb-0">{space.codigo}</p>
                  </div>

                  <p className="text-muted mb-3">{space.descripcion || 'Sin descripcion registrada.'}</p>

                  <div className="mb-3">
                    <span className="badge badge-soft me-2">Capacidad {space.capacidad ?? 'N/D'}</span>
                    {updatedAt && <span className="text-muted small">Actualizado {updatedAt}</span>}
                  </div>

                  {Array.isArray(space.recursos) && space.recursos.length > 0 && (
                    <div className="space-card-resources mb-3">
                      {space.recursos.slice(0, 4).map((resource) => (
                        <span key={resource} className="resource-pill">{resource}</span>
                      ))}
                      {space.recursos.length > 4 && (
                        <span className="resource-pill more-pill">+{space.recursos.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="space-card-actions mt-auto">
                    <Link to={`/admin/spaces/${space.id}/edit`} className="btn btn-outline-success">
                      Editar
                    </Link>
                    <Link to={`/admin/spaces/${space.id}/schedule`} className="btn btn-outline-primary">
                      Bloqueos
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(space.id)}
                      disabled={deletingId === space.id}
                    >
                      {deletingId === space.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSpacesList;
