import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api';

const localizer = momentLocalizer(moment);
moment.locale('es');
moment.updateLocale('es', { week: { dow: 1 } });

const INITIAL_FORM = {
  dia_semana: '',
  hora_inicio: '',
  hora_fin: '',
  fecha_inicio: '',
  fecha_fin: '',
  recurrente: false,
  observaciones: ''
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Lunes' },
  { value: '1', label: 'Martes' },
  { value: '2', label: 'Miércoles' },
  { value: '3', label: 'Jueves' },
  { value: '4', label: 'Viernes' },
  { value: '5', label: 'Sábado' },
  { value: '6', label: 'Domingo' }
];

const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 20;
const STEP_MINUTES = 30;

const MIN_TIME = new Date(1970, 0, 1, CALENDAR_START_HOUR, 0, 0);
const MAX_TIME = new Date(1970, 0, 1, CALENDAR_END_HOUR, 0, 0);
const SCROLL_TIME = new Date(1970, 0, 1, 8, 0, 0);

const CALENDAR_MESSAGES = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay bloqueos en el rango seleccionado'
};

const withSeconds = (value) => {
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
};

const clampToWorkingHours = (momentInstance) => {
  if (!momentInstance) return;
  if (momentInstance.hour() < CALENDAR_START_HOUR) {
    momentInstance.hour(CALENDAR_START_HOUR).minute(0).second(0).millisecond(0);
  }
  if (momentInstance.hour() > CALENDAR_END_HOUR || (momentInstance.hour() === CALENDAR_END_HOUR && momentInstance.minute() > 0)) {
    momentInstance.hour(CALENDAR_END_HOUR).minute(0).second(0).millisecond(0);
  }
};

const isoWeekdayToIndex = (momentInstance) => {
  if (!momentInstance) return 0;
  const iso = momentInstance.isoWeekday(); // 1-7 (1 = lunes, 7 = domingo)
  return iso === 7 ? 6 : iso - 1;
};

const normalizeHourValue = (value) => {
  if (!value) return null;
  const normalized = withSeconds(value);
  const reference = moment(`2000-01-01 ${normalized}`, 'YYYY-MM-DD HH:mm:ss', true);
  return reference.isValid() ? reference : null;
};

const SpaceScheduleCreate = () => {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSpace = useCallback(async () => {
    try {
      const response = await api.get(`espacios/${id}/`);
      setSpace(response.data);
    } catch (err) {
      setError('Error al cargar el espacio seleccionado.');
    }
  }, [id]);

  const loadBlocks = useCallback(async () => {
    try {
      const response = await api.get(`espacios-disponibilidad/?espacio=${id}&bloqueo=true`);
      setBlocks(response.data);
    } catch (err) {
      setError('Error al cargar los bloqueos del espacio.');
    }
  }, [id]);

  useEffect(() => {
    loadSpace();
  }, [loadSpace]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const events = useMemo(() => {
    if (!blocks.length) return [];

    const rangeStart =
      view === 'month'
        ? moment(date).startOf('month')
        : view === 'week'
          ? moment(date).startOf('week')
          : moment(date).startOf('day');
    const rangeEnd =
      view === 'month'
        ? moment(date).endOf('month')
        : view === 'week'
          ? moment(date).endOf('week')
          : moment(date).endOf('day');

    const buildEvent = (startMoment, endMoment, resource) => {
      if (!startMoment.isValid() || !endMoment.isValid()) return null;
      if (endMoment.isSameOrBefore(startMoment)) return null;
      return {
        title: `${startMoment.format('HH:mm')} - ${endMoment.format('HH:mm')}${resource.observaciones ? ` (${resource.observaciones})` : ''}`,
        start: startMoment.toDate(),
        end: endMoment.toDate(),
        allDay: false,
        resource
      };
    };

    const generated = [];

    blocks.forEach((block) => {
      const startTime = withSeconds(block.hora_inicio);
      const endTime = withSeconds(block.hora_fin);

      if (!startTime || !endTime) {
        return;
      }

      if (block.recurrente && block.dia_semana !== null && block.dia_semana !== undefined) {
        const weekday = parseInt(block.dia_semana, 10);
        if (Number.isNaN(weekday)) return;

        let current = rangeStart.clone().startOf('week').add(weekday, 'days');
        if (current.isBefore(rangeStart)) {
          current = current.add(7, 'days');
        }

        while (current.isSameOrBefore(rangeEnd, 'day')) {
          const startMoment = moment(`${current.format('YYYY-MM-DD')} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
          const endMoment = moment(`${current.format('YYYY-MM-DD')} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');
          const event = buildEvent(startMoment, endMoment, block);
          if (event) generated.push(event);
          current = current.add(7, 'days');
        }
      } else if (!block.recurrente && block.fecha_inicio && block.fecha_fin) {
        const startMoment = moment(`${block.fecha_inicio} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
        const endMoment = moment(`${block.fecha_fin} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');

        if (endMoment.isBefore(rangeStart) || startMoment.isAfter(rangeEnd)) {
          return;
        }

        const event = buildEvent(startMoment, endMoment, block);
        if (event) generated.push(event);
      }
    });

    return generated;
  }, [blocks, date, view]);

  const handleSelectSlot = useCallback(
    ({ start, end }) => {
      const startMoment = moment(start);
      const endMoment = moment(end || start);

      if (startMoment.isSame(endMoment)) {
        endMoment.add(STEP_MINUTES, 'minutes');
      }

      clampToWorkingHours(startMoment);
      clampToWorkingHours(endMoment);

      if (endMoment.isSameOrBefore(startMoment)) {
        endMoment.add(STEP_MINUTES, 'minutes');
        clampToWorkingHours(endMoment);
      }

      setSelectedDate(startMoment.toDate());
      setFormData({
        dia_semana: '',
        hora_inicio: startMoment.format('HH:mm'),
        hora_fin: endMoment.format('HH:mm'),
        fecha_inicio: startMoment.format('YYYY-MM-DD'),
        fecha_fin: endMoment.format('YYYY-MM-DD'),
        recurrente: false,
        observaciones: ''
      });
      setShowModal(true);
      setError('');
    },
    []
  );

  const handleNavigate = (newDate, newView) => {
    setDate(newDate);
    setView(newView);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setView('day');
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'recurrente') {
      const newValue = type === 'checkbox' ? checked : value;
      const baseDate = selectedDate ? moment(selectedDate) : moment();
      const weekdayIndex = isoWeekdayToIndex(baseDate);

      setFormData((prev) => ({
        ...prev,
        recurrente: newValue,
        dia_semana: newValue ? String(weekdayIndex) : '',
        fecha_inicio: newValue ? '' : baseDate.format('YYYY-MM-DD'),
        fecha_fin: newValue ? '' : baseDate.format('YYYY-MM-DD')
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const startMoment = normalizeHourValue(formData.hora_inicio);
    const endMoment = normalizeHourValue(formData.hora_fin);

    if (!startMoment || !endMoment) {
      return 'Las horas de inicio y fin son requeridas y deben tener formato HH:mm.';
    }

    if (startMoment.hour() < CALENDAR_START_HOUR || endMoment.hour() > CALENDAR_END_HOUR || (endMoment.hour() === CALENDAR_END_HOUR && endMoment.minute() > 0)) {
      return 'Los bloqueos deben estar dentro de la franja 06:00 - 20:00.';
    }

    if (!endMoment.isAfter(startMoment)) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    if (formData.recurrente) {
      if (formData.dia_semana === '' || formData.dia_semana === null) {
        return 'Selecciona un día de la semana para el bloqueo recurrente.';
      }
    } else {
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        return 'Debes definir fecha de inicio y fin del bloqueo.';
      }
      const startDate = moment(formData.fecha_inicio, 'YYYY-MM-DD', true);
      const endDate = moment(formData.fecha_fin, 'YYYY-MM-DD', true);
      if (!startDate.isValid() || !endDate.isValid()) {
        return 'Las fechas deben tener formato válido (YYYY-MM-DD).';
      }
      if (endDate.isBefore(startDate)) {
        return 'La fecha de inicio no puede ser posterior a la fecha fin.';
      }
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        espacio: id,
        es_bloqueo: true,
        recurrente: !!formData.recurrente,
        hora_inicio: withSeconds(formData.hora_inicio),
        hora_fin: withSeconds(formData.hora_fin),
        observaciones: formData.observaciones || null
      };

      if (formData.recurrente) {
        payload.dia_semana = parseInt(formData.dia_semana, 10);
      } else {
        payload.dia_semana = null;
        payload.fecha_inicio = formData.fecha_inicio;
        payload.fecha_fin = formData.fecha_fin;
      }

      await api.post('espacios-disponibilidad/', payload);
      await loadBlocks();
      setShowModal(false);
      setFormData(INITIAL_FORM);
    } catch (err) {
      const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
      setError(`No se pudo registrar el bloqueo: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = useCallback(
    async (block) => {
      if (!block?.id) return;
      const confirmDelete = window.confirm('Eliminar este bloqueo y volver a liberar el horario?');
      if (!confirmDelete) return;

      try {
        await api.delete(`espacios-disponibilidad/${block.id}/`);
        await loadBlocks();
      } catch (err) {
        const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
        setError(`No se pudo eliminar el bloqueo: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
      }
    },
    [loadBlocks]
  );

  const eventPropGetter = useCallback(() => {
    return {
      className: 'space-block-event',
      style: {
        backgroundColor: '#dc3545',
        borderColor: '#dc3545',
        color: '#fff'
      }
    };
  }, []);

  const calendarComponents = useMemo(
    () => ({
      toolbar: () => null
    }),
    []
  );

  if (!space) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3">Bloqueos de {space.nombre}</h1>

      <div className="alert alert-info">
        El espacio queda disponible automáticamente de <strong>06:00</strong> a <strong>20:00</strong> todos los días. Usa este calendario para
        bloquear franjas específicas (por ejemplo, mantenimientos o eventos). Selecciona un rango sobre el calendario para crear un bloqueo.
        Haz clic sobre un bloqueo existente para eliminarlo.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group" role="group">
          <button className="btn btn-outline-success" onClick={() => setView('month')}>Mes</button>
          <button className="btn btn-outline-success" onClick={() => setView('week')}>Semana</button>
          <button className="btn btn-outline-success" onClick={() => setView('day')}>Día</button>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={goToToday}>Hoy</button>
          <Link to={`/admin/spaces/${id}/edit`} className="btn btn-secondary">Volver al espacio</Link>
        </div>
      </div>

      <div style={{ height: '550px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(eventObj) => handleDeleteBlock(eventObj?.resource)}
          date={date}
          view={view}
          onView={setView}
          onNavigate={handleNavigate}
          views={['month', 'week', 'day']}
          min={MIN_TIME}
          max={MAX_TIME}
          step={STEP_MINUTES}
          timeslots={60 / STEP_MINUTES}
          scrollToTime={SCROLL_TIME}
          popup
          eventPropGetter={eventPropGetter}
          components={calendarComponents}
          messages={CALENDAR_MESSAGES}
        />
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bloquear horario</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar"></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="recurrente"
                      name="recurrente"
                      checked={formData.recurrente}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="recurrente">Repetir cada semana</label>
                  </div>

                  {formData.recurrente ? (
                    <div className="mb-3">
                      <label htmlFor="dia_semana" className="form-label">Día de la semana</label>
                      <select
                        className="form-select"
                        id="dia_semana"
                        name="dia_semana"
                        value={formData.dia_semana}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="fecha_inicio" className="form-label">Fecha inicio</label>
                        <input
                          type="date"
                          className="form-control"
                          id="fecha_inicio"
                          name="fecha_inicio"
                          value={formData.fecha_inicio}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="fecha_fin" className="form-label">Fecha fin</label>
                        <input
                          type="date"
                          className="form-control"
                          id="fecha_fin"
                          name="fecha_fin"
                          value={formData.fecha_fin}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label htmlFor="hora_inicio" className="form-label">Hora inicio</label>
                      <input
                        type="time"
                        className="form-control"
                        id="hora_inicio"
                        name="hora_inicio"
                        value={formData.hora_inicio}
                        onChange={handleChange}
                        required
                        min="06:00"
                        max="20:00"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hora_fin" className="form-label">Hora fin</label>
                      <input
                        type="time"
                        className="form-control"
                        id="hora_fin"
                        name="hora_fin"
                        value={formData.hora_fin}
                        onChange={handleChange}
                        required
                        min="06:00"
                        max="20:00"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label htmlFor="observaciones" className="form-label">Notas (opcional)</label>
                    <textarea
                      className="form-control"
                      id="observaciones"
                      name="observaciones"
                      rows="2"
                      value={formData.observaciones}
                      onChange={handleChange}
                      placeholder="Ej. Mantenimiento programado"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar bloqueo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceScheduleCreate;
