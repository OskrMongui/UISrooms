import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { getUserFromToken } from '../utils/auth';

const PALETTE = {
  primary: '#67B93E',
  primaryDark: '#7FBA00',
  gold: '#C99500',
  orange: '#E67015',
  red: '#DA261D',
  teal: '#00A8BF',
  blue: '#0071B6',
  purple: '#7A1A66',
};

const formatTime = (isoString) => {
  if (!isoString) return '--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (date) => {
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDuration = (milliseconds) => {
  if (milliseconds == null) {
    return '--';
  }
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const twoDigits = (value) => value.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}h ${twoDigits(minutes)}m ${twoDigits(seconds)}s`;
  }
  return `${twoDigits(minutes)}m ${twoDigits(seconds)}s`;
};

const computeWindowState = (start, end, now) => {
  if (!start || !end || !now) {
    return { state: 'unknown' };
  }
  if (now < start) {
    return {
      state: 'before',
      msUntilStart: start.getTime() - now.getTime(),
      msUntilEnd: end.getTime() - now.getTime(),
    };
  }
  if (now > end) {
    return {
      state: 'after',
      msSinceEnd: now.getTime() - end.getTime(),
    };
  }
  return {
    state: 'active',
    msUntilEnd: end.getTime() - now.getTime(),
  };
};

const WEEK_DAYS = [
  { label: 'Lu', full: 'Lunes', dayNumber: 1 },
  { label: 'Ma', full: 'Martes', dayNumber: 2 },
  { label: 'Mi', full: 'Miércoles', dayNumber: 3 },
  { label: 'Ju', full: 'Jueves', dayNumber: 4 },
  { label: 'Vi', full: 'Viernes', dayNumber: 5 },
  { label: 'Sa', full: 'Sábado', dayNumber: 6 },
  { label: 'Do', full: 'Domingo', dayNumber: 0 },
];

const getProgramDate = (opening) =>
  toValidDate(opening?.hora_programada) ||
  toValidDate(opening?.registro?.fecha_programada) ||
  null;

const ATTENDANCE_STATES = {
  presente: { label: 'Profesor presente', variant: 'success' },
  tarde: { label: 'Llegada tarde registrada', variant: 'warning' },
  ausente: { label: 'Ausencia registrada', variant: 'danger' },
};

const CLOSURE_REASONS = [
  { value: 'fin_clase', label: 'Fin de clase / reserva' },
  { value: 'ausencia', label: 'Ausencia del profesor' },
  { value: 'instruccion', label: 'Instruccion administrativa' },
];

const DEFAULT_CLOSURE_REASON = CLOSURE_REASONS[0].value;

const getOpeningStatus = (opening) => {
  const registro = opening?.registro || {};
  const aperturaRegistrada = Boolean(
    (opening?.apertura_registrada ?? registro.completado)
  );
  const asistenciaRegistrada = Boolean(
    (opening?.asistencia_estado ?? registro.asistencia_estado)
  );
  const cierreRegistrado = Boolean(
    (opening?.cierre_registrado ?? registro.cierre_registrado)
  );
  return { aperturaRegistrada, asistenciaRegistrada, cierreRegistrado, registro };
};

const ConciergeOpenings = ({ initialView = 'dashboard' }) => {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [selectedOpening, setSelectedOpening] = useState(null);
  const [modalTimestamp, setModalTimestamp] = useState(null);

  const [attendanceModal, setAttendanceModal] = useState(null);
  const [attendanceTimestamp, setAttendanceTimestamp] = useState(null);
  const [lateTime, setLateTime] = useState('');

  const [closureModal, setClosureModal] = useState(null);
  const [closureTimestamp, setClosureTimestamp] = useState(null);
  const [closureReason, setClosureReason] = useState(DEFAULT_CLOSURE_REASON);
  const [closureNotes, setClosureNotes] = useState('');
  const [hourFilter, setHourFilter] = useState('');

  const user = useMemo(() => getUserFromToken(), []);
  const initialDay = useMemo(() => new Date(), []);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const currentDayNumber = initialDay.getDay();
    const idx = WEEK_DAYS.findIndex((day) => day.dayNumber === currentDayNumber);
    return idx === -1 ? 0 : idx;
  });
  const today = useMemo(() => new Date(), []);

  const selectedDate = useMemo(() => {
    const selectedDay = WEEK_DAYS[selectedDayIndex] || WEEK_DAYS[0];
    const todayWeekday = today.getDay();
    let diff = selectedDay.dayNumber - todayWeekday;
    if (diff < 0) {
      diff += 7;
    }
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate;
  }, [today, selectedDayIndex]);

  const fechaIso = useMemo(() => selectedDate.toISOString().slice(0, 10), [selectedDate]);

  const getWindowInfo = (opening) => {
    const programDate = getProgramDate(opening);
    const programEnd = toValidDate(opening?.hora_programada_fin);
    const registro = opening?.registro || {};
    const aperturaRegistradaEn =
      toValidDate(opening?.apertura_registrada_en) ||
      toValidDate(registro.completado_en) ||
      null;

    const aperturaStart = programDate
      ? new Date(programDate.getTime() - 20 * 60 * 1000)
      : null;
    const aperturaEnd = programDate
      ? new Date(programDate.getTime() + 5 * 60 * 1000)
      : null;

    const asistenciaStart = aperturaRegistradaEn || programDate;
    const asistenciaEnd = programDate
      ? new Date(programDate.getTime() + 30 * 60 * 1000)
      : null;

    const cierreStart = aperturaRegistradaEn || programDate;
    const cierreEnd = programEnd
      ? new Date(programEnd.getTime() + 5 * 60 * 1000)
      : programDate
      ? new Date(programDate.getTime() + 65 * 60 * 1000)
      : null;

    return {
      programDate,
      apertura: computeWindowState(aperturaStart, aperturaEnd, currentTime),
      asistencia: computeWindowState(asistenciaStart, asistenciaEnd, currentTime),
      cierre: computeWindowState(cierreStart, cierreEnd, currentTime),
    };
  };

  const renderWindowMessage = (windowState, label) => {
    if (!windowState || windowState.state === 'unknown') {
      return 'Horario no disponible.';
    }
    if (windowState.state === 'before') {
      return `${label} se habilita en ${formatDuration(windowState.msUntilStart)}.`;
    }
    if (windowState.state === 'active') {
      return `${label} se desactiva en ${formatDuration(windowState.msUntilEnd)}.`;
    }
    const elapsed = windowState.msSinceEnd ?? 0;
    return `${label} se desactivo hace ${formatDuration(elapsed)}.`;
  };

  const openingsByDay = useMemo(() => {
    const buckets = WEEK_DAYS.map(() => []);
    openings.forEach((opening) => {
      const programDate = getProgramDate(opening);
      if (!programDate) {
        return;
      }
      const dayIdx = WEEK_DAYS.findIndex((day) => day.dayNumber === programDate.getDay());
      if (dayIdx === -1) {
        return;
      }
      buckets[dayIdx].push(opening);
    });
    buckets.forEach((items) => {
      items.sort((a, b) => {
        const dateA = getProgramDate(a);
        const dateB = getProgramDate(b);
        return (dateA ? dateA.getTime() : 0) - (dateB ? dateB.getTime() : 0);
      });
    });
    return buckets;
  }, [openings]);

  const selectedDay = WEEK_DAYS[selectedDayIndex] || WEEK_DAYS[0];
  const visibleOpenings = openingsByDay[selectedDayIndex] || [];
  const selectedDayDate = useMemo(() => {
    if (!visibleOpenings.length) {
      return null;
    }
    return getProgramDate(visibleOpenings[0]);
  }, [visibleOpenings]);

  const isVerificationMode = initialView === 'verificacion';

  const filteredOpenings = useMemo(() => {
    const hourNumber = hourFilter.trim() === '' ? null : Number(hourFilter);
    const validHour = hourNumber != null && Number.isFinite(hourNumber);
    return visibleOpenings.filter((opening) => {
      const { aperturaRegistrada } = getOpeningStatus(opening);
      const matchesState = isVerificationMode ? aperturaRegistrada : !aperturaRegistrada;
      if (!matchesState) return false;
      if (!validHour) return true;
      const programDate = getProgramDate(opening);
      if (!programDate) return false;
      return programDate.getHours() === hourNumber;
    });
  }, [visibleOpenings, isVerificationMode, hourFilter]);

  const hasOpenings = useMemo(() => {
    return openingsByDay.some((items) =>
      items.some((opening) => {
        const { aperturaRegistrada } = getOpeningStatus(opening);
        return isVerificationMode ? aperturaRegistrada : !aperturaRegistrada;
      })
    );
  }, [openingsByDay, isVerificationMode]);

  const loadOpenings = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (showSpinner) {
        setLoading(true);
      }
      setError('');
      try {
        const response = await api.get('reservas/aperturas/', {
          params: { fecha: fechaIso },
        });
        const resultados = Array.isArray(response.data?.resultados)
          ? response.data.resultados
          : [];
        setOpenings(resultados);
      } catch (err) {
        setError('No fue posible cargar las aperturas del dia. Intenta nuevamente.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [fechaIso]
  );

  useEffect(() => {
    loadOpenings();
  }, [loadOpenings]);

  const attendanceHoraFormatted = attendanceTimestamp
    ? formatTime(attendanceTimestamp.toISOString())
    : '--';
  const attendanceFechaFormatted = attendanceTimestamp
    ? formatDateShort(attendanceTimestamp)
    : formatDateShort(currentTime);

  const closureHoraFormatted = closureTimestamp
    ? formatTime(closureTimestamp.toISOString())
    : '--';
  const closureFechaFormatted = closureTimestamp
    ? formatDateShort(closureTimestamp)
    : formatDateShort(currentTime);

  const greetingName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
    : 'conserje';
  const greeting = `Hola ${greetingName}`;
  const helperDescription = isVerificationMode
    ? 'Revisa aperturas ya realizadas y gestiona cierres pendientes.'
    : 'Gestiona aperturas, asistencia y cierres de aula desde este panel.';

  const openRegisterModal = (opening) => {
    if (!opening || !opening.reserva_id) {
      return;
    }
    setSelectedOpening(opening);
    setModalTimestamp(new Date());
    setError('');
    setSuccess('');
  };

  const closeRegisterModal = () => {
    setSelectedOpening(null);
    setModalTimestamp(null);
    setActionLoadingId(null);
  };

  const openAttendanceModal = (opening, mode) => {
    if (!opening || !opening.reserva_id) {
      return;
    }
    setAttendanceModal({ opening, mode });
    setAttendanceTimestamp(new Date());
    setLateTime('');
    setError('');
    setSuccess('');
  };

  const closeAttendanceModal = () => {
    setAttendanceModal(null);
    setAttendanceTimestamp(null);
    setLateTime('');
    setActionLoadingId(null);
  };

const openClosureModal = (opening) => {
  if (!opening || !opening.reserva_id) {
    return;
  }
  setClosureModal(opening);
  setClosureTimestamp(new Date());
  setClosureReason(DEFAULT_CLOSURE_REASON);
  setClosureNotes('');
  setError('');
  setSuccess('');
};

const closeClosureModal = () => {
  setClosureModal(null);
  setClosureTimestamp(null);
  setClosureReason(DEFAULT_CLOSURE_REASON);
  setClosureNotes('');
  setActionLoadingId(null);
};

const handleRegister = async () => {
  if (!selectedOpening || !selectedOpening.reserva_id) return;
  const reservaId = selectedOpening.reserva_id;
  setActionLoadingId(reservaId);
  setError('');

  try {
    const payload = {
      tipo_uso: selectedOpening.tipo_uso,
      profesor_solicitante: selectedOpening.profesor_solicitante,
      hora_actual: modalTimestamp ? modalTimestamp.toISOString() : undefined,
      estado_inicial: selectedOpening.estado_inicial,
    };

    if (selectedOpening.es_clase) {
      payload.codigo_materia = selectedOpening.codigo_materia;
      payload.codigo_grupo = selectedOpening.codigo_grupo;
    }

    await api.post(`reservas/${reservaId}/registrar-apertura/`, payload);
    setSuccess('Apertura registrada correctamente.');
    await loadOpenings({ showSpinner: false });
    closeRegisterModal();
    navigate('/aperturas/verificacion', { replace: false });
  } catch (err) {
    const detail = err.response?.data?.detail;
    setError(detail || 'No fue posible registrar la apertura. Intenta nuevamente.');
    if (err.response?.data?.registro) {
      await loadOpenings({ showSpinner: false });
    }
  } finally {
    setActionLoadingId(null);
  }
};

const handleAttendanceSubmit = async () => {
  if (!attendanceModal || !attendanceModal.opening?.reserva_id) return;
  const { opening, mode } = attendanceModal;
  const reservaId = opening.reserva_id;
  setActionLoadingId(reservaId);
  setError('');

  try {
    const timestamp = attendanceTimestamp || new Date();
    const payload = {
      estado: mode,
      profesor_solicitante: opening.profesor_solicitante,
      hora_actual: timestamp.toISOString(),
    };

    if (mode === 'tarde') {
      if (!lateTime || !lateTime.includes(':')) {
        setError('Debes indicar la hora real de llegada.');
        setActionLoadingId(null);
        return;
      }
      const parts = lateTime.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        setError('La hora real de llegada no es valida.');
        setActionLoadingId(null);
        return;
      }
      const actual = new Date(timestamp);
      actual.setHours(hours, minutes, 0, 0);
      payload.hora_real = actual.toISOString();
    } else if (mode === 'presente') {
      payload.hora_real = timestamp.toISOString();
    }

    await api.post(`reservas/${reservaId}/registrar-asistencia/`, payload);
    const successMessages = {
      presente: 'Asistencia registrada: profesor presente.',
      tarde: 'Asistencia registrada: llegada tarde.',
      ausente: 'Ausencia registrada y notificada.',
    };
    setSuccess(successMessages[mode] || 'Asistencia registrada correctamente.');
    await loadOpenings({ showSpinner: false });
    closeAttendanceModal();
  } catch (err) {
    const detail = err.response?.data?.detail;
    setError(detail || 'No fue posible registrar la asistencia. Intenta nuevamente.');
    if (err.response?.data?.registro) {
      await loadOpenings({ showSpinner: false });
    }
  } finally {
    setActionLoadingId(null);
  }
};

const handleClosureSubmit = async () => {
  if (!closureModal || !closureModal.reserva_id) return;
  const reservaId = closureModal.reserva_id;
  setActionLoadingId(reservaId);
  setError('');

  try {
    const timestamp = closureTimestamp || new Date();
    const payload = {
      motivo: closureReason,
      hora_actual: timestamp.toISOString(),
      observaciones: closureNotes || undefined,
    };

    await api.post(`reservas/${reservaId}/registrar-cierre/`, payload);
    setSuccess('Cierre del aula registrado correctamente.');
    await loadOpenings({ showSpinner: false });
    closeClosureModal();
  } catch (err) {
    const detail = err.response?.data?.detail;
    setError(detail || 'No fue posible registrar el cierre. Intenta nuevamente.');
    if (err.response?.data?.registro) {
      await loadOpenings({ showSpinner: false });
    }
  } finally {
    setActionLoadingId(null);
  }
};
const renderAttendanceStatus = (opening) => {
  const status = getOpeningStatus(opening);
  const registro = status.registro;
  const estado = opening.asistencia_estado ?? registro.asistencia_estado ?? null;
  const estadoDisplay = opening.asistencia_estado_display ?? registro.asistencia_estado_display ?? '';
  const llegadaIso = opening.hora_llegada_real ?? registro.hora_llegada_real ?? null;
  const registradaIso = opening.asistencia_registrada_en ?? registro.asistencia_registrada_en ?? null;

  if (!estado) {
    return (
      <p className="text-muted small mb-3">
        Aun no se ha registrado la asistencia del profesor o responsable.
      </p>
    );
  }

  const config = ATTENDANCE_STATES[estado] || {
    label: estadoDisplay || 'Asistencia registrada',
    variant: 'info',
  };

  return (
    <div className={`alert alert-${config.variant} small mb-3`}>
      <strong>{config.label}.</strong>
      {estado !== 'ausente' && llegadaIso ? (
        <span className="ms-1">Hora registrada: {formatTime(llegadaIso)}</span>
      ) : null}
      {estado === 'ausente' &&
      (opening.ausencia_notificada || registro.ausencia_notificada) ? (
        <span className="ms-1">Se notifico a administracion.</span>
      ) : null}
      {registradaIso ? (
        <span className="ms-1 text-muted">
          Marcado: {formatTime(registradaIso)}
        </span>
      ) : null}
    </div>
  );
};

const renderClosureStatus = (opening) => {
  const status = getOpeningStatus(opening);
  const registro = status.registro;
  const cierreRegistrado = status.cierreRegistrado;
  if (!cierreRegistrado) {
    return (
      <p className="text-muted small mb-3">
        El aula aun no ha sido cerrada. Registra el cierre cuando finalice la actividad.
      </p>
    );
  }

  const motivoDisplay =
    opening.cierre_motivo_display ??
    registro.cierre_motivo_display ??
    'Cierre registrado';
  const cierreHora =
    opening.cierre_registrado_en ??
    registro.cierre_registrado_en ??
    null;
  const observaciones =
    opening.cierre_observaciones ??
    registro.cierre_observaciones ??
    '';

  return (
    <div className="alert alert-secondary small mb-3">
      <strong>{motivoDisplay}.</strong>{' '}
      {cierreHora ? (
        <span>Registrado a las {formatTime(cierreHora)}.</span>
      ) : null}
      {observaciones ? (
        <span className="ms-1">Observaciones: {observaciones}</span>
      ) : null}
    </div>
  );
};

const renderOpeningCard = (opening) => {
  const status = getOpeningStatus(opening);
  const { aperturaRegistrada, asistenciaRegistrada, cierreRegistrado, registro } = status;

  const windowInfo = getWindowInfo(opening);
  const aperturaWindow = windowInfo.apertura;
  const asistenciaWindow = windowInfo.asistencia;
  const cierreWindow = windowInfo.cierre;
  const canRegisterOpening = aperturaWindow && aperturaWindow.state === 'active';
  const canRegisterAttendance = asistenciaWindow && asistenciaWindow.state === 'active';
  const canRegisterClosure = cierreWindow && cierreWindow.state === 'active';
  const programDate = windowInfo.programDate || getProgramDate(opening);
  const horaProgramada = programDate
    ? programDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : formatTime(opening.hora_programada);
  const diaProgramado = programDate
    ? programDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    : formatDateShort(currentTime);

  const aulaLabel = opening.aula || opening.espacio_nombre || 'Espacio sin nombre';
  const tipoUsoLabel = opening.tipo_uso || 'Reserva especial';
  const origen = opening.origen || (opening.reserva_id ? 'reserva' : 'horario');
  const isReadOnly = opening.permite_registro === false || !opening.reserva_id;
  const solicitanteLabel =
    opening.profesor_solicitante || (isReadOnly ? 'Horario institucional' : 'No asignado');
  const espacioCodigo = opening?.espacio_codigo || opening?.espacio?.codigo || 'A';
  const thumbLabel = String(espacioCodigo).slice(0, 3).toUpperCase();
  const badgeStyles = origen === 'horario'
    ? { backgroundColor: PALETTE.teal, color: '#fff' }
    : { backgroundColor: PALETTE.gold, color: '#fff' };
  const badgeLabel = origen === 'horario' ? 'Horario fijo' : 'Reserva';
  const stage = opening.estado_etapa || 'inicial';
  const stageConfig = {
    inicial: { label: 'Aula cerrada', style: { backgroundColor: '#b5b5b5', color: '#fff' } },
    en_proceso: { label: 'Aula abierta', style: { backgroundColor: PALETTE.primaryDark, color: '#fff' } },
    final: { label: 'Aula cerrada', style: { backgroundColor: PALETTE.red, color: '#fff' } },
  };
  const stageBadge = stageConfig[stage] || stageConfig.inicial;
  const cardKey =
    opening.uid ||
    opening.reserva_id ||
    `${origen}-${opening.hora_programada || ''}-${aulaLabel}`;

  return (
    <div key={cardKey} className="col">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex flex-column gap-3">
          <div className="d-flex gap-3 align-items-start">
            <div
              className="flex-shrink-0"
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '1.5rem',
                background: `linear-gradient(145deg, ${PALETTE.primary}, ${PALETTE.teal})`,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                boxShadow: '0 6px 16px rgba(25, 135, 84, 0.18)',
              }}
            >
              {thumbLabel}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                <span className="fw-semibold text-dark">{horaProgramada}</span>
                <span className="text-muted">· {diaProgramado}</span>
                <span className="badge" style={{ ...badgeStyles, fontSize: '0.75rem' }}>{badgeLabel}</span>
                <span className="badge" style={{ ...stageBadge.style, fontSize: '0.75rem' }}>{stageBadge.label}</span>
              </div>
              <h3 className="h5 mb-1 text-dark">{tipoUsoLabel}</h3>
              <div className="text-muted small mb-2">
                <strong>Ubicacion:</strong> {aulaLabel}
              </div>
              <div className="text-muted small">
                <div><strong>Solicitante:</strong> {solicitanteLabel}</div>
                {opening.es_clase ? (
                  <div>
                    <strong>Materia:</strong> {opening.codigo_materia || 'N/D'} · <strong>Grupo:</strong> {opening.codigo_grupo || 'N/D'}
                  </div>
                ) : opening.reserva_id ? (
                  <div>
                    <strong>Reserva:</strong> {opening.reserva_id}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isReadOnly ? (
            <div className="alert alert-info small mb-0">
              Este horario proviene del cronograma base y se muestra solo para consulta.
            </div>
          ) : aperturaRegistrada ? (
            <div className="alert alert-success small mb-0">
              Apertura registrada por <strong>{registro?.registrado_por_nombre || 'conserjeria'}</strong> a las{' '}
              {formatTime(registro?.completado_en || registro?.registrado_en)}.
            </div>
          ) : (
            <div className="alert alert-warning small mb-0">
              Apertura pendiente de registro. Confirma cuando realices la apertura.
            </div>
          )}

          {!aperturaRegistrada && (
            <p className="small text-muted mb-0">
              {renderWindowMessage(aperturaWindow, 'La apertura del aula')}
            </p>
          )}

          {!isReadOnly && (
            <div className="pt-2">
              {!aperturaRegistrada ? (
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: PALETTE.primary,
                      color: '#fff',
                      borderColor: PALETTE.primary,
                    }}
                    disabled={actionLoadingId === opening.reserva_id || !canRegisterOpening}
                  title={!canRegisterOpening ? 'Disponible 20 minutos antes y hasta 5 minutos despues del inicio programado.' : undefined}
                  onClick={() => openRegisterModal(opening)}
                >
                  {actionLoadingId === opening.reserva_id
                    ? 'Registrando...'
                    : 'Registrar apertura'}
                </button>
              </div>
              ) : (
                <>
                  <div className="border-top pt-3">
                    <h6 className="text-success text-uppercase small mb-2">Verificacion de presencia</h6>
                    {renderAttendanceStatus(opening)}
                    {!asistenciaRegistrada && (
                    <>
                      <p className="small text-muted mb-2">
                        {renderWindowMessage(asistenciaWindow, 'La verificacion de asistencia')}
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm fw-semibold"
                          style={{
                            border: `1px solid ${PALETTE.primary}`,
                            color: PALETTE.primary,
                          }}
                          onClick={() => openAttendanceModal(opening, 'presente')}
                          disabled={actionLoadingId === opening.reserva_id || !canRegisterAttendance}
                        >
                          Si, llego
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm fw-semibold"
                          style={{
                            border: `1px solid ${PALETTE.orange}`,
                            color: PALETTE.orange,
                          }}
                          onClick={() => openAttendanceModal(opening, 'tarde')}
                          disabled={actionLoadingId === opening.reserva_id || !canRegisterAttendance}
                        >
                          Llego tarde
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm fw-semibold"
                          style={{
                            border: `1px solid ${PALETTE.red}`,
                            color: PALETTE.red,
                          }}
                          onClick={() => openAttendanceModal(opening, 'ausente')}
                          disabled={actionLoadingId === opening.reserva_id || !canRegisterAttendance}
                        >
                          No llego
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-top pt-3 mt-3">
                  <h6 className="text-success text-uppercase small mb-2">Cierre del aula</h6>
                  {renderClosureStatus(opening)}
                  {!cierreRegistrado && (
                    <>
                      <p className="small text-muted mb-2">
                        {renderWindowMessage(cierreWindow, 'El cierre del aula')}
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm fw-semibold"
                        style={{
                          border: `1px solid ${PALETTE.blue}`,
                          color: PALETTE.blue,
                        }}
                        onClick={() => openClosureModal(opening)}
                        disabled={
                          actionLoadingId === opening.reserva_id || !canRegisterClosure
                        }
                        title={
                          !canRegisterClosure
                            ? 'Disponible desde la apertura y hasta 5 minutos despues de la hora de fin.'
                            : undefined
                        }
                      >
                        Registrar cierre
                      </button>
                    </>
                  )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const renderDaySelector = () => (
  <>
    <div className="d-flex justify-content-center flex-wrap gap-2 mb-3">
      {WEEK_DAYS.map((day, index) => {
        const isActive = index === selectedDayIndex;
        return (
          <button
            key={day.dayNumber}
            type="button"
            className={`btn btn-sm rounded-circle ${isActive ? 'text-white' : 'text-muted'}`}
            style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              border: `2px solid ${isActive ? PALETTE.primary : '#e7e7e7'}`,
              fontWeight: isActive ? 600 : 500,
              backgroundColor: isActive ? PALETTE.primary : '#f5f8f5',
            }}
            onClick={() => setSelectedDayIndex(index)}
          >
            {day.label}
          </button>
        );
      })}
    </div>
    <div className="card border-0 shadow-sm mb-4 mx-auto" style={{ maxWidth: '780px' }}>
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row align-items-center gap-3">
          <div className="flex-grow-1 w-100">
            <label className="form-label text-muted text-uppercase small mb-1">Filtrar por hora</label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                min="0"
                max="23"
                className="form-control"
                placeholder="Ej. 8"
                value={hourFilter}
                onChange={(e) => setHourFilter(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: PALETTE.teal, color: '#fff' }}
                onClick={() => setHourFilter('')}
              >
                Limpiar
              </button>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
            {[6, 7, 8, 9, 10, 14, 16].map((hour) => (
              <button
                key={hour}
                type="button"
                className="btn btn-sm"
                style={{
                  backgroundColor:
                    hourFilter == hour ? PALETTE.orange : 'transparent',
                  color: hourFilter == hour ? '#fff' : '#555',
                  border: `1px solid ${hourFilter == hour ? PALETTE.orange : '#d7d7d7'}`,
                }}
                onClick={() => setHourFilter(String(hour))}
              >
                {hour}:00
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>
);

const selectedDayLabel = selectedDay.full;
const selectedDayDateLabel = selectedDate
  ? selectedDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  : null;

return (
  <div className="container py-3" style={{ maxWidth: '900px' }}>
    <div className="text-center mb-4">
      <h1 className="h3 fw-semibold mb-2">Horario</h1>
      <p className="text-muted mb-0">{greeting}. {helperDescription}</p>
    </div>

    {renderDaySelector()}

    <div className="text-center mb-4">
      <h2 className="h5 text-success mb-1">{selectedDayLabel}</h2>
      {selectedDayDateLabel && (
        <p className="text-muted small mb-0">{selectedDayDateLabel}</p>
      )}
    </div>

    {loading && (
      <div className="alert alert-info">Cargando aperturas programadas...</div>
    )}

    {!loading && error && (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )}

    {!loading && success && (
      <div className="alert alert-success" role="alert">
        {success}
      </div>
    )}

    {!loading && !error && !filteredOpenings.length && (
      <div className="d-flex justify-content-center">
        <div className="card border-0 shadow-sm text-center" style={{ maxWidth: '28rem' }}>
          <div className="card-body py-5">
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: '4.5rem',
                height: '4.5rem',
                backgroundColor: '#f2f5f7',
                color: '#198754',
                fontSize: '2rem',
              }}
              aria-hidden="true"
            >
              📅
            </div>
            <h3 className="h5 mb-2">Sin resultados</h3>
            <p className="text-muted mb-0">
              {hourFilter
                ? 'No hay coincidencias para la hora filtrada.'
                : isVerificationMode
                ? 'No hay aperturas registradas para el dia seleccionado.'
                : 'No hay aperturas pendientes para el dia seleccionado.'}
            </p>
          </div>
        </div>
      </div>
    )}

    {!loading && !error && filteredOpenings.length > 0 && (
      <div className="row row-cols-1 g-4">
        {filteredOpenings.map((opening) => renderOpeningCard(opening))}
      </div>
    )}

    {!loading && !error && !hasOpenings && (
      <p className="text-center text-muted mt-4">
        {isVerificationMode
          ? 'No hay aperturas registradas en la semana seleccionada.'
          : 'No hay aperturas pendientes en la semana seleccionada.'}
      </p>
    )}

    {selectedOpening && (
      <>
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar apertura</h5>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeRegisterModal}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Registrar apertura del aula <strong>{selectedOpening.aula || 'Sin nombre'}</strong> a las{' '}
                  <strong>{modalTimestamp ? formatTime(modalTimestamp.toISOString()) : '--'}</strong>, correspondiente a:
                </p>
                <ul className="mb-3">
                  <li>
                    <strong>Tipo de uso:</strong> {selectedOpening.tipo_uso || 'Reserva especial'} (
                    {selectedOpening.es_clase ? 'Clase programada' : 'Reserva especial'})
                  </li>
                  <li>
                    <strong>Profesor / Solicitante:</strong> {selectedOpening.profesor_solicitante || 'No asignado'}
                  </li>
                  {selectedOpening.es_clase ? (
                    <>
                      <li><strong>Codigo materia:</strong> {selectedOpening.codigo_materia || 'N/D'}</li>
                      <li><strong>Grupo:</strong> {selectedOpening.codigo_grupo || 'N/D'}</li>
                    </>
                  ) : (
                    <li><strong>ID de reserva:</strong> {selectedOpening.reserva_id}</li>
                  )}
                  <li><strong>Hora programada:</strong> {formatTime(selectedOpening.hora_programada)}</li>
                  <li><strong>Fecha:</strong> {formatDateShort(modalTimestamp || currentTime)}</li>
                  <li><strong>Estado inicial:</strong> {selectedOpening.estado_inicial}</li>
                </ul>
                <p className="mb-0">¿Deseas confirmar el registro de apertura?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeRegisterModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={actionLoadingId === selectedOpening.reserva_id}
                  onClick={handleRegister}
                >
                  Confirmar apertura
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show"></div>
      </>
    )}

    {attendanceModal && (
      <>
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar asistencia</h5>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeAttendanceModal}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Aula <strong>{attendanceModal.opening.aula || 'Sin nombre'}</strong> | Hora programada{' '}
                  <strong>{formatTime(attendanceModal.opening.hora_programada)}</strong>.
                </p>
                <p className="mb-3">
                  Registrar asistencia como <strong>{attendanceModal.mode}</strong> el{' '}
                  <strong>{attendanceFechaFormatted}</strong> a las <strong>{attendanceHoraFormatted}</strong>.
                </p>
                {attendanceModal.mode === 'tarde' && (
                  <div className="mb-3">
                    <label className="form-label small" htmlFor="lateTimeInput">
                      Hora real de llegada
                    </label>
                    <input
                      id="lateTimeInput"
                      type="time"
                      className="form-control"
                      value={lateTime}
                      onChange={(event) => setLateTime(event.target.value)}
                    />
                    <div className="form-text">Ingresa la hora exacta en la que llego el responsable.</div>
                  </div>
                )}
                {attendanceModal.mode === 'ausente' && (
                  <p className="alert alert-warning small mb-0">
                    Registraras la ausencia y se notificara a la administracion.
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeAttendanceModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={actionLoadingId === attendanceModal.opening.reserva_id}
                  onClick={handleAttendanceSubmit}
                >
                  Confirmar asistencia
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show"></div>
      </>
    )}

    {closureModal && (
      <>
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar cierre de aula</h5>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeClosureModal}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Aula <strong>{closureModal.aula || 'Sin nombre'}</strong> | Hora programada{' '}
                  <strong>{formatTime(closureModal.hora_programada)}</strong>.
                </p>
                <p className="mb-2">
                  Registrar cierre realizado a las <strong>{closureHoraFormatted}</strong> del{' '}
                  <strong>{closureFechaFormatted}</strong>.
                </p>
                <div className="mb-3">
                  <label className="form-label small" htmlFor="closureReason">
                    Motivo del cierre
                  </label>
                  <select
                    id="closureReason"
                    className="form-select"
                    value={closureReason}
                    onChange={(event) => setClosureReason(event.target.value)}
                  >
                    {CLOSURE_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-0">
                  <label className="form-label small" htmlFor="closureNotes">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    id="closureNotes"
                    className="form-control"
                    rows={3}
                    value={closureNotes}
                    onChange={(event) => setClosureNotes(event.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeClosureModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={actionLoadingId === closureModal.reserva_id}
                  onClick={handleClosureSubmit}
                >
                  Confirmar cierre
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show"></div>
      </>
    )}
  </div>
);
};

export default ConciergeOpenings;
