import { useState, useEffect } from 'react';
import api from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const TIPOS = [
  { id: 'evento', label: '📌 Evento', color: '#6366f1' },
  { id: 'entrega', label: '📦 Entrega', color: '#ef4444' },
  { id: 'hito', label: '🏆 Hito', color: '#f59e0b' },
  { id: 'reunion', label: '🤝 Reunión', color: '#06b6d4' },
  { id: 'fase', label: '🔄 Fase', color: '#8b5cf6' },
];

export default function Calendario({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', tipo: 'evento', equipo_id: '', color: '#6366f1' });

  useEffect(() => { loadData(); }, [currentDate]);

  const loadData = async () => {
    try {
      const [ev, eq] = await Promise.all([
        api.getEventos({ mes: String(currentDate.getMonth() + 1), anio: String(currentDate.getFullYear()) }),
        api.getEquipos()
      ]);
      setEventos(ev);
      setEquipos(eq);
    } catch (err) { console.error(err); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();

  const calendarDays = [];
  // Previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrev - i, otherMonth: true, date: new Date(year, month - 1, daysInPrev - i) });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, otherMonth: false, date: new Date(year, month, i) });
  }
  // Next month fill
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

  const isToday = (date) => {
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const openCreate = (date) => {
    setEditingEvento(null);
    const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
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
      }
      setShowModal(false);
      loadData();
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

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Cronograma 📅</h2>
        <p>Planifica entregas, hitos y reuniones del proyecto de investigación</p>
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
          const dayEvents = getEventsForDay(d.date);
          return (
            <div
              key={i}
              className={`calendar-day ${d.otherMonth ? 'other-month' : ''} ${isToday(d.date) ? 'today' : ''}`}
              onClick={() => openCreate(d.date)}
            >
              <div className="calendar-day-number">{d.day}</div>
              {dayEvents.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  className="calendar-event"
                  style={{ background: `${ev.color}30`, color: ev.color, borderLeft: `3px solid ${ev.color}` }}
                  onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                  title={ev.titulo}
                >
                  {ev.titulo}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>+{dayEvents.length - 3} más</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">📌 Próximos eventos</h3>
        </div>
        {eventos.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No hay eventos este mes. Haz clic en un día para agregar uno.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eventos.slice(0, 8).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', cursor: 'pointer', borderLeft: `3px solid ${ev.color}` }} onClick={() => openEdit(ev)}>
                <div style={{ fontSize: '20px' }}>{TIPOS.find(t => t.id === ev.tipo)?.label?.split(' ')[0] || '📌'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{ev.titulo}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {ev.fecha_inicio?.split('T')[0]} {ev.equipo_nombre ? `· Equipo ${ev.equipo_numero}` : ''}
                  </div>
                </div>
                <span className="badge badge-equipo">{ev.tipo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
