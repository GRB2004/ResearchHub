import { useState, useEffect } from 'react';
import api from '../api';

const PAGE_LABELS = {
  dashboard: '📊 Dashboard',
  board: '📋 Tablero',
  documentos: '📄 Documentos',
  calendario: '📅 Cronograma',
  equipos: '👥 Miembros',
};

export default function Equipos({ user, onlineUsers = [] }) {
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch (err) { console.error(err); }
  };

  const isOnline = (userId) => onlineUsers.some(u => u.userId === userId);
  const getUserPage = (userId) => {
    const entry = onlineUsers.find(u => u.userId === userId);
    return entry ? entry.currentPage : null;
  };

  const onlineCount = allUsers.filter(u => isOnline(u.id)).length;
  const offlineCount = allUsers.length - onlineCount;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Miembros del Proyecto 👥</h2>
      </div>



      {/* Stats */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>🟢</div>
          <div className="stat-card-value">{onlineCount}</div>
          <div className="stat-card-label">Usuarios en línea</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(100, 116, 139, 0.15)' }}>⚫</div>
          <div className="stat-card-value">{offlineCount}</div>
          <div className="stat-card-label">Usuarios desconectados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>👥</div>
          <div className="stat-card-value">{allUsers.length}</div>
          <div className="stat-card-label">Total de miembros</div>
        </div>
      </div>

      {/* Online users first, then offline */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="presence-dot-live"></span> En línea ({onlineCount})
      </h3>

      <div className="members-grid" style={{ marginBottom: '32px' }}>
        {allUsers.filter(u => isOnline(u.id)).map(member => {
          const page = getUserPage(member.id);
          return (
            <div key={member.id} className="member-card is-online">
              <div className="member-avatar-lg" style={{ background: member.avatar_color }}>
                {member.nombre.charAt(0).toUpperCase()}
                <div className="online-ring"></div>
              </div>
              <div className="member-info">
                <div className="member-name">{member.nombre} {member.id === user.id ? '(Tú)' : ''}</div>
                <div className="member-email">{member.email}</div>
                <div className="member-status online">
                  <span className="presence-dot-live" style={{ width: '6px', height: '6px' }}></span>
                  En línea
                </div>
                {page && (
                  <div className="member-viewing">
                    👁️ Viendo: {PAGE_LABELS[page] || page}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {onlineCount === 0 && (
          <div className="card" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <p>No hay otros usuarios en línea en este momento.</p>
            </div>
          </div>
        )}
      </div>

      {offlineCount > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)' }}>
            ⚫ Desconectados ({offlineCount})
          </h3>
          <div className="members-grid">
            {allUsers.filter(u => !isOnline(u.id)).map(member => (
              <div key={member.id} className="member-card">
                <div className="member-avatar-lg" style={{ background: member.avatar_color, opacity: 0.6 }}>
                  {member.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <div className="member-name" style={{ opacity: 0.7 }}>{member.nombre}</div>
                  <div className="member-email">{member.email}</div>
                  <div className="member-status offline">
                    ⚫ Desconectado
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
