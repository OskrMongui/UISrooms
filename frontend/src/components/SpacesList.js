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

const SpacesList = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [floorFilter, setFloorFilter] = useState('todos');

  useEffect(() => {
    const fetchSpaces = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('espacios/');
        setSpaces(response.data);
      } catch (err) {
        setError('No pudimos cargar los espacios disponibles.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  const typeOptions = useMemo(() => {
    const set = new Set();
    spaces.forEach((space) => {
      if (space.tipo) set.add(space.tipo);
    });
    return Array.from(set);
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
    const capacity = spaces.reduce((sum, space) => sum + (Number(space.capacidad) || 0), 0);
    const hasResources = spaces.filter((space) => Array.isArray(space.recursos) && space.recursos.length > 0).length;
    return { total, capacity, hasResources };
  }, [spaces]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="text-muted mt-3">Buscando espacios disponibles...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="spaces-home container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Directorio de espacios</p>
            <h1 className="mb-2">Explora aulas, salas y laboratorios UIS</h1>
            <p className="mb-0">
              Consulta capacidades, recursos disponibles y accede a la disponibilidad en tiempo real antes de realizar tu solicitud.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/reservations" className="btn btn-outline-success">
              Ver mis reservas
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card-elevated h-100 p-4 bg-white">
            <p className="text-muted text-uppercase small mb-1">Espacios</p>
            <div className="display-6 fw-semibold text-success mb-1">{stats.total}</div>
            <span className="text-muted small">Registrados en la plataforma</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-elevated h-100 p-4 bg-white">
            <p className="text-muted text-uppercase small mb-1">Capacidad total</p>
            <div className="display-6 fw-semibold text-success mb-1">{stats.capacity}</div>
            <span className="text-muted small">Suma de aforos registrados</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-elevated h-100 p-4 bg-white">
            <p className="text-muted text-uppercase small mb-1">Con recursos</p>
            <div className="display-6 fw-semibold text-success mb-1">{stats.hasResources}</div>
            <span className="text-muted small">Equipados para actividades especializadas</span>
          </div>
        </div>
      </div>

      <div className="card-elevated mb-4 p-4 bg-white">
        <div className="row g-3 align-items-end">
          <div className="col-lg-5">
            <label className="form-label text-muted small" htmlFor="spacesSearch">Buscar espacio</label>
            <input
              id="spacesSearch"
              type="search"
              className="form-control"
              placeholder="Nombre, codigo o palabra clave"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <label className="form-label text-muted small" htmlFor="spacesType">Tipo</label>
            <select
              id="spacesType"
              className="form-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>{TYPE_LABELS[option] || option}</option>
              ))}
            </select>
          </div>
          <div className="col-lg-3 col-md-6">
            <label className="form-label text-muted small" htmlFor="spacesFloor">Ubicacion</label>
            <select
              id="spacesFloor"
              className="form-select"
              value={floorFilter}
              onChange={(event) => setFloorFilter(event.target.value)}
            >
              <option value="todos">Todas</option>
              {floorOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="col-lg-1 col-md-6 d-grid">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('todos');
                setFloorFilter('todos');
              }}
              disabled={!searchTerm && typeFilter === 'todos' && floorFilter === 'todos'}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="empty-state">
          <h4 className="mb-2">No encontramos espacios con esos filtros</h4>
          <p className="text-muted mb-3">Intenta ampliar tu busqueda o explora todos los espacios disponibles.</p>
          <button className="btn btn-success" onClick={() => {
            setSearchTerm('');
            setTypeFilter('todos');
            setFloorFilter('todos');
          }}>
            Ver todos los espacios
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {filteredSpaces.map((space) => (
            <div key={space.id} className="col-xl-4 col-lg-6">
              <div className="space-card h-100">
                <div className="space-card-header d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex flex-wrap gap-2">
                    {space.tipo && <span className="badge badge-soft">{TYPE_LABELS[space.tipo] || space.tipo}</span>}
                    <span className="badge badge-soft-secondary">{space.ubicacion_display || FLOOR_LABELS[space.ubicacion] || 'Ubicacion sin definir'}</span>
                  </div>
                </div>
                <div className="space-card-title mb-2">
                  <h5 className="mb-1">{space.nombre}</h5>
                  <p className="text-muted small mb-0">Codigo {space.codigo}</p>
                </div>
                <p className="text-muted mb-3">{space.descripcion || 'Sin descripcion registrada.'}</p>
                <div className="mb-3">
                  <span className="badge badge-soft me-2">Capacidad {space.capacidad ?? 'N/D'}</span>
                  {Array.isArray(space.recursos) && space.recursos.length > 0 && (
                    <span className="badge badge-soft-secondary">Recursos {space.recursos.length}</span>
                  )}
                </div>
                {Array.isArray(space.recursos) && space.recursos.length > 0 && (
                  <div className="space-card-resources mb-3">
                    {space.recursos.slice(0, 3).map((resource) => (
                      <span key={resource} className="resource-pill">{resource}</span>
                    ))}
                    {space.recursos.length > 3 && <span className="resource-pill more-pill">+{space.recursos.length - 3}</span>}
                  </div>
                )}
                <div className="space-card-actions mt-auto">
                  <Link to={`/spaces/${space.id}`} className="btn btn-outline-success">
                    Ver disponibilidad
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpacesList;
