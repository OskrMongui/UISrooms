import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api';

const localizer = momentLocalizer(moment);
moment.locale('es');
moment.updateLocale('es', { week: { dow: 1 } });

const STEP_MINUTES = 30;
const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 20;

const MIN_TIME = new Date(1970, 0, 1, CALENDAR_START_HOUR, 0, 0);
const MAX_TIME = new Date(1970, 0, 1, CALENDAR_END_HOUR, 0, 0);
const SCROLL_TIME = new Date(1970, 0, 1, 8, 0, 0);

const CALENDAR_MESSAGES = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en el rango seleccionado',
};

const withSeconds = (value) => {  
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
};

const parseTime = (timeString) => {
  const normalized = withSeconds(timeString);
  return moment(normalized, 'HH:mm:ss');
};

const parsePositiveInt = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  const intValue = Math.floor(number);
  return intValue > 0 ? intValue : null;
};

const clampToWorkingHours = (m) => {
  if (m.hour() < CALENDAR_START_HOUR) {
    m.hour(CALENDAR_START_HOUR).minute(0).second(0).millisecond(0);
  }
  if (m.hour() > CALENDAR_END_HOUR || (m.hour() === CALENDAR_END_HOUR && m.minute() > 0)) {
    m.hour(CALENDAR_END_HOUR).minute(0).second(0).millisecond(0);
  }
};

const sameDay = (momentA, momentB) => momentA.isSame(momentB, 'day');

const isoWeekDayIndex = (momentDate) => {
  const iso = momentDate.isoWeekday(); // 1-7 monday first
  return iso === 7 ? 6 : iso - 1; // transform to 0-6 monday first
};

const formatDisplayDateTime = (date) => moment(date).format('DD/MM/YYYY HH:mm');
const formatInputDateTime = (date) => moment(date).format('YYYY-MM-DDTHH:mm');

const CLASS_EVENT_PREFIX = '[CLASE]';
const CLASS_PREFIX_REGEX = /^\[CLASE\]\s*/i;
const normalizeObservation = (value) => (typeof value === 'string' ? value.trim() : '');
const isClassBlock = (block) => CLASS_PREFIX_REGEX.test(normalizeObservation(block?.observaciones));
const getClassDisplayName = (block) => {
  const normalized = normalizeObservation(block?.observaciones);
  if (!normalized) return 'Clase';
  const stripped = normalized.replace(CLASS_PREFIX_REGEX, '').trim();
  return stripped || 'Clase';
};

const INACTIVE_MESSAGE = 'Este espacio esta inactivo, no es posible reservarlo.';

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [spaceRes, availabilityRes, blocksRes, reservationsRes] = await Promise.all([
          api.get(`espacios/${id}/`),
          api.get(`espacios-disponibilidad/?espacio=${id}&bloqueo=false`),
          api.get(`espacios-disponibilidad/?espacio=${id}&bloqueo=true`),
          api.get(`reservas/?espacio=${id}`),
        ]);

        setSpace(spaceRes.data);
        setAvailability(Array.isArray(availabilityRes.data) ? availabilityRes.data : []);
        setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : []);

        const filteredReservations = Array.isArray(reservationsRes.data)
          ? reservationsRes.data.filter((reservation) => {
              const state = (reservation.estado || '').toLowerCase();
              return state !== 'rechazado';
            })
          : [];

        setReservations(filteredReservations);
      } catch (err) {
        setError('No se pudo cargar la informacion del espacio.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!space) return;
    if (space.activo === false) {
      setSelectedSlot(null);
      if (feedback && feedback !== INACTIVE_MESSAGE) {
        setFeedback('');
      }
    } else if (feedback === INACTIVE_MESSAGE) {
      setFeedback('');
    }
  }, [space, feedback]);

  const events = useMemo(() => {
    if (!date || !view) return [];

    const rangeStart =
      view === 'month' ? moment(date).startOf('month') : view === 'week' ? moment(date).startOf('week') : moment(date).startOf('day');
    const rangeEnd =
      view === 'month' ? moment(date).endOf('month') : view === 'week' ? moment(date).endOf('week') : moment(date).endOf('day');

    const eventList = [];

    if (space && space.activo === false) {
      eventList.push({
        title: 'Espacio inactivo',
        start: rangeStart.toDate(),
        end: rangeEnd.toDate(),
        resource: { type: 'inactive' },
        allDay: true,
      });
    }

    // Blocks and class schedule entries
    const pushScheduleEvent = (startMoment, endMoment, block) => {
      if (!startMoment.isValid() || !endMoment.isValid()) return;
      const isClass = isClassBlock(block);
      const observation = normalizeObservation(block?.observaciones);
      const classLabel = isClass ? getClassDisplayName(block) : null;
      const title = isClass
        ? `Clase${classLabel ? ` - ${classLabel}` : ''}`
        : observation
          ? `Bloqueado (${observation})`
          : 'Bloqueado';

      eventList.push({
        title,
        start: startMoment.toDate(),
        end: endMoment.toDate(),
        resource: { type: isClass ? 'class' : 'block', payload: block },
        allDay: false,
      });
    };

    blocks.forEach((block) => {
      const startTime = withSeconds(block.hora_inicio);
      const endTime = withSeconds(block.hora_fin);
      if (!startTime || !endTime) return;

      if (block.recurrente && block.dia_semana !== null && block.dia_semana !== undefined) {
        const dayIndex = parseInt(block.dia_semana, 10);
        let current = rangeStart.clone().startOf('week').add(dayIndex, 'days');
        if (current.isBefore(rangeStart)) {
          current = current.add(7, 'days');
        }

        while (current.isSameOrBefore(rangeEnd, 'day')) {
          const startMoment = moment(`${current.format('YYYY-MM-DD')} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
          const endMoment = moment(`${current.format('YYYY-MM-DD')} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');
          pushScheduleEvent(startMoment, endMoment, block);
          current = current.add(7, 'days');
        }
      } else if (block.fecha_inicio && block.fecha_fin) {
        const startMoment = moment(`${block.fecha_inicio} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
        const endMoment = moment(`${block.fecha_fin} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');
        if (
          startMoment.isValid() &&
          endMoment.isValid() &&
          startMoment.isBefore(rangeEnd) &&
          endMoment.isAfter(rangeStart)
        ) {
          pushScheduleEvent(startMoment, endMoment, block);
        }
      }
    });

    // Reservations
    reservations.forEach((reservation) => {
      if (!reservation.fecha_inicio || !reservation.fecha_fin) return;

      const status = String(reservation.estado || '').toLowerCase();
      if (status === 'rechazado') {
        return;
      }
      const isPendingReservation = status === 'pendiente';

      const baseStart = moment(reservation.fecha_inicio);
      const baseEnd = moment(reservation.fecha_fin);
      if (!baseStart.isValid() || !baseEnd.isValid()) return;

      const titleParts = [];
      const requesterName =
        reservation.usuario_detalle?.nombre ||
        reservation.usuario?.first_name ||
        reservation.usuario?.username;
      if (requesterName) {
        titleParts.push(requesterName);
      }
      if (reservation.motivo) {
        titleParts.push(reservation.motivo);
      }
      if (!titleParts.length) {
        titleParts.push('Reserva');
      }
      const baseTitle = titleParts.join(' - ');
      const title = isPendingReservation ? `[Pendiente] ${baseTitle}` : baseTitle;

      const recurrencia = (reservation.metadata && reservation.metadata.recurrencia) || {};
      const occurrenceNumber = parsePositiveInt(recurrencia.ocurrencia) || 1;
      const totalOccurrences =
        parsePositiveInt(recurrencia.total_ocurrencias) ||
        parsePositiveInt(recurrencia.semanas) ||
        1;

      const addEvent = (startMoment, endMoment, occurrenceIndex) => {
        if (!startMoment.isValid() || !endMoment.isValid()) return;
        if (startMoment.isAfter(rangeEnd) || endMoment.isBefore(rangeStart)) return;

        eventList.push({
          title,
          start: startMoment.toDate(),
          end: endMoment.toDate(),
          resource: {
            type: 'reservation',
            status,
            payload: reservation,
            occurrence: occurrenceIndex,
            totalOccurrences,
            blocksSelection: !isPendingReservation,
          },
          allDay: false,
        });
      };

      if (reservation.recurrente && totalOccurrences > 1) {
        if (occurrenceNumber > 1) {
          return;
        }
        for (let index = 0; index < totalOccurrences; index += 1) {
          addEvent(baseStart.clone().add(index, 'weeks'), baseEnd.clone().add(index, 'weeks'), index + 1);
        }
        return;
      }

      addEvent(baseStart, baseEnd, occurrenceNumber);
    });

    return eventList;
  }, [blocks, reservations, date, view, space]);

  const conflictsWithEvents = useCallback(
    (startMoment, endMoment) =>
      events.some((event) => {
        const resource = event.resource || {};
        if (resource.blocksSelection === false) {
          return false;
        }
        if (resource.type === 'reservation' && resource.status !== 'aprobado') {
          return false;
        }
        const eventStart = moment(event.start);
        const eventEnd = moment(event.end);
        return startMoment.isBefore(eventEnd) && endMoment.isAfter(eventStart);
      }),
    [events]
  );

  const isSlotWithinAvailability = useCallback(
    (startMoment, endMoment) => {
      return availability.some((item) => {
        const startTime = parseTime(item.hora_inicio);
        const endTime = parseTime(item.hora_fin);
        if (!startTime.isValid() || !endTime.isValid()) return false;

        const slotStart = startMoment.clone();
        const slotEnd = endMoment.clone();

        if (item.recurrente && item.dia_semana !== null && item.dia_semana !== undefined) {
          const dayIndex = parseInt(item.dia_semana, 10);
          if (isoWeekDayIndex(slotStart) !== dayIndex) return false;

          const availabilityStart = slotStart.clone().hour(startTime.hour()).minute(startTime.minute()).second(0).millisecond(0);
          const availabilityEnd = slotStart.clone().hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0);

          return slotStart.isSameOrAfter(availabilityStart) && slotEnd.isSameOrBefore(availabilityEnd);
        }

        if (!item.fecha_inicio || !item.fecha_fin) return false;
        const availStartDate = moment(item.fecha_inicio, 'YYYY-MM-DD');
        const availEndDate = moment(item.fecha_fin, 'YYYY-MM-DD');
        if (!slotStart.isBetween(availStartDate, availEndDate, null, '[]')) return false;
        if (!slotEnd.isBetween(availStartDate, availEndDate, null, '[]')) return false;

        const availabilityStart = slotStart.clone().hour(startTime.hour()).minute(startTime.minute()).second(0).millisecond(0);
        const availabilityEnd = slotStart.clone().hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0);

        return slotStart.isSameOrAfter(availabilityStart) && slotEnd.isSameOrBefore(availabilityEnd);
      });
    },
    [availability]
  );

  const handleSelectSlot = useCallback(
    ({ start, end }) => {
      if (space && space.activo === false) {
        setFeedback(INACTIVE_MESSAGE);
        setSelectedSlot(null);
        return;
      }

      if (view === 'month' && (!end || moment(end).diff(start, 'minutes') >= 1440)) {
        setView('day');
        setDate(start);
        return;
      }

      let startMoment = moment(start);
      let endMoment = moment(end || start);

      if (sameDay(startMoment, endMoment) && startMoment.isSame(endMoment)) {
        endMoment = startMoment.clone().add(STEP_MINUTES, 'minutes');
      }

      clampToWorkingHours(startMoment);
      clampToWorkingHours(endMoment);

      if (!endMoment.isAfter(startMoment)) {
        endMoment = startMoment.clone().add(STEP_MINUTES, 'minutes');
        clampToWorkingHours(endMoment);
      }

      if (startMoment.isBefore(moment())) {
        setFeedback('No puedes reservar en el pasado.');
        return;
      }

      if (!isSlotWithinAvailability(startMoment, endMoment)) {
        setFeedback('La franja seleccionada esta fuera del horario disponible.');
        return;
      }

      if (conflictsWithEvents(startMoment, endMoment)) {
        setFeedback('La franja seleccionada no esta disponible.');
        return;
      }

      setFeedback('');
      setSelectedSlot({ start: startMoment.toDate(), end: endMoment.toDate() });
    },
    [view, conflictsWithEvents, isSlotWithinAvailability, space]
  );

  const handleNavigate = (nextDate) => {
    setDate(nextDate);
    setSelectedSlot(null);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setView('day');
    setSelectedSlot(null);
  };

  const handleReserve = () => {
    if (!selectedSlot || (space && space.activo === false)) {
      return;
    }
    const params = new URLSearchParams({
      espacio: id,
      inicio: formatInputDateTime(selectedSlot.start),
      fin: formatInputDateTime(selectedSlot.end),
    });
    navigate(`/reservations/create?${params.toString()}`);
  };

  const eventPropGetter = useCallback((event) => {
    const type = event.resource?.type;
    if (type === 'inactive') {
      return {
        style: {
          backgroundColor: '#adb5bd',
          borderColor: '#adb5bd',
          color: '#212529',
          opacity: 0.8,
        },
      };
    }
    if (type === 'block') {
      return {
        style: {
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          color: '#fff',
        },
      };
    }
    if (type === 'class') {
      return {
        style: {
          backgroundColor: '#6f42c1',
          borderColor: '#6f42c1',
          color: '#fff',
        },
      };
    }
    if (type === 'reservation') {
      const status = event.resource?.status;
      if (status === 'pendiente') {
        return {
          style: {
            backgroundColor: 'rgba(108, 117, 125, 0.15)',
            borderColor: '#6c757d',
            color: '#212529',
            borderStyle: 'dashed',
          },
        };
      }
      return {
        style: {
          backgroundColor: '#fd7e14',
          borderColor: '#fd7e14',
          color: '#212529',
        },
      };
    }
    return {};
  }, []);

  const slotPropGetter = useCallback(
    (slotDate) => {
      const startMoment = moment(slotDate);
      const endMoment = startMoment.clone().add(STEP_MINUTES, 'minutes');

      if (startMoment.hour() < CALENDAR_START_HOUR || startMoment.hour() >= CALENDAR_END_HOUR) {
        return {};
      }

      if (space && space.activo === false) {
        return {
          style: {
            backgroundColor: 'rgba(173, 181, 189, 0.35)',
            cursor: 'not-allowed',
          },
        };
      }

      if (startMoment.isBefore(moment())) {
        return {
          style: {
            backgroundColor: '#f1f3f5',
          },
        };
      }

      if (!isSlotWithinAvailability(startMoment, endMoment) || conflictsWithEvents(startMoment, endMoment)) {
        return {
          style: {
            backgroundColor: 'rgba(220, 53, 69, 0.08)',
          },
        };
      }

      return {
        style: {
          backgroundColor: 'rgba(40, 167, 69, 0.08)',
        },
      };
    },
    [conflictsWithEvents, isSlotWithinAvailability, space]
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!space) {
    return <div className="alert alert-warning">No encontramos el espacio solicitado.</div>;
  }

  return (
    <div className="space-availability container-xxl py-4">
      <div className="reservations-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="text-uppercase small mb-2">Ficha del espacio</p>
            <h1 className="mb-2 text-white">{space.nombre}</h1>
            <p className="mb-3 text-white-50">
              {space.descripcion || 'Sin descripcion disponible.'}
            </p>
            <div className="d-flex flex-wrap gap-3 text-white-50 small">
              <span>Codigo: {space.codigo}</span>
              <span>Capacidad: {space.capacidad ?? 'N/D'}</span>
              <span>Ubicacion: {space.ubicacion_display || space.ubicacion || 'No definida'}</span>
              <span>Estado: {space.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/spaces" className="btn btn-outline-light">
              Volver a espacios
            </Link>
            {space.activo ? (
              <Link
                to={`/reservations/create?espacio=${space.id}`}
                className="btn btn-light text-success fw-semibold"
              >
                Reservar este espacio
              </Link>
            ) : (
              <button type="button" className="btn btn-light text-muted fw-semibold" disabled>
                Espacio inactivo
              </button>
            )}
          </div>
        </div>
      </div>

      {!space.activo && (
        <div className="alert alert-warning mb-4">
          Este espacio esta inactivo. Todas las franjas permanecen bloqueadas hasta que se reactive.
        </div>
      )}

      {space.activo && (
        <div className="card-elevated mb-4 p-4 bg-white">
          <strong>Como reservar:</strong> Selecciona una franja libre dentro del calendario (bloqueos en rojo, reservas aprobadas en naranja, solicitudes pendientes en gris punteado). Luego confirma la reserva para completar los detalles.
        </div>
      )}

      {feedback && feedback !== INACTIVE_MESSAGE && <div className="alert alert-warning">{feedback}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-outline-success${view === 'month' ? ' active' : ''}`}
            onClick={() => setView('month')}
            aria-pressed={view === 'month'}
          >
            Mes
          </button>
          <button
            type="button"
            className={`btn btn-outline-success${view === 'week' ? ' active' : ''}`}
            onClick={() => setView('week')}
            aria-pressed={view === 'week'}
          >
            Semana
          </button>
          <button
            type="button"
            className={`btn btn-outline-success${view === 'day' ? ' active' : ''}`}
            onClick={() => setView('day')}
            aria-pressed={view === 'day'}
          >
            Dia
          </button>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => handleNavigate(moment(date).subtract(1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day').toDate())}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => handleNavigate(moment(date).add(1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day').toDate())}
          >
            Siguiente
          </button>
          <button type="button" className="btn btn-primary" onClick={goToToday}>Hoy</button>
        </div>
      </div>

      <div
        className="space-calendar mb-4"
        style={{ height: view === 'month' ? '720px' : '640px' }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          date={date}
          view={view}
          onView={(nextView) => setView(nextView)}
          onNavigate={handleNavigate}
          views={['month', 'week', 'day']}
          min={MIN_TIME}
          max={MAX_TIME}
          step={STEP_MINUTES}
          timeslots={60 / STEP_MINUTES}
          scrollToTime={SCROLL_TIME}
          popup
          messages={CALENDAR_MESSAGES}
          eventPropGetter={eventPropGetter}
          slotPropGetter={slotPropGetter}
        />
      </div>

      <div className="space-legend mb-4">
        <span className="legend-item"><span className="legend-color legend-free" /> Disponible</span>
        <span className="legend-item"><span className="legend-color legend-block" /> Bloqueado</span>
        <span className="legend-item"><span className="legend-color legend-class" /> Clase</span>
        <span className="legend-item"><span className="legend-color legend-reservation" /> Reservado</span>
        <span className="legend-item">
          <span
            className="legend-color"
            style={{ backgroundColor: '#dee2e6', border: '1px dashed #6c757d' }}
          /> Pendiente
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#adb5bd' }} /> Inactivo
        </span>
      </div>

      {selectedSlot && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar reserva</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedSlot(null)} aria-label="Cerrar"></button>
              </div>
              <div className="modal-body">
                <p className="mb-2"><strong>Espacio:</strong> {space.nombre}</p>
                <p className="mb-2"><strong>Desde:</strong> {formatDisplayDateTime(selectedSlot.start)}</p>
                <p className="mb-0"><strong>Hasta:</strong> {formatDisplayDateTime(selectedSlot.end)}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedSlot(null)}>Cancelar</button>
                <button type="button" className="btn btn-success" onClick={handleReserve} disabled={!space.activo}>
                  Reservar esta franja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceDetail;

