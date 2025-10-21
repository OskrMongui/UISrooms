import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const SEMESTER_START = '2025-08-04';
const SEMESTER_END = '2025-11-28';
const SEMESTER_RANGE_TEXT = '04/08/2025 al 28/11/2025';

const buildWeeklyCountRrule = (startIso, weeks) => {
  const repetitions = Number(weeks);
  if (!startIso || !Number.isFinite(repetitions) || repetitions < 1 || !Number.isInteger(repetitions)) {
    return null;
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const weekday = WEEKDAY_CODES[start.getDay()] || 'MO';
  return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${weekday};COUNT=${repetitions}`;
};

const ReservationCreate = () => {
  const [spaces, setSpaces] = useState([]);
  const [formData, setFormData] = useState({
    espacio: '',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    cantidad_asistentes: 25,
    requiere_llaves: false,
    recurrente: false,
    semanas_recurrencia: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const slotPreselected = useMemo(
    () => Boolean(searchParams.get('inicio') && searchParams.get('fin')),
    [searchParams]
  );

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await api.get('espacios/');
        setSpaces(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Error al cargar espacios');
      }
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    const espacio = searchParams.get('espacio');
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    if (!espacio && !inicio && !fin) return;

    setFormData((prev) => ({
      ...prev,
      espacio: espacio || prev.espacio,
      fecha_inicio: inicio || prev.fecha_inicio,
      fecha_fin: fin || prev.fecha_fin,
    }));
  }, [searchParams]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => String(space.id) === String(formData.espacio)),
    [spaces, formData.espacio]
  );

  const handleReservationModeChange = (isRecurrent) => {
    setFormData((prev) => {
      if (!isRecurrent) {
        return {
          ...prev,
          recurrente: false,
        };
      }

      const defaultWeeks =
        prev.semanas_recurrencia && Number(prev.semanas_recurrencia) > 0 ? prev.semanas_recurrencia : 16;

      return {
        ...prev,
        recurrente: true,
        semanas_recurrencia: defaultWeeks,
      };
    });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
            ? value === '' ? '' : Number(value)
            : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.espacio || !formData.fecha_inicio || !formData.fecha_fin) {
      setError('Debes completar el espacio y la franja horaria de la reserva.');
      setLoading(false);
      return;
    }

    let metadata = {};
    let rrule = null;

    if (formData.recurrente) {
      const semanas = Number(formData.semanas_recurrencia);
      if (!Number.isFinite(semanas) || semanas < 1 || !Number.isInteger(semanas)) {
        setError('Indica un numero valido de semanas para la reserva recurrente.');
        setLoading(false);
        return;
      }

      rrule = buildWeeklyCountRrule(formData.fecha_inicio, semanas);
      if (!rrule) {
        setError('No se pudo generar la regla de recurrencia. Verifica la fecha inicial y el numero de semanas.');
        setLoading(false);
        return;
      }

      const startDate = new Date(formData.fecha_inicio);
      const endDate = new Date(formData.fecha_fin);
      const durationMinutes = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())
        ? null
        : Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));

      const weekdayCode = Number.isNaN(startDate.getTime()) ? null : WEEKDAY_CODES[startDate.getDay()];

      metadata = {
        recurrencia: {
          tipo: 'semestre',
          semanas,
          inicio: SEMESTER_START,
          fin: SEMESTER_END,
          semestre_inicio: SEMESTER_START,
          semestre_fin: SEMESTER_END,
          ...(weekdayCode ? { dia_semana: weekdayCode } : {}),
          horario_inicio: formData.fecha_inicio,
          horario_fin: formData.fecha_fin,
          ...(durationMinutes ? { duracion_minutos: durationMinutes } : {}),
        },
      };
    }

    const payload = {
      espacio: formData.espacio,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      motivo: formData.motivo,
      cantidad_asistentes:
        formData.cantidad_asistentes === '' ? null : Number(formData.cantidad_asistentes),
      requiere_llaves: formData.requiere_llaves,
      recurrente: formData.recurrente,
      semestre_inicio: formData.recurrente ? SEMESTER_START : null,
      semestre_fin: formData.recurrente ? SEMESTER_END : null,
      rrule,
      metadata,
    };

    try {
      await api.post('reservas/', payload);
      setSuccess('Solicitud enviada. Recibiras una notificacion cuando sea revisada.');
      setTimeout(() => navigate('/reservations'), 1200);
    } catch (err) {
      const serverMsg = err.response?.data;
      const readable =
        typeof serverMsg === 'string'
          ? serverMsg
          : serverMsg?.detail || serverMsg?.non_field_errors?.[0] || 'Error al crear reserva';
      setError(readable);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reservation-create container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <p className="text-uppercase small mb-2">Nueva solicitud</p>
            <h1 className="mb-2">Reserva un espacio institucional</h1>
            <p className="mb-0">
              Define el espacio, la franja horaria y los detalles clave para que el equipo encargado pueda aprobar tu solicitud.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/reservations" className="btn btn-outline-success">
              Ver mis reservas
            </Link>
            <Link to="/spaces" className="btn btn-success fw-semibold">
              Explorar espacios
            </Link>
          </div>
        </div>
      </div>

      {slotPreselected && (
        <div className="card-elevated bg-white p-3 mb-4">
          <div className="d-flex align-items-start gap-3">
            <span className="form-step-badge">i</span>
            <div>
              <h2 className="h6 mb-1 text-success">Franja precargada</h2>
              <p className="form-hint mb-0">
                Seleccionaste una franja desde el calendario. Ajusta las fechas antes de enviar si es necesario.
              </p>
            </div>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-form-body">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="form-panel card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="form-section-header">
                  <div className="d-flex align-items-center gap-3">
                    <span className="form-step-badge">01</span>
                    <div>
                      <h2>Selecciona el espacio</h2>
                      <p>Elige el aula o laboratorio ideal para tu actividad.</p>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="espacio">Espacio disponible</label>
                    <select
                      id="espacio"
                      name="espacio"
                      className="form-select"
                      value={formData.espacio}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar espacio</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.nombre} ({space.tipo})
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Si no encuentras el espacio deseado, verifica su disponibilidad desde el catalogo de espacios.
                    </p>
                  </div>
                  {selectedSpace && (
                    <div className="col-12">
                      <div className="surface-muted small">
                        <strong className="d-block mb-1 text-success">{selectedSpace.nombre}</strong>
                        <div className="d-flex flex-wrap gap-3">
                          <span>Codigo: {selectedSpace.codigo}</span>
                          <span>Capacidad: {selectedSpace.capacidad ?? 'N/D'}</span>
                          <span>Ubicacion: {selectedSpace.ubicacion_display || selectedSpace.ubicacion || 'Sin definir'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-panel card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="form-section-header">
                  <div className="d-flex align-items-center gap-3">
                    <span className="form-step-badge">02</span>
                    <div>
                      <h2>Define la franja de uso</h2>
                      <p>Indica las fechas y modalidad de tu reserva.</p>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="fecha_inicio">Fecha y hora de inicio</label>
                    <input
                      type="datetime-local"
                      id="fecha_inicio"
                      name="fecha_inicio"
                      className="form-control"
                      value={formData.fecha_inicio}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="fecha_fin">Fecha y hora de fin</label>
                    <input
                      type="datetime-local"
                      id="fecha_fin"
                      name="fecha_fin"
                      className="form-control"
                      value={formData.fecha_fin}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <span className="text-muted text-uppercase small">Tipo de solicitud</span>
                    <div className="d-flex flex-column gap-2 mt-2">
                      <label className="form-option-card" htmlFor="tipo_reserva_unica">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="tipo_reserva"
                          id="tipo_reserva_unica"
                          checked={!formData.recurrente}
                          onChange={() => handleReservationModeChange(false)}
                        />
                        <div>
                          <strong>Un solo dia</strong>
                          <p className="form-hint mb-0">Reserva puntual ideal para reuniones, examenes o eventos unicos.</p>
                        </div>
                      </label>
                      <label className="form-option-card" htmlFor="tipo_reserva_semestre">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="tipo_reserva"
                          id="tipo_reserva_semestre"
                          checked={formData.recurrente}
                          onChange={() => handleReservationModeChange(true)}
                        />
                        <div>
                          <strong>Recurrente</strong>
                          <p className="form-hint mb-0">Perfecto para clases o actividades semanales dentro del calendario academico.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  {formData.recurrente && (
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="semanas_recurrencia">Numero de semanas</label>
                      <input
                        type="number"
                        id="semanas_recurrencia"
                        name="semanas_recurrencia"
                        className="form-control"
                        min="1"
                        value={formData.semanas_recurrencia}
                        onChange={handleChange}
                        required
                      />
                      <p className="form-hint mb-0">
                        La reserva se repetira semanalmente entre el {SEMESTER_RANGE_TEXT}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-panel card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="form-section-header">
                  <div className="d-flex align-items-center gap-3">
                    <span className="form-step-badge">03</span>
                    <div>
                      <h2>Cuentanos los detalles</h2>
                      <p>Comparte el objetivo de la reserva y los recursos que requieres.</p>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="motivo">Motivo</label>
                    <textarea
                      id="motivo"
                      name="motivo"
                      className="form-control"
                      rows="3"
                      value={formData.motivo}
                      onChange={handleChange}
                      placeholder="Describe el uso que se dara al espacio"
                    />
                    <p className="form-hint mb-0">Incluye actividades, asistentes clave o requerimientos especiales.</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="cantidad_asistentes">Cantidad de asistentes</label>
                    <input
                      type="number"
                      id="cantidad_asistentes"
                      name="cantidad_asistentes"
                      className="form-control"
                      min="1"
                      value={formData.cantidad_asistentes}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <label className="form-option-card w-100 mb-0" htmlFor="requiere_llaves">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="requiere_llaves"
                        name="requiere_llaves"
                        checked={formData.requiere_llaves}
                        onChange={handleChange}
                      />
                      <div>
                        <strong>Necesito acceso con llaves</strong>
                        <p className="form-hint mb-0">Marcalo si debes retirar llaves en la porteria o coordinacion.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="form-panel card border-0 shadow-sm summary-card">
              <div className="card-body">
                <div className="form-section-header">
                  <div className="d-flex align-items-center gap-3">
                    <span className="form-step-badge">04</span>
                    <div>
                      <h2>Resumen de la solicitud</h2>
                      <p>Revisa los datos antes de enviar la reserva.</p>
                    </div>
                  </div>
                </div>
                <div className="surface-muted small">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Espacio</span>
                    <span className="fw-semibold text-success">{selectedSpace?.nombre || 'No seleccionado'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tipo</span>
                    <span>{selectedSpace?.tipo || '---'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Inicio</span>
                    <span>{formData.fecha_inicio ? new Date(formData.fecha_inicio).toLocaleString() : '--'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Fin</span>
                    <span>{formData.fecha_fin ? new Date(formData.fecha_fin).toLocaleString() : '--'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Asistentes</span>
                    <span>{formData.cantidad_asistentes || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Llaves</span>
                    <span>{formData.requiere_llaves ? 'Si' : 'No'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Recurrente</span>
                    <span>{formData.recurrente ? 'Si' : 'No'}</span>
                  </div>
                  {formData.recurrente && (
                    <div className="mt-2 text-muted d-flex justify-content-between">
                      <span>Semanas</span>
                      <span>{formData.semanas_recurrencia || '--'} ({SEMESTER_RANGE_TEXT})</span>
                    </div>
                  )}
                </div>
                <p className="form-hint mb-0 mt-3">
                  Una vez enviada, la solicitud quedara en estado pendiente hasta la validacion del responsable del espacio.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/reservations')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-cta" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReservationCreate;
