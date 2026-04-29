import { useState, useEffect } from 'react';
import api from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const TIPOS = [
  { id: 'evento', label: '📌 Evento', color: '#6366f1' },
  { id: 'entrega', label: '📦 Entrega', color: '#ef4444' },
  { id: 'reunion', label: '🤝 Reunión', color: '#06b6d4' },
];

const ESTADO_LABELS = {
  backlog: 'Backlog', todo: 'Por hacer', in_progress: 'En progreso',
  review: 'Revisión', done: 'Completado'
};

export default function Calendario({ user, emitActivity }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', tipo: 'evento', equipo_id: '', color: '#6366f1' });

  useEffect(() => { loadData(); }, [currentDate]);

  const loadData = async () => {
    try {
      const [ev, eq, t] = await Promise.all([
        api.getEventos({ mes: String(currentDate.getMonth() + 1), anio: String(currentDate.getFullYear()) }),
        api.getEquipos(),
        api.getTareas()
      ]);
      setEventos(ev);
      setEquipos(eq);
      setTareas(t);
    } catch (err) { console.error(err); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrev - i, otherMonth: true, date: new Date(year, month - 1, daysInPrev - i) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, otherMonth: false, date: new Date(year, month, i) });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, otherMonth: true, date: new Date(year, month + 1, i) });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return eventos.filter(e => {
      const start = e.fecha_inicio?.split('T')[0];
      const end = e.fecha_fin?.split('T')[0];
      return start === dateStr || (end && start <= dateStr && end >= dateStr);
    });
  };

  const getTareasForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tareas.filter(t => t.fecha_limite && t.fecha_limite.split('T')[0] === dateStr);
  };

  const isToday = (date) => {
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Open day detail panel
  const openDayDetail = (date) => {
    setSelectedDay(date);
  };

  const closeDayDetail = () => {
    setSelectedDay(null);
  };

  const openCreate = (date) => {
    setEditingEvento(null);
    const dateStr = date ? formatDateStr(date) : '';
    setForm({ titulo: '', descripcion: '', fecha_inicio: dateStr, fecha_fin: '', tipo: 'evento', equipo_id: '', color: '#6366f1' });
    setShowModal(true);
  };

  const openEdit = (evento) => {
    setEditingEvento(evento);
    setForm({
      titulo: evento.titulo,
      descripcion: evento.descripcion || '',
      fecha_inicio: evento.fecha_inicio?.split('T')[0] || '',
      fecha_fin: evento.fecha_fin?.split('T')[0] || '',
      tipo: evento.tipo || 'evento',
      equipo_id: evento.equipo_id || '',
      color: evento.color || '#6366f1',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingEvento) {
        await api.updateEvento(editingEvento.id, form);
      } else {
        await api.createEvento(form);
        // Auto-create a task in the board for non-entrega events
        if (form.tipo !== 'entrega') {
          try {
            await api.createTarea({
              titulo: form.titulo,
              descripcion: form.descripcion || `Evento del cronograma: ${form.titulo}`,
              estado: 'todo',
              prioridad: 'media',
              equipo_id: form.equipo_id || null,
              fecha_limite: form.fecha_inicio,
            });
          } catch (taskErr) {
            console.error('Error creating linked task:', taskErr);
          }
        }
      }
      setShowModal(false);
      loadData();
      if (emitActivity) emitActivity({ tipo: 'evento_creado', descripcion: `Evento "${form.titulo}" ${editingEvento ? 'actualizado' : 'creado'}` });
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async () => {
    if (!editingEvento) return;
    try {
      await api.deleteEvento(editingEvento.id);
      setShowModal(false);
      loadData();
    } catch (err) { alert(err.message); }
  };

  // Day detail data
  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const dayTareas = selectedDay ? getTareasForDay(selectedDay) : [];
  const selectedDateStr = selectedDay ? selectedDay.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Cronograma 📅</h2>
        <p>Planifica entregas y reuniones del proyecto de investigación</p>
      </div>

      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="btn-icon" onClick={prevMonth}>◀</button>
          <h3>{MESES[month]} {year}</h3>
          <button className="btn-icon" onClick={nextMonth}>▶</button>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate(new Date())}>➕ Nuevo Evento</button>
      </div>

      <div className="calendar-grid">
        {DIAS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {calendarDays.map((d, i) => {
          const devents = getEventsForDay(d.date);
          const dtasks = getTareasForDay(d.date);
          const totalItems = devents.length + dtasks.length;
          return (
            <div
              key={i}
              className={`calendar-day ${d.otherMonth ? 'other-month' : ''} ${isToday(d.date) ? 'today' : ''} ${selectedDay && formatDateStr(selectedDay) === formatDateStr(d.date) ? 'selected' : ''}`}
              onClick={() => openDayDetail(d.date)}
            >
              <div className="calendar-day-number">{d.day}</div>
              {devents.slice(0, 2).map(ev => (
                <div
                  key={`ev-${ev.id}`}
                  className="calendar-event"
                  style={{ background: `${ev.color}30`, color: ev.color, borderLeft: `3px solid ${ev.color}` }}
                  onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                  title={ev.titulo}
                >
                  {ev.titulo}
                </div>
              ))}
              {dtasks.slice(0, 2 - Math.min(devents.length, 2)).map(t => (
                <div
                  key={`t-${t.id}`}
                  className="calendar-event"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderLeft: '3px solid #f59e0b' }}
                  title={`Tarea: ${t.titulo}`}
                >
                  📋 {t.titulo}
                </div>
              ))}
              {totalItems > 2 && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>+{totalItems - 2} más</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="modal-overlay" onClick={closeDayDetail}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>📅 {selectedDateStr}</h3>
              <button className="modal-close" onClick={closeDayDetail}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { closeDayDetail(); openCreate(selectedDay); }}>
                ➕ Evento
              </button>
            </div>

            {/* Events */}
            {dayEvents.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📌</span> Eventos ({dayEvents.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayEvents.map(ev => (
                    <div key={ev.id} onClick={() => { closeDayDetail(); openEdit(ev); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                        background: 'var(--bg-primary)', borderRadius: '10px', cursor: 'pointer',
                        borderLeft: `4px solid ${ev.color}`, transition: 'all 0.2s'
                      }}
                      className="day-detail-item"
                    >
                      <div style={{ fontSize: '22px' }}>{TIPOS.find(t => t.id === ev.tipo)?.label?.split(' ')[0] || '📌'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{ev.titulo}</div>
                        {ev.descripcion && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ev.descripcion}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                          <span className="badge badge-equipo" style={{ fontSize: '10px' }}>{ev.tipo}</span>
                          {ev.equipo_nombre && <span>Equipo {ev.equipo_numero}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {dayTareas.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span> Tareas ({dayTareas.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayTareas.map(t => (
                    <div key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                        background: 'var(--bg-primary)', borderRadius: '10px',
                        borderLeft: `4px solid ${t.prioridad === 'alta' || t.prioridad === 'critica' ? '#ef4444' : t.prioridad === 'media' ? '#f59e0b' : '#22c55e'}`
                      }}
                    >
                      <span className={`status-dot ${t.estado}`} style={{ width: '12px', height: '12px' }}></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t.titulo}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`badge badge-priority-${t.prioridad}`} style={{ fontSize: '10px' }}>{t.prioridad}</span>
                          <span>{ESTADO_LABELS[t.estado]}</span>
                          {t.asignado_nombre && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="task-card-assignee" style={{ background: t.asignado_color, width: '18px', height: '18px', fontSize: '9px' }}>
                                {t.asignado_nombre.charAt(0)}
                              </span>
                              {t.asignado_nombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayEvents.length === 0 && dayTareas.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                <p style={{ fontSize: '14px' }}>No hay eventos ni tareas para este día.</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Haz clic en "Evento" para agregar uno.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEvento ? '✏️ Editar Evento' : '📅 Nuevo Evento'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Título *</label>
                <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Nombre del evento" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalles..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Fecha inicio *</label>
                  <input className="form-input" type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Fecha fin</label>
                  <input className="form-input" type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Tipo</label>
                  <select className="form-select" value={form.tipo} onChange={e => {
                    const tipo = TIPOS.find(t => t.id === e.target.value);
                    setForm({ ...form, tipo: e.target.value, color: tipo?.color || '#6366f1' });
                  }}>
                    {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Equipo</label>
                  <select className="form-select" value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })}>
                    <option value="">General</option>
                    {equipos.map(eq => <option key={eq.id} value={eq.id}>Eq. {eq.numero}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '60px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
              </div>
              {!editingEvento && form.tipo !== 'entrega' && (
                <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--accent-hover)' }}>
                  ℹ️ Este evento también creará una tarea automáticamente en el Tablero.
                </div>
              )}
              <div className="modal-actions">
                {editingEvento && <button type="button" className="btn btn-danger" onClick={handleDelete}>🗑️ Eliminar</button>}
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingEvento ? '💾 Guardar' : '✨ Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
