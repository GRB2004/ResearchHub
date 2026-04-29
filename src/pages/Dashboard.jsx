import { useState, useEffect } from 'react';
import api from '../api';

export default function Dashboard({ user, onlineUsers = [] }) {
  const [stats, setStats] = useState({ tareas: 0, docs: 0, eventos: 0 });
  const [actividad, setActividad] = useState([]);
  const [tareasRecientes, setTareasRecientes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tareas, docs, eventos, act] = await Promise.all([
        api.getTareas(),
        api.getDocumentos(),
        api.getEventos(),
        api.getActividad()
      ]);
      setStats({
        tareas: tareas.length,
        docs: docs.length,
        eventos: eventos.length,
        enProgreso: tareas.filter(t => t.estado === 'in_progress').length,
        completadas: tareas.filter(t => t.estado === 'done').length,
      });
      setTareasRecientes(tareas.slice(0, 5));
      setActividad(act);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const estadoLabels = {
    backlog: 'Backlog', todo: 'Por hacer', in_progress: 'En progreso',
    review: 'Revisión', done: 'Completado'
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>¡Bienvenido, {user.nombre}!</h2>
        <p>Resumen general de tu proyecto de investigación colaborativa</p>
      </div>


      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>🟢</div>
          <div className="stat-card-value">{onlineUsers.length}</div>
          <div className="stat-card-label">Usuarios en línea</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>📋</div>
          <div className="stat-card-value">{stats.tareas}</div>
          <div className="stat-card-label">Tareas totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>⚡</div>
          <div className="stat-card-value">{stats.enProgreso || 0}</div>
          <div className="stat-card-label">En progreso</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>✅</div>
          <div className="stat-card-value">{stats.completadas || 0}</div>
          <div className="stat-card-label">Completadas</div>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* Online Users Awareness */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👥 Usuarios conectados</h3>
            <span className="badge badge-equipo">{onlineUsers.length} en línea</span>
          </div>
          {onlineUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>No hay otros usuarios conectados.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onlineUsers.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <div className="user-avatar" style={{ background: u.avatar_color, width: '32px', height: '32px', fontSize: '12px' }}>
                    {u.nombre.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.nombre} {u.userId === user.id ? '(Tú)' : ''}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="presence-dot-live" style={{ width: '5px', height: '5px' }}></span>
                      Viendo: {u.currentPage || 'Dashboard'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"> Actividad reciente</h3>
          </div>
          <div className="activity-feed">
            {actividad.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No hay actividad registrada aún.</p>
              </div>
            ) : (
              actividad.slice(0, 10).map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-avatar" style={{ background: a.usuario_color || '#6366f1' }}>
                    {(a.usuario_nombre || '?').charAt(0)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">{a.descripcion}</div>
                    <div className="activity-time">{formatTime(a.fecha)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      {tareasRecientes.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3 className="card-title">📋 Tareas recientes</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tareasRecientes.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <span className={`status-dot ${t.estado}`}></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{estadoLabels[t.estado]}</div>
                </div>
                {t.asignado_nombre && (
                  <div className="task-card-assignee" style={{ background: t.asignado_color, width: '24px', height: '24px', fontSize: '10px' }}>
                    {t.asignado_nombre.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
