import { useState, useEffect } from 'react';
import api from '../api';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', icon: '📥' },
  { id: 'todo', label: 'Por Hacer', icon: '📝' },
  { id: 'in_progress', label: 'En Progreso', icon: '⚡' },
  { id: 'review', label: 'Revisión', icon: '🔍' },
  { id: 'done', label: 'Completado', icon: '✅' },
];

export default function Board({ user }) {
  const [tareas, setTareas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterEquipo, setFilterEquipo] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);

  // Form state
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', equipo_id: '', fecha_limite: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, e, u] = await Promise.all([api.getTareas(), api.getEquipos(), api.getUsers()]);
      setTareas(t);
      setEquipos(e);
      setUsers(u);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = (estado = 'backlog') => {
    setEditingTask(null);
    setForm({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', equipo_id: user.equipo_id || '', fecha_limite: '', estado });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      prioridad: task.prioridad,
      asignado_a: task.asignado_a || '',
      equipo_id: task.equipo_id || '',
      fecha_limite: task.fecha_limite || '',
      estado: task.estado,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        asignado_a: form.asignado_a || null,
        equipo_id: form.equipo_id || null,
      };
      if (editingTask) {
        await api.updateTarea(editingTask.id, data);
      } else {
        await api.createTarea(data);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.deleteTarea(editingTask.id);
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Drag & Drop
  const onDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const onDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const onDrop = async (e, columnId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!draggedTask || draggedTask.estado === columnId) return;
    try {
      await api.updateTarea(draggedTask.id, { estado: columnId });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTareas = filterEquipo
    ? tareas.filter(t => t.equipo_id == filterEquipo)
    : tareas;

  const getPriorityClass = (p) => `badge badge-priority-${p}`;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Tablero de Tareas 📋</h2>
        <p>Gestiona las tareas del proyecto arrastrando entre columnas</p>
      </div>

      <div className="kanban-controls">
        <button className="btn btn-primary" onClick={() => openCreate()}>
          ➕ Nueva Tarea
        </button>
        <select className="form-select" style={{ width: 'auto', minWidth: '200px' }} value={filterEquipo} onChange={e => setFilterEquipo(e.target.value)}>
          <option value="">Todos los equipos</option>
          {equipos.map(eq => (
            <option key={eq.id} value={eq.id}>Equipo {eq.numero} — {eq.nombre}</option>
          ))}
        </select>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = filteredTareas.filter(t => t.estado === col.id);
          return (
            <div className="kanban-column" key={col.id}>
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className={`status-dot ${col.id}`}></span>
                  {col.icon} {col.label}
                </div>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>
              <div
                className="kanban-column-body"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, col.id)}
              >
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="task-card"
                    draggable
                    onDragStart={(e) => onDragStart(e, task)}
                    onDragEnd={onDragEnd}
                    onClick={() => openEdit(task)}
                  >
                    <div className="task-card-title">{task.titulo}</div>
                    {task.descripcion && <div className="task-card-desc">{task.descripcion}</div>}
                    <div className="task-card-footer">
                      <div className="task-card-meta">
                        <span className={getPriorityClass(task.prioridad)}>{task.prioridad}</span>
                        {task.equipo_numero && <span className="badge badge-equipo">E{task.equipo_numero}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {task.fecha_limite && (
                          <span className="task-card-date">📅 {new Date(task.fecha_limite).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {task.asignado_nombre && (
                          <div className="task-card-assignee" style={{ background: task.asignado_color }} title={task.asignado_nombre}>
                            {task.asignado_nombre.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button className="kanban-add-btn" onClick={() => openCreate(col.id)}>
                  + Agregar tarea
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Título *</label>
                <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título de la tarea" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe la tarea..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Prioridad</label>
                  <select className="form-select" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                    <option value="critica">🔥 Crítica</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select className="form-select" value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })}>
                    <option value="">Sin equipo</option>
                    {equipos.map(eq => <option key={eq.id} value={eq.id}>Eq. {eq.numero}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asignar a</label>
                  <select className="form-select" value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Fecha límite</label>
                <input className="form-input" type="date" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} />
              </div>
              <div className="modal-actions">
                {editingTask && (
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>🗑️ Eliminar</button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingTask ? '💾 Guardar' : '✨ Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
