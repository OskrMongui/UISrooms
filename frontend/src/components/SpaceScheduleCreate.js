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
  observaciones: '',
  classCode: '',
  classGroup: ''
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Lunes' },
  { value: '1', label: 'Martes' },
  { value: '2', label: 'Miercoles' },
  { value: '3', label: 'Jueves' },
  { value: '4', label: 'Viernes' },
  { value: '5', label: 'Sabado' },
  { value: '6', label: 'Domingo' }
];

const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 20;
const STEP_MINUTES = 30;

const MIN_TIME = new Date(1970, 0, 1, CALENDAR_START_HOUR, 0, 0);
const MAX_TIME = new Date(1970, 0, 1, CALENDAR_END_HOUR, 0, 0);
const SCROLL_TIME = new Date(1970, 0, 1, 8, 0, 0);

const CLASS_EVENT_PREFIX = '[CLASE]';
const CLASS_PREFIX_REGEX = /^\[CLASE\]\s*/i;
const RESERVATION_EVENT_STYLE = {
  backgroundColor: '#fd7e14',
  borderColor: '#fd7e14',
  color: '#212529'
};
const READONLY_BLOCK_STYLE = {
  backgroundColor: 'rgba(220, 53, 69, 0.15)',
  borderColor: '#dc3545',
  color: '#dc3545'
};
const READONLY_CLASS_STYLE = {
  backgroundColor: 'rgba(111, 66, 193, 0.15)',
  borderColor: '#6f42c1',
  color: '#6f42c1'
};

const normalizeObservation = (value) => (typeof value === 'string' ? value.trim() : '');
const isClassEntry = (entry) => CLASS_PREFIX_REGEX.test(normalizeObservation(entry?.observaciones));
const stripClassPrefix = (value) => {
  const normalized = normalizeObservation(value);
  if (!normalized) return '';
  return normalized.replace(CLASS_PREFIX_REGEX, '').trim();
};
const formatClassLabel = (entry) => {
  const label = stripClassPrefix(entry?.observaciones);
  return label ? `Clase - ${label}` : 'Clase';
};
const formatBlockLabel = (entry) => {
  const observation = normalizeObservation(entry?.observaciones);
  return observation ? `Bloqueado (${observation})` : 'Bloqueado';
};
const parsePositiveInt = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const intValue = Math.floor(number);
  return intValue > 0 ? intValue : null;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const isoCandidate = moment(value, moment.ISO_8601, true);
  if (isoCandidate.isValid()) {
    return isoCandidate;
  }
  const simple = moment(value, 'YYYY-MM-DD', true);
  return simple.isValid() ? simple : null;
};

const combineDateAndTime = (dateValue, timeValue) => {
  const base = parseDateValue(dateValue);
  if (!base) {
    return moment.invalid();
  }
  const time = withSeconds(timeValue) || '00:00:00';
  const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
  return base.clone().hours(Number(hours)).minutes(Number(minutes)).seconds(Number(seconds));
};

const MODE_CONFIG = {
  block: {
    key: 'block',
    title: (space) => `Bloqueos de ${space?.nombre ?? ''}`,
    info: 'El espacio queda disponible automaticamente de 06:00 a 20:00 todos los dias. Usa este calendario para bloquear franjas especificas (por ejemplo, mantenimientos o eventos). Selecciona un rango sobre el calendario para crear un bloqueo. Haz clic sobre un bloqueo existente para eliminarlo.',
    entryLabel: 'bloqueo',
    entryLabelPlural: 'bloqueos',
    calendarEmptyMessage: 'No hay bloqueos en el rango seleccionado',
    modalTitle: 'Bloquear horario',
    submitButtonLabel: 'Guardar bloqueo',
    loadingSubmitButtonLabel: 'Guardando...',
    submitErrorLabel: 'el bloqueo',
    deletePrompt: 'Eliminar este bloqueo y liberar el horario?',
    deleteErrorLabel: 'el bloqueo',
    observationLabel: 'Notas (opcional)',
    observationPlaceholder: 'Ej. Mantenimiento programado',
    showObservationField: true,
    getDisplayLabel: (entry) => normalizeObservation(entry?.observaciones),
    formatObservation: (formState) => {
      const trimmed = normalizeObservation(formState.observaciones);
      return trimmed || null;
    },
    filterEntries: (entry) => entry?.es_bloqueo && !isClassEntry(entry),
    defaultRecurrent: false,
    prefillObservation: '',
    useTextarea: true,
    eventClassName: 'space-block-event',
    eventStyle: {
      backgroundColor: '#dc3545',
      borderColor: '#dc3545',
      color: '#fff'
    }
  },
  class: {
    key: 'class',
    title: (space) => `Horario de clases de ${space?.nombre ?? ''}`,
    info: 'Define el horario habitual de clases para el semestre. Las franjas se marcaran como "Clase" y bloquearan nuevas reservas. Selecciona un rango sobre el calendario para agregar una clase y haz clic sobre una existente para eliminarla.',
    entryLabel: 'clase',
    entryLabelPlural: 'clases',
    calendarEmptyMessage: 'No hay clases en el rango seleccionado',
    modalTitle: 'Agregar clase',
    submitButtonLabel: 'Guardar clase',
    loadingSubmitButtonLabel: 'Guardando...',
    submitErrorLabel: 'la clase',
    deletePrompt: 'Eliminar esta clase y liberar el horario?',
    deleteErrorLabel: 'la clase',
    observationLabel: 'Notas adicionales (opcional)',
    observationPlaceholder: 'Ej. Comentarios para el aula',
    showObservationField: false,
    extraFields: [
      {
        name: 'classCode',
        label: 'Codigo de materia',
        placeholder: 'Ej. MAT101',
        required: true
      },
      {
        name: 'classGroup',
        label: 'Grupo',
        placeholder: 'Ej. 01',
        required: true
      }
    ],
    getDisplayLabel: (entry) => stripClassPrefix(entry?.observaciones) || 'Clase',
    formatObservation: (formState) => {
      const code = normalizeObservation(formState.classCode);
      const group = normalizeObservation(formState.classGroup);
      const parts = [];
      if (code) parts.push(code);
      if (group) parts.push(`Grupo ${group}`);
      const label = parts.join(' | ');
      return `${CLASS_EVENT_PREFIX}${label ? ` ${label}` : ''}`;
    },
    filterEntries: (entry) => entry?.es_bloqueo && isClassEntry(entry),
    defaultRecurrent: true,
    prefillObservation: '',
    useTextarea: false,
    eventClassName: 'space-class-event',
    eventStyle: {
      backgroundColor: '#6f42c1',
      borderColor: '#6f42c1',
      color: '#fff'
    }
  }
};

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

const SpaceScheduleCreate = ({ mode = 'block' }) => {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const config = MODE_CONFIG[mode] || MODE_CONFIG.block;
  const initialFormState = useMemo(
    () => ({
      ...INITIAL_FORM,
      recurrente: config.defaultRecurrent ?? false,
      observaciones: config.prefillObservation ?? '',
      classCode: '',
      classGroup: ''
    }),
    [config]
  );
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [pendingSummary, setPendingSummary] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setFormData({ ...initialFormState });
  }, [initialFormState]);

  const loadSpace = useCallback(async () => {
    try {
      const response = await api.get(`espacios/${id}/`);
      setSpace(response.data);
    } catch (err) {
      setError('Error al cargar el espacio seleccionado.');
    }
  }, [id]);

  const loadCalendarData = useCallback(async () => {
    try {
      setError('');
      const [entriesResponse, reservationsResponse] = await Promise.all([
        api.get(`espacios-disponibilidad/?espacio=${id}&bloqueo=true`),
        api.get(`reservas/?espacio=${id}`)
      ]);

      const entriesData = Array.isArray(entriesResponse.data) ? entriesResponse.data : [];
      const reservationsData = Array.isArray(reservationsResponse.data)
        ? reservationsResponse.data.filter((reservation) => {
            const state = (reservation.estado || '').toLowerCase();
            return state !== 'cancelado' && state !== 'rechazado';
          })
        : [];

      setScheduleEntries(entriesData);
      setReservations(reservationsData);
    } catch (err) {
      setError('No fue posible cargar la informacion del calendario del espacio.');
    }
  }, [id]);

  useEffect(() => {
    loadSpace();
  }, [loadSpace]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const events = useMemo(() => {
    if (!scheduleEntries.length && !reservations.length) return [];

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

    const entryEvents = [];

    const buildEntryEvent = (startMoment, endMoment, entry, options = {}) => {
      if (!startMoment.isValid() || !endMoment.isValid()) return null;
      if (endMoment.isSameOrBefore(startMoment)) return null;

      const category = options.category || (isClassEntry(entry) ? 'class' : 'block');
      const editable = options.editable ?? config.filterEntries(entry);

      const baseTimeLabel = `${startMoment.format('HH:mm')} - ${endMoment.format('HH:mm')}`;
      const labelFromConfig = editable ? config.getDisplayLabel(entry) : '';
      const fallbackLabel = category === 'class' ? 'Clase' : 'Bloqueado';

      const displayLabel =
        options.label ||
        (labelFromConfig || (editable ? fallbackLabel : category === 'class' ? formatClassLabel(entry) : formatBlockLabel(entry)));

      return {
        title: displayLabel,
        start: startMoment.toDate(),
        end: endMoment.toDate(),
        allDay: false,
        resource: {
          type: 'schedule-entry',
          entry,
          editable,
          category,
          timeLabel: baseTimeLabel,
          displayLabel
        }
      };
    };

    scheduleEntries.forEach((entry) => {
      const startTime = withSeconds(entry.hora_inicio);
      const endTime = withSeconds(entry.hora_fin);
      if (!startTime || !endTime) return;

      if (entry.recurrente && entry.dia_semana !== null && entry.dia_semana !== undefined) {
        const weekday = parseInt(entry.dia_semana, 10);
        if (Number.isNaN(weekday)) return;

        let current = rangeStart.clone().startOf('week').add(weekday, 'days');
        if (current.isBefore(rangeStart)) {
          current = current.add(7, 'days');
        }

        while (current.isSameOrBefore(rangeEnd, 'day')) {
          const startMoment = moment(`${current.format('YYYY-MM-DD')} ${startTime}`, 'YYYY-MM-DD HH:mm:ss');
          const endMoment = moment(`${current.format('YYYY-MM-DD')} ${endTime}`, 'YYYY-MM-DD HH:mm:ss');
          const event = buildEntryEvent(startMoment, endMoment, entry);
          if (event) entryEvents.push(event);
          current = current.add(7, 'days');
        }
      } else if (!entry.recurrente && entry.fecha_inicio) {
        const startMoment = combineDateAndTime(entry.fecha_inicio, startTime);
        const endMoment = combineDateAndTime(entry.fecha_fin || entry.fecha_inicio, endTime);

        if (!startMoment.isValid() || !endMoment.isValid()) {
          return;
        }

        if (endMoment.isBefore(rangeStart) || startMoment.isAfter(rangeEnd)) {
          return;
        }

        const event = buildEntryEvent(startMoment, endMoment, entry);
        if (event) entryEvents.push(event);
      }
    });

    const reservationEvents = [];

    reservations.forEach((reservation) => {
      if (!reservation.fecha_inicio || !reservation.fecha_fin) return;

      const baseStart = moment(reservation.fecha_inicio);
      const baseEnd = moment(reservation.fecha_fin);
      if (!baseStart.isValid() || !baseEnd.isValid()) return;

      const titleParts = [];
      if (reservation.usuario && reservation.usuario.first_name) {
        titleParts.push(reservation.usuario.first_name);
      }
      if (reservation.motivo) {
        titleParts.push(reservation.motivo);
      }
      if (!titleParts.length) {
        titleParts.push('Reserva confirmada');
      }
      const title = titleParts.join(' - ');

      const recurrencia = (reservation.metadata && reservation.metadata.recurrencia) || {};
      const occurrenceNumber = parsePositiveInt(recurrencia.ocurrencia) || 1;
      const totalOccurrences =
        parsePositiveInt(recurrencia.total_ocurrencias) ||
        parsePositiveInt(recurrencia.semanas) ||
        1;

      const addEvent = (startMoment, endMoment, occurrenceIndex) => {
        if (!startMoment.isValid() || !endMoment.isValid()) return;
        if (startMoment.isAfter(rangeEnd) || endMoment.isBefore(rangeStart)) return;

        reservationEvents.push({
          title,
          start: startMoment.toDate(),
          end: endMoment.toDate(),
          allDay: false,
          resource: {
            type: 'reservation',
            payload: reservation,
            occurrence: occurrenceIndex,
            totalOccurrences
          }
        });
      };

      if (reservation.recurrente && totalOccurrences > 1) {
        if (occurrenceNumber > 1) return;
        for (let index = 0; index < totalOccurrences; index += 1) {
          addEvent(baseStart.clone().add(index, 'weeks'), baseEnd.clone().add(index, 'weeks'), index + 1);
        }
        return;
      }

      addEvent(baseStart, baseEnd, occurrenceNumber);
    });

    return [...entryEvents, ...reservationEvents];
  }, [scheduleEntries, reservations, date, view, config]);

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

      const defaultRecurrent = config.defaultRecurrent ?? false;
      const weekdayIndex = isoWeekdayToIndex(startMoment);

      setSelectedDate(startMoment.toDate());
      setFormData({
        dia_semana: defaultRecurrent ? String(weekdayIndex) : '',
        hora_inicio: startMoment.format('HH:mm'),
        hora_fin: endMoment.format('HH:mm'),
        fecha_inicio: defaultRecurrent ? '' : startMoment.format('YYYY-MM-DD'),
        fecha_fin: defaultRecurrent ? '' : endMoment.format('YYYY-MM-DD'),
        recurrente: defaultRecurrent,
        observaciones: config.prefillObservation ?? '',
        classCode: '',
        classGroup: ''
      });
      setPendingPayload(null);
      setPendingSummary(null);
      setSuccessMessage('');
      setShowModal(true);
      setLoading(false);
      setError('');
    },
    [config]
  );

  const handleNavigate = (newDate, nextView) => {
    setDate(newDate);
    if (nextView) {
      setView(nextView);
    }
    setSelectedDate(null);
    setPendingPayload(null);
    setPendingSummary(null);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    handleViewChange('day');
    setSelectedDate(null);
    setPendingPayload(null);
    setPendingSummary(null);
  };

  const moveBetweenPeriods = useCallback(
    (direction) => {
      const unit = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day';
      const factor = direction === 'next' ? 1 : -1;
      const nextDate = moment(date).add(factor, unit).toDate();
      setDate(nextDate);
      setSelectedDate(null);
      setPendingPayload(null);
      setPendingSummary(null);
    },
    [date, view]
  );

  const handlePrev = () => moveBetweenPeriods('prev');
  const handleNext = () => moveBetweenPeriods('next');

  const handleViewChange = (nextView) => {
    setView(nextView);
    setPendingPayload(null);
    setPendingSummary(null);
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
      setPendingPayload(null);
      setPendingSummary(null);
      return;
    }

    setPendingPayload(null);
    setPendingSummary(null);

    const rawValue = type === 'checkbox' ? checked : value;
    const nextValue =
      name === 'classGroup' && typeof rawValue === 'string'
        ? rawValue.toUpperCase()
        : rawValue;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const buildPayload = useCallback(
    (formState) => {
      const payload = {
        espacio: id,
        es_bloqueo: true,
        recurrente: !!formState.recurrente,
        hora_inicio: withSeconds(formState.hora_inicio),
        hora_fin: withSeconds(formState.hora_fin)
      };

      const formattedObservation = config.formatObservation(formState);
      payload.observaciones = formattedObservation ?? null;

      if (formState.recurrente) {
        const weekdayValue = formState.dia_semana !== '' ? parseInt(formState.dia_semana, 10) : null;
        payload.dia_semana = Number.isInteger(weekdayValue) ? weekdayValue : null;
        payload.fecha_inicio = null;
        payload.fecha_fin = null;
      } else {
        payload.dia_semana = null;
        payload.fecha_inicio = formState.fecha_inicio;
        payload.fecha_fin = formState.fecha_fin;
      }

      return payload;
    },
    [config, id]
  );

  const buildSummary = useCallback(
    (payload, formState) => {
      const lines = [];
      if (payload.recurrente) {
        const weekdayOption = WEEKDAY_OPTIONS.find((option) => option.value === String(payload.dia_semana));
        const weekdayLabel = weekdayOption ? weekdayOption.label : 'Dia seleccionado';
        lines.push(`${weekdayLabel} de ${formState.hora_inicio} a ${formState.hora_fin}`);
      } else {
        const sameDay = formState.fecha_inicio === formState.fecha_fin;
        const startText = `${formState.fecha_inicio} ${formState.hora_inicio}`;
        const endText = `${sameDay ? '' : `${formState.fecha_fin} `}${formState.hora_fin}`;
        lines.push(`Desde ${startText} hasta ${endText}`.trim());
      }

      const extra = [];
      if (config.key === 'class') {
        if (formState.classCode) extra.push(`Codigo de materia: ${formState.classCode}`);
        if (formState.classGroup) extra.push(`Grupo: ${formState.classGroup}`);
      }
      if (config.showObservationField !== false && formState.observaciones) {
        extra.push(`Notas: ${formState.observaciones}`);
      }

      return { lines, extra };
    },
    [config]
  );

  const clearReviewStep = useCallback(() => {
    setPendingPayload(null);
    setPendingSummary(null);
    setLoading(false);
    setError('');
  }, []);

  const resetFormState = useCallback(() => {
    setFormData({ ...initialFormState });
    setSelectedDate(null);
    setError('');
    clearReviewStep();
  }, [initialFormState, clearReviewStep]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetFormState();
  }, [resetFormState]);

  const validateForm = () => {
    const startMoment = normalizeHourValue(formData.hora_inicio);
    const endMoment = normalizeHourValue(formData.hora_fin);

    if (!startMoment || !endMoment) {
      return 'Debes indicar hora de inicio y fin con formato HH:mm.';
    }

    if (
      startMoment.hour() < CALENDAR_START_HOUR ||
      endMoment.hour() > CALENDAR_END_HOUR ||
      (endMoment.hour() === CALENDAR_END_HOUR && endMoment.minute() > 0)
    ) {
      return 'Las franjas deben permanecer dentro del rango 06:00 - 20:00.';
    }

    if (!endMoment.isAfter(startMoment)) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    if (formData.recurrente) {
      if (formData.dia_semana === '' || formData.dia_semana === null) {
        return 'Selecciona un dia de la semana para la franja recurrente.';
      }
    } else {
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        return 'Debes definir fecha de inicio y fin de la franja.';
      }
      const startDate = moment(formData.fecha_inicio, 'YYYY-MM-DD', true);
      const endDate = moment(formData.fecha_fin, 'YYYY-MM-DD', true);
      if (!startDate.isValid() || !endDate.isValid()) {
        return 'Las fechas deben tener un formato valido (YYYY-MM-DD).';
      }
      if (endDate.isBefore(startDate)) {
        return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
      }
    }

    if (config.key === 'class') {
      if (!normalizeObservation(formData.classCode)) {
        return 'Debes indicar el codigo de la materia.';
      }
      if (!normalizeObservation(formData.classGroup)) {
        return 'Debes indicar el grupo de la materia.';
      }
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (pendingPayload) {
      setLoading(true);
      setError('');
      try {
        await api.post('espacios-disponibilidad/', pendingPayload);
        await loadCalendarData();
        setSuccessMessage(config.key === 'class' ? 'La clase se guardo correctamente.' : 'El bloqueo se guardo correctamente.');
        closeModal();
      } catch (err) {
        const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
        setError(`No se pudo registrar ${config.submitErrorLabel}: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload(formData);
    setPendingPayload(payload);
    setPendingSummary(buildSummary(payload, formData));
    setError('');
  };

  const handleDeleteEntry = useCallback(
    async (entry) => {
      if (!entry?.id) return;
      const confirmDelete = window.confirm(config.deletePrompt);
      if (!confirmDelete) return;

      try {
        await api.delete(`espacios-disponibilidad/${entry.id}/`);
        await loadCalendarData();
      } catch (err) {
        const serverMsg = err.response?.data ?? err.message ?? 'Error desconocido';
        setError(`No se pudo eliminar ${config.deleteErrorLabel}: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
      }
    },
    [config, loadCalendarData]
  );

  const eventPropGetter = useCallback(
    (event) => {
      const resource = event?.resource || {};

      if (resource.type === 'schedule-entry') {
        if (resource.editable) {
          return {
            className: config.eventClassName,
            style: { ...config.eventStyle }
          };
        }
        return {
          className: `${config.eventClassName} readonly`,
          style: resource.category === 'class' ? { ...READONLY_CLASS_STYLE } : { ...READONLY_BLOCK_STYLE }
        };
      }

      if (resource.type === 'reservation') {
        return {
          className: 'space-reservation-event',
          style: { ...RESERVATION_EVENT_STYLE }
        };
      }

      return {};
    },
    [config]
  );

  const calendarComponents = useMemo(
    () => ({
      toolbar: () => null
    }),
    []
  );

  const calendarMessages = useMemo(
    () => ({
      ...CALENDAR_MESSAGES,
      noEventsInRange: config.calendarEmptyMessage
    }),
    [config]
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
      <h1 className="mb-3">{config.title(space)}</h1>

      <div className="alert alert-info">
        {config.info}
      </div>

      {successMessage && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span>{successMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setSuccessMessage('')}
          >
            Cerrar
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group" role="group">
          <button
            type="button"
            className={`btn btn-outline-success${view === 'month' ? ' active' : ''}`}
            onClick={() => handleViewChange('month')}
            aria-pressed={view === 'month'}
          >
            Mes
          </button>
          <button
            type="button"
            className={`btn btn-outline-success${view === 'week' ? ' active' : ''}`}
            onClick={() => handleViewChange('week')}
            aria-pressed={view === 'week'}
          >
            Semana
          </button>
          <button
            type="button"
            className={`btn btn-outline-success${view === 'day' ? ' active' : ''}`}
            onClick={() => handleViewChange('day')}
            aria-pressed={view === 'day'}
          >
            Dia
          </button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={handlePrev}>Anterior</button>
          <button type="button" className="btn btn-outline-secondary" onClick={handleNext}>Siguiente</button>
          <button type="button" className="btn btn-primary" onClick={goToToday}>Hoy</button>
          <Link to="/admin/spaces" className="btn btn-secondary">Volver</Link>
        </div>
      </div>

      <div className="space-calendar mb-4" style={{ height: '550px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(eventObj) => {
            const resource = eventObj?.resource;
            if (resource?.type === 'schedule-entry' && resource.editable) {
              handleDeleteEntry(resource.entry);
            }
          }}
          date={date}
          view={view}
          onView={handleViewChange}
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
          messages={calendarMessages}
        />
      </div>

      <div className="space-legend mb-4">
        <span className="legend-item"><span className="legend-color legend-block" /> Bloqueos</span>
        <span className="legend-item"><span className="legend-color legend-class" /> Clases</span>
        <span className="legend-item"><span className="legend-color legend-reservation" /> Reservas</span>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{config.modalTitle}</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Cerrar"></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {pendingPayload ? (
                    <>
                      <div className="alert alert-info">
                        Verifica la informacion antes de confirmar el horario.
                      </div>
                      <ul className="list-group mb-3">
                        <li className="list-group-item">
                          {pendingPayload.recurrente ? 'Se repite cada semana' : 'Evento puntual'}
                        </li>
                        {(pendingSummary?.lines || []).map((line, index) => (
                          <li key={`summary-line-${index}`} className="list-group-item">
                            {line}
                          </li>
                        ))}
                        {(pendingSummary?.extra || []).map((detail, index) => (
                          <li key={`summary-detail-${index}`} className="list-group-item">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
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
                          <label htmlFor="dia_semana" className="form-label">Dia de la semana</label>
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

                      {Array.isArray(config.extraFields) && config.extraFields.length > 0 && (
                        <div className="row g-3 mt-1">
                          {config.extraFields.map((field) => (
                            <div key={field.name} className="col-md-6">
                              <label htmlFor={field.name} className="form-label">{field.label}</label>
                              <input
                                type="text"
                                className="form-control"
                                id={field.name}
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {config.showObservationField !== false && (
                        <div className="mt-3">
                          <label htmlFor="observaciones" className="form-label">{config.observationLabel}</label>
                          {config.useTextarea ? (
                            <textarea
                              className="form-control"
                              id="observaciones"
                              name="observaciones"
                              rows="2"
                              value={formData.observaciones}
                              onChange={handleChange}
                              placeholder={config.observationPlaceholder}
                            />
                          ) : (
                            <input
                              type="text"
                              className="form-control"
                              id="observaciones"
                              name="observaciones"
                              value={formData.observaciones}
                              onChange={handleChange}
                              placeholder={config.observationPlaceholder}
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={loading}>Cancelar</button>
                  {pendingPayload ? (
                    <>
                      <button type="button" className="btn btn-outline-primary" onClick={clearReviewStep} disabled={loading}>Editar</button>
                      <button type="submit" className="btn btn-success" disabled={loading}>
                        {loading ? config.loadingSubmitButtonLabel : 'Confirmar y guardar'}
                      </button>
                    </>
                  ) : (
                    <button type="submit" className="btn btn-success" disabled={loading}>
                      {loading ? config.loadingSubmitButtonLabel : config.submitButtonLabel}
                    </button>
                  )}
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



