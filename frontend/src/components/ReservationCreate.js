import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
    cantidad_asistentes: 1,
    requiere_llaves: false,
    recurrente: false,
    semanas_recurrencia: 16,
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
    <div className="reservation-form">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="mb-1">Solicitar reserva</h1>
          <p className="text-muted mb-0">Completa la siguiente informacion para que un responsable revise tu solicitud.</p>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/reservations')}>
            Volver a mis reservas
          </button>
        </div>
      </div>

      {slotPreselected && (
        <div className="alert alert-info">
          Seleccionaste una franja desde el calendario. Puedes ajustarla antes de enviar.
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="space-form-body">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">Espacio</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="espacio">Selecciona el espacio</label>
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
                  </div>
                  {selectedSpace && (
                    <div className="col-12">
                      <div className="alert alert-light border">
                        <h6 className="mb-1">Resumen del espacio</h6>
                        <p className="mb-0 small text-muted">
                          Codigo {selectedSpace.codigo} | Capacidad {selectedSpace.capacidad ?? 'N/D'} | Ubicacion {selectedSpace.ubicacion_display || selectedSpace.ubicacion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">Franja solicitada</div>
              <div className="card-body">
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
                    <label className="form-label d-block">Tipo de solicitud</label>
                    <div className="d-flex flex-wrap gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="tipo_reserva"
                          id="tipo_reserva_unica"
                          checked={!formData.recurrente}
                          onChange={() => handleReservationModeChange(false)}
                        />
                        <label className="form-check-label" htmlFor="tipo_reserva_unica">
                          Un solo dia
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="tipo_reserva"
                          id="tipo_reserva_semestre"
                          checked={formData.recurrente}
                          onChange={() => handleReservationModeChange(true)}
                        />
                        <label className="form-check-label" htmlFor="tipo_reserva_semestre">
                          Recurrente todo el semestre
                        </label>
                      </div>
                    </div>
                    <div className="form-text">
                      Usa esta opcion si necesitas reservar la misma franja semanalmente durante el semestre.
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
                      <div className="form-text">
                        La reserva se repetira semanalmente entre el {SEMESTER_RANGE_TEXT}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">Detalles adicionales</div>
              <div className="card-body">
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
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="requiere_llaves"
                        name="requiere_llaves"
                        checked={formData.requiere_llaves}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="requiere_llaves">Requiere llaves</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Resumen de solicitud</h5>
                <p className="text-muted small">Verifica la informacion antes de enviar.</p>
                <ul className="list-unstyled small mb-4">
                  <li><strong>Espacio:</strong> {selectedSpace?.nombre || 'No seleccionado'}</li>
                  <li><strong>Tipo:</strong> {selectedSpace?.tipo || '---'}</li>
                  <li><strong>Inicio:</strong> {formData.fecha_inicio ? new Date(formData.fecha_inicio).toLocaleString() : '--'}</li>
                  <li><strong>Fin:</strong> {formData.fecha_fin ? new Date(formData.fecha_fin).toLocaleString() : '--'}</li>
                  <li><strong>Asistentes:</strong> {formData.cantidad_asistentes || 0}</li>
                  <li><strong>Llaves:</strong> {formData.requiere_llaves ? 'Si' : 'No'}</li>
                  <li><strong>Recurrente:</strong> {formData.recurrente ? 'Si (recurrente)' : 'No'}</li>
                  {formData.recurrente && (
                    <>
                      <li><strong>Semanas:</strong> {formData.semanas_recurrencia || '--'}</li>
                      <li><strong>Rango semestre:</strong> {SEMESTER_RANGE_TEXT}</li>
                    </>
                  )}
                </ul>
                <div className="alert alert-light border small mb-0">
                  Al enviar, la solicitud quedara en estado pendiente hasta que el responsable la revise.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/reservations')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReservationCreate;
