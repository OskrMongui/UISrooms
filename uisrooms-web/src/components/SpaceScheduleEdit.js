// SpaceScheduleCreate.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api';

const localizer = momentLocalizer(moment);
moment.locale('es');
moment.updateLocale('es', { week: { dow: 1 } });

const initialFormData = {
  dia_semana: '',
  hora_inicio: '',
  hora_fin: '',
  fecha_inicio: '',
  fecha_fin: '',
  recurrente: true,
  observaciones: ''
};

const STEP_MINUTES = 30; // puedes cambiar a 15 si prefieres

const SpaceScheduleCreate = () => {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpace = async () => {
      try {
        const response = await api.get(`espacios/${id}/`);
        setSpace(response.data);
      } catch (err) {
        setError('Error al cargar espacio');
        console.error(err);
      }
    };
    const fetchSchedules = async () => {
      try {
        const response = await api.get(`espacios-disponibilidad/?espacio=${id}`);
        setSchedules(response.data);
      } catch (err) {
        setError('Error al cargar horarios');
        console.error(err);
      }
    };
    fetchSpace();
    fetchSchedules();
  }, [id]);

  // ---------- generar eventos ----------
  const generateEvents = () => {
    const events = [];
    const startDate = moment(date).startOf(view === 'month' ? 'month' : 'day');
    const endDate = moment(date).endOf(view === 'month' ? 'month' : 'day');

    schedules.forEach(schedule => {
      if (!schedule.hora_inicio || !schedule.hora_fin) return;
      const hi = schedule.hora_inicio.length === 5 ? `${schedule.hora_inicio}:00` : schedule.hora_inicio;
      const hf = schedule.hora_fin.length === 5 ? `${schedule.hora_fin}:00` : schedule.hora_fin;

      if (schedule.recurrente && schedule.dia_semana !== null && schedule.dia_semana !== undefined) {
        let current = startDate.clone().startOf('week').add(parseInt(schedule.dia_semana, 10));
        while (current.isSameOrBefore(endDate)) {
          const start = moment(`${current.format('YYYY-MM-DD')} ${hi}`, 'YYYY-MM-DD HH:mm:ss');
          const end = moment(`${current.format('YYYY-MM-DD')} ${hf}`, 'YYYY-MM-DD HH:mm:ss');
          if (start.isValid() && end.isValid()) {
            events.push({
              title: `${schedule.hora_inicio} - ${schedule.hora_fin}${schedule.observaciones ? ` (${schedule.observaciones})` : ''}`,
              start: start.toDate(),
              end: end.toDate(),
              allDay: false,
              resource: schedule
            });
          }
          current.add(7, 'days');
        }
      } else if (!schedule.recurrente && schedule.fecha_inicio && schedule.fecha_fin) {
        const start = moment(`${schedule.fecha_inicio} ${hi}`, 'YYYY-MM-DD HH:mm:ss');
        const end = moment(`${schedule.fecha_fin} ${hf}`, 'YYYY-MM-DD HH:mm:ss');
        if (start.isValid() && end.isValid()) {
          if (
            start.isBetween(startDate, endDate, null, '[]') ||
            end.isBetween(startDate, endDate, null, '[]') ||
            (start.isBefore(startDate) && end.isAfter(endDate))
          ) {
            events.push({
              title: `${schedule.hora_inicio} - ${schedule.hora_fin}${schedule.observaciones ? ` (${schedule.observaciones})` : ''}`,
              start: start.toDate(),
              end: end.toDate(),
              allDay: false,
              resource: schedule
            });
          }
        }
      }
    });

    return events;
  };

  const events = generateEvents();

  // ---------- selección slot (simplificado con setTimeout para abrir modal) ----------
  const handleSelectSlot = (slotInfo) => {
    console.log('handleSelectSlot raw ->', slotInfo);

    let start, end;
    if (slotInfo && slotInfo.start && slotInfo.end) {
      start = slotInfo.start;
      end = slotInfo.end;
    } else if (slotInfo instanceof Date) {
      start = slotInfo;
      end = slotInfo;
    } else if (Array.isArray(slotInfo) && slotInfo.length >= 2) {
      start = slotInfo[0];
      end = slotInfo[1];
    } else if (slotInfo && slotInfo.hasOwnProperty('start')) {
      start = slotInfo.start;
      end = slotInfo.end || slotInfo.start;
    } else {
      start = new Date();
      end = new Date();
    }

    const roundToStep = (date) => {
      const m = moment(date);
      const totalMinutes = m.hours() * 60 + m.minutes();
      const rounded = Math.round(totalMinutes / STEP_MINUTES) * STEP_MINUTES;
      const newHours = Math.floor(rounded / 60);
      const newMinutes = rounded % 60;
      m.hours(newHours).minutes(newMinutes).seconds(0).milliseconds(0);
      return m;
    };

    let startM = roundToStep(start);
    let endM = roundToStep(end);

    // ajuste month view (end exclusive)
    const isMonthExclusive = moment(end).format('HH:mm') === '00:00' && !moment(start).isSame(end, 'day');
    if (isMonthExclusive) {
      endM = endM.clone().subtract(1, 'second');
    }

    const durationMinutes = Math.max(0, endM.diff(startM, 'minutes'));
    const sameDay = startM.isSame(endM, 'day');
    const hasVisibleHours = durationMinutes > 0 && sameDay;

    const newForm = { ...initialFormData };
    newForm.fecha_inicio = startM.format('YYYY-MM-DD');
    newForm.fecha_fin = endM.format('YYYY-MM-DD');

    if (hasVisibleHours) {
      newForm.hora_inicio = startM.format('HH:mm');
      newForm.hora_fin = endM.format('HH:mm');
      newForm.recurrente = false;
      newForm.dia_semana = '';
    } else {
      newForm.hora_inicio = '';
      newForm.hora_fin = '';
      newForm.recurrente = false;
      newForm.dia_semana = '';
    }

    console.log('handleSelectSlot -> startM, endM, durationMinutes:', startM.format(), endM.format(), durationMinutes);
    console.log('handleSelectSlot -> newForm to set:', newForm);

    // ESTO es la clave: setear el formData y luego abrir modal en timeout corto
    setSelectedDate(startM.toDate());
    setDate(startM.toDate());
    setFormData(() => ({ ...initialFormData, ...newForm }));

    // abrir modal después de que React aplique el state (pequeño delay)
    setTimeout(() => {
      setShowModal(true);
      setError('');
      console.log('Modal abierto (setTimeout) con formData (state):', { ...formData, ...newForm });
    }, 50); // 50ms es seguro en la mayoría de entornos; si quieres prueba con 0 o 10
  };

  // ---------- navegación ----------
  const handleNavigate = (newDate, newView) => {
    setDate(newDate);
    setView(newView);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setView('day');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

    if (name === 'recurrente' && checked) {
      setFormData(prev => ({ ...prev, fecha_inicio: '', fecha_fin: '' }));
    }
    if (name === 'recurrente' && !checked && selectedDate) {
      setFormData(prev => ({ ...prev, fecha_inicio: moment(selectedDate).format('YYYY-MM-DD'), fecha_fin: moment(selectedDate).format('YYYY-MM-DD') }));
    }
  };

  // ---------- validación ----------
  const validateForm = () => {
    if (!formData.hora_inicio || !formData.hora_fin) return 'Las horas de inicio y fin son requeridas.';
    const normalizeTime = (t) => (t && t.length === 5 ? `${t}:00` : t);
    const startTime = normalizeTime(formData.hora_inicio);
    const endTime = normalizeTime(formData.hora_fin);
    const refDate = '2000-01-01';
    const sm = moment(`${refDate} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
    const em = moment(`${refDate} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');
    if (!sm.isValid() || !em.isValid()) return 'Formato de hora inválido. Use HH:mm (ej: 10:00).';
    if (!em.isAfter(sm)) return 'La hora de fin debe ser posterior a la hora de inicio.';
    if (formData.recurrente) {
      if (formData.dia_semana === '' || formData.dia_semana === null || formData.dia_semana === undefined) return 'Debe seleccionar un día de la semana.';
    } else {
      if (!formData.fecha_inicio || !formData.fecha_fin) return 'Debe seleccionar fechas de inicio y fin.';
      const s = moment(formData.fecha_inicio, 'YYYY-MM-DD');
      const e = moment(formData.fecha_fin, 'YYYY-MM-DD');
      if (!s.isValid() || !e.isValid()) return 'Formato de fecha inválido.';
      if (s.isAfter(e)) return 'La fecha de inicio debe ser anterior o igual a la fecha de fin.';
    }
    return null;
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const normalizeTime = (t) => (t && t.length === 5 ? `${t}:00` : t);
      const payload = {
        recurrente: !!formData.recurrente,
        hora_inicio: normalizeTime(formData.hora_inicio),
        hora_fin: normalizeTime(formData.hora_fin),
        observaciones: formData.observaciones || null,
        espacio: id
      };
      if (formData.recurrente) {
        payload.dia_semana = formData.dia_semana === '' ? null : parseInt(formData.dia_semana, 10);
      } else {
        payload.fecha_inicio = formData.fecha_inicio;
        payload.fecha_fin = formData.fecha_fin;
        payload.dia_semana = null;
      }
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      console.log('Payload que voy a enviar ->', JSON.stringify(payload, null, 2));
      const response = await api.post('espacios-disponibilidad/', payload);
      console.log('Respuesta OK:', response.data);
      const ref = await api.get(`espacios-disponibilidad/?espacio=${id}`);
      setSchedules(ref.data);
      setShowModal(false);
      setFormData(initialFormData);
    } catch (err) {
      console.error('POST error:', err.response ?? err);
      const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
      setError('Error al crear horario: ' + (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)));
    } finally {
      setLoading(false);
    }
  };

  if (!space) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;

  return (
    <div>
      <h1 className="mb-4">Horarios para {space.nombre}</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-primary" onClick={goToToday}>Hoy</button>
        <Link to={`/admin/spaces/${id}/edit`} className="btn btn-secondary">Volver al Espacio</Link>
      </div>

      <div style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={() => {}}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={(v) => setView(v)}
          views={['month', 'week', 'day']}
          defaultView="month"
          step={STEP_MINUTES}
          timeslots={1}
          min={new Date(1970, 1, 1, 6, 0, 0)}
          max={new Date(1970, 1, 1, 22, 0, 0)}
          messages={{ today: 'Hoy', month: 'Mes', day: 'Día', week: 'Semana' }}
        />
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Horario</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="recurrente" name="recurrente" checked={formData.recurrente} onChange={handleChange} />
                    <label className="form-check-label" htmlFor="recurrente">Horario Recurrente</label>
                  </div>

                  {formData.recurrente ? (
                    <div className="mb-3">
                      <label htmlFor="dia_semana" className="form-label">Día de la Semana</label>
                      <select className="form-select" id="dia_semana" name="dia_semana" value={formData.dia_semana} onChange={handleChange} required>
                        <option value="">Seleccionar</option>
                        <option value="0">Lunes</option>
                        <option value="1">Martes</option>
                        <option value="2">Miércoles</option>
                        <option value="3">Jueves</option>
                        <option value="4">Viernes</option>
                        <option value="5">Sábado</option>
                        <option value="6">Domingo</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label htmlFor="fecha_inicio" className="form-label">Fecha Inicio</label>
                        <input type="date" className="form-control" id="fecha_inicio" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} required />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="fecha_fin" className="form-label">Fecha Fin</label>
                        <input type="date" className="form-control" id="fecha_fin" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} required />
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label htmlFor="hora_inicio" className="form-label">Hora Inicio</label>
                    <input type="time" className="form-control" id="hora_inicio" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="hora_fin" className="form-label">Hora Fin</label>
                    <input type="time" className="form-control" id="hora_fin" name="hora_fin" value={formData.hora_fin} onChange={handleChange} required />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="observaciones" className="form-label">Observaciones</label>
                    <textarea className="form-control" id="observaciones" name="observaciones" rows="2" value={formData.observaciones} onChange={handleChange} />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>{loading ? 'Agregando...' : 'Agregar Horario'}</button>
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
