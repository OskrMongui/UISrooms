import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../api';

const REPORT_OPTIONS = {
  aperturas: {
    title: 'Reporte de aperturas',
    summary: 'Listado de aperturas registradas por el personal de conserjeria.',
    columns: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora', label: 'Hora' },
      { key: 'aula', label: 'Aula' },
      { key: 'solicitante', label: 'Profesor/Solicitante' },
    ],
  },
  ausencias: {
    title: 'Reporte de ausencias',
    summary: 'Ausencias registradas y vinculadas a cada reserva o curso.',
    columns: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora_registro', label: 'Hora registro' },
      { key: 'aula', label: 'Aula' },
      { key: 'codigo_materia', label: 'Materia' },
      { key: 'codigo_grupo', label: 'Grupo' },
      { key: 'tipo_uso', label: 'Tipo de uso' },
      { key: 'observaciones', label: 'Observaciones' },
    ],
  },
  incidencias: {
    title: 'Reporte de incidencias',
    summary: 'Incidencias reportadas con su tipo, estado y descripcion.',
    columns: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'espacio', label: 'Espacio' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'estado', label: 'Estado' },
    ],
  },
};

const initialState = {
  aperturas: { total: 0, resultados: [] },
  ausencias: { total: 0, resultados: [] },
  incidencias: { total: 0, resultados: [] },
};

const AdminReports = () => {
  const [activeReport, setActiveReport] = useState('aperturas');
  const [reportsData, setReportsData] = useState(initialState);
  const [filters, setFilters] = useState({ inicio: '', fin: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentConfig = useMemo(
    () => REPORT_OPTIONS[activeReport],
    [activeReport]
  );

  const buildParams = useCallback(
    (overrideFilters) => {
      const params = {};
      const source = overrideFilters || filters;
      if (source.inicio) params.inicio = source.inicio;
      if (source.fin) params.fin = source.fin;
      return params;
    },
    [filters]
  );

  const fetchReport = useCallback(
    async (reportKey, overrideFilters) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`reportes/${reportKey}/`, {
          params: buildParams(overrideFilters),
        });
        setReportsData((prev) => ({
          ...prev,
          [reportKey]: {
            total: response.data?.total ?? 0,
            resultados: response.data?.resultados ?? [],
          },
        }));
      } catch (err) {
        const message =
          err.response?.data?.detail ||
          err.message ||
          'No se pudo obtener el reporte.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport, fetchReport]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    fetchReport(activeReport);
  };

  const handleClearFilters = () => {
    setFilters({ inicio: '', fin: '' });
    fetchReport(activeReport, { inicio: '', fin: '' });
  };

  const handleQuickRange = (days) => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);
    const updated = { inicio: start, fin: end };
    setFilters(updated);
    fetchReport(activeReport, updated);
  };

  const renderTableBody = (rows, columns) => {
    if (!rows.length) {
      return (
        <tr>
          <td colSpan={columns.length} className="text-center text-muted py-4">
            No hay registros para los filtros seleccionados.
          </td>
        </tr>
      );
    }

    return rows.map((row, index) => (
      <tr key={`${activeReport}-${index}`}>
        {columns.map((column) => (
          <td key={column.key} className="align-middle">
            {row[column.key] ?? '—'}
          </td>
        ))}
      </tr>
    ));
  };

  const { total, resultados } = reportsData[activeReport];

  return (
    <div className="admin-reports">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="h4 mb-1">{currentConfig.title}</h2>
          <p className="text-muted mb-0">{currentConfig.summary}</p>
        </div>
        <div className="btn-group" role="group" aria-label="Selector de reporte">
          {Object.entries(REPORT_OPTIONS).map(([key, config]) => (
            <button
              type="button"
              key={key}
              className={`btn btn-sm ${
                activeReport === key ? 'btn-success' : 'btn-outline-success'
              }`}
              onClick={() => setActiveReport(key)}
            >
              {config.title.replace('Reporte de ', '')}
            </button>
          ))}
        </div>
      </div>

      <section className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form
            className="row gy-3 gx-3 align-items-end"
            onSubmit={handleApplyFilters}
          >
            <div className="col-sm-6 col-md-4 col-lg-3">
              <label htmlFor="inicio" className="form-label text-muted small mb-1">
                Desde
              </label>
              <input
                type="date"
                id="inicio"
                name="inicio"
                className="form-control"
                value={filters.inicio}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3">
              <label htmlFor="fin" className="form-label text-muted small mb-1">
                Hasta
              </label>
              <input
                type="date"
                id="fin"
                name="fin"
                className="form-control"
                value={filters.fin}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-4 col-lg-3 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-success flex-fill"
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Aplicar filtros'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClearFilters}
                disabled={loading && !filters.inicio && !filters.fin}
              >
                Limpiar
              </button>
            </div>
            <div className="col-lg-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-success btn-sm flex-fill"
                onClick={() => handleQuickRange(1)}
                disabled={loading}
              >
                Hoy
              </button>
              <button
                type="button"
                className="btn btn-outline-success btn-sm flex-fill"
                onClick={() => handleQuickRange(7)}
                disabled={loading}
              >
                Ultimos 7 dias
              </button>
              <button
                type="button"
                className="btn btn-outline-success btn-sm flex-fill"
                onClick={() => handleQuickRange(30)}
                disabled={loading}
              >
                Ultimos 30 dias
              </button>
            </div>
          </form>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <section className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h5 mb-0">Resultados</h3>
            <span className="badge bg-success-subtle text-success">
              Total: {total}
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  {currentConfig.columns.map((column) => (
                    <th key={column.key} scope="col">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderTableBody(resultados, currentConfig.columns)}</tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminReports;
