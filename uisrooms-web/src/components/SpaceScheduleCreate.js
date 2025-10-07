import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api';

const localizer = momentLocalizer(moment);
moment.locale('es');
moment.updateLocale('es', { week: { dow: 1 } }); // Semana inicia en lunes

const initialFormData = {
  dia_semana: '',
  hora_inicio: '',
  hora_fin: '',
  fecha_inicio: '',
  fecha_fin: '',
  recurrente: true,
  observaciones: ''
};

const SpaceScheduleCreate = () => {
  const { id } = useParams(); // id es UUID string
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

  // ---------------- GENERACIÓN DE EVENTOS ----------------
  const generateEvents = () => {
    const events = [];
    const startDate = moment(date).startOf(view === 'month' ? 'month' : 'day');
    const endDate = moment(date).endOf(view === 'month' ? 'month' : 'day');

    schedules.forEach(schedule => {
      if (!schedule.hora_inicio || !schedule.hora_fin) return;

      if (schedule.recurrente && schedule.dia_semana !== null && schedule.dia_semana !== undefined) {
        let current = startDate.clone().startOf('week').add(parseInt(schedule.dia_semana, 10), 'days');
        while (current.isSameOrBefore(endDate)) {
          const start = moment(`${current.format('YYYY-MM-DD')} ${schedule.hora_inicio}`, 'YYYY-MM-DD HH:mm:ss');
          const end = moment(`${current.format('YYYY-MM-DD')} ${schedule.hora_fin}`, 'YYYY-MM-DD HH:mm:ss');
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
        const start = moment(`${schedule.fecha_inicio} ${schedule.hora_inicio}`, 'YYYY-MM-DD HH:mm:ss');
        const end = moment(`${schedule.fecha_fin} ${schedule.hora_fin}`, 'YYYY-MM-DD HH:mm:ss');
        if (start.isValid() && end.isValid()) {
          // Si el rango intersecta el rango visible, añadir
          if (start.isBetween(startDate, endDate, null, '[]') || end.isBetween(startDate, endDate, null, '[]') || (start.isBefore(startDate) && end.isAfter(endDate))) {
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

  // ---------------- SELECT SLOT ----------------
  const handleSelectSlot = ({ start }) => {
    const weekday = start.getDay(); // 0=Dom,1=Lun...6=Sab
    const dia_semana = weekday === 0 ? 6 : weekday - 1; // Ajuste a 0=Lun...6=Dom

    setDate(start);
    setView('day');
    setSelectedDate(start);

    setFormData({
      ...initialFormData,
      recurrente: true,
      dia_semana: dia_semana.toString()
    });
    setShowModal(true);
    setError('');
  };

  const handleNavigate = (newDate, newView) => {
    setDate(newDate);
    setView(newView);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setView('day');
  };

  // ---------------- HANDLE CHANGE ----------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Para checkbox manejamos checked, para los demás value
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Si cambia a recurrente, limpiar fechas
    if (name === 'recurrente' && checked) {
      setFormData(prev => ({
        ...prev,
        fecha_inicio: '',
        fecha_fin: ''
      }));
    }

    // Si cambia a específico, set fechas del slot seleccionado si existe
    if (name === 'recurrente' && !checked && selectedDate) {
      setFormData(prev => ({
        ...prev,
        fecha_inicio: moment(selectedDate).format('YYYY-MM-DD'),
        fecha_fin: moment(selectedDate).format('YYYY-MM-DD')
      }));
    }
  };

  // ---------------- VALIDACIÓN ----------------
  const validateForm = () => {
    if (!formData.hora_inicio || !formData.hora_fin) {
      return 'Las horas de inicio y fin son requeridas.';
    }

    // Normalizar horas a formato HH:mm:ss para comparar
    const normalizeTime = (t) => {
      if (!t) return null;
      // input type=time normalmente devuelve "HH:mm"; si ya tiene segundos, no tocar
      return t.length === 5 ? `${t}:00` : t;
    };

    const startTime = normalizeTime(formData.hora_inicio);
    const endTime = normalizeTime(formData.hora_fin);

    const refDate = '2000-01-01';
    const startMoment = moment(`${refDate} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
    const endMoment = moment(`${refDate} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return 'Formato de hora inválido. Use HH:mm (ej: 10:00).';
    }

    if (!endMoment.isAfter(startMoment)) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    if (formData.recurrente) {
      if (formData.dia_semana === '' || formData.dia_semana === null || formData.dia_semana === undefined) {
        return 'Debe seleccionar un día de la semana.';
      }
    } else {
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        return 'Debe seleccionar fechas de inicio y fin.';
      }
      const startDate = moment(formData.fecha_inicio, 'YYYY-MM-DD');
      const endDate = moment(formData.fecha_fin, 'YYYY-MM-DD');
      if (!startDate.isValid() || !endDate.isValid()) {
        return 'Formato de fecha inválido.';
      }
      if (startDate.isAfter(endDate)) {
        return 'La fecha de inicio debe ser anterior o igual a la fecha de fin.';
      }
    }

    return null;
  };

  // ---------------- HANDLE SUBMIT ----------------
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

      // Construir payload limpio respetando el modelo (espacio = UUID string)
      const payload = {
        recurrente: !!formData.recurrente,
        hora_inicio: normalizeTime(formData.hora_inicio),
        hora_fin: normalizeTime(formData.hora_fin),
        observaciones: formData.observaciones || null,
        espacio: id // <-- importante: enviar UUID string tal cual (no parseInt)
      };

      if (formData.recurrente) {
        payload.dia_semana = formData.dia_semana === '' ? null : parseInt(formData.dia_semana, 10);
        // no enviar fechas cuando es recurrente
      } else {
        payload.fecha_inicio = formData.fecha_inicio;
        payload.fecha_fin = formData.fecha_fin;
        // dejar dia_semana como null explícito para evitar validaciones en backend
        payload.dia_semana = null;
      }

      // Eliminar claves con undefined para no enviar valores raros
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) delete payload[k];
      });

      console.log('Payload que voy a enviar ->', JSON.stringify(payload, null, 2));

      const response = await api.post('espacios-disponibilidad/', payload);
      console.log('Respuesta OK:', response.data);

      // Refetch schedules
      const ref = await api.get(`espacios-disponibilidad/?espacio=${id}`);
      setSchedules(ref.data);
      setShowModal(false);
      setFormData(initialFormData);
    } catch (err) {
      console.error('Error POST espacios-disponibilidad:', err.response ?? err);
      const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
      // dejar mensaje legible en UI
      setError('Error al crear horario: ' + (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)));
    } finally {
      setLoading(false);
    }
  };

  if (!space) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;

  // ---------------- RENDER ----------------
  return (
    <div>
      <h1 className="mb-4">Horarios para {space.nombre}</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-primary" onClick={goToToday}>Hoy</button>
        <Link to={`/admin/spaces/${id}/edit`} className="btn btn-secondary">Volver al Espacio</Link>
      </div>
      <div style={{ height: '500px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          views={['month', 'day']}
          defaultView="month"
          messages={{
            today: 'Hoy',
            month: 'Mes',
            day: 'Día'
          }}
        />
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Horario</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
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
                    <label className="form-check-label" htmlFor="recurrente">Horario Recurrente</label>
                  </div>
                  {formData.recurrente ? (
                    <div className="mb-3">
                      <label htmlFor="dia_semana" className="form-label">Día de la Semana</label>
                      <select
                        className="form-select"
                        id="dia_semana"
                        name="dia_semana"
                        value={formData.dia_semana}
                        onChange={handleChange}
                        required
                      >
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
                      <div className="mb-3">
                        <label htmlFor="fecha_fin" className="form-label">Fecha Fin</label>
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
                    </>
                  )}
                  <div className="mb-3">
                    <label htmlFor="hora_inicio" className="form-label">Hora Inicio</label>
                    <input
                      type="time"
                      className="form-control"
                      id="hora_inicio"
                      name="hora_inicio"
                      value={formData.hora_inicio}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="hora_fin" className="form-label">Hora Fin</label>
                    <input
                      type="time"
                      className="form-control"
                      id="hora_fin"
                      name="hora_fin"
                      value={formData.hora_fin}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="observaciones" className="form-label">Observaciones</label>
                    <textarea
                      className="form-control"
                      id="observaciones"
                      name="observaciones"
                      rows="2"
                      value={formData.observaciones}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Agregando...' : 'Agregar Horario'}
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
