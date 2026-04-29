import { useState, useEffect } from 'react';
import api from '../api';

const PAGE_LABELS = {
  dashboard: '📊 Dashboard',
  board: '📋 Tablero',
  documentos: '📄 Documentos',
  calendario: '📅 Cronograma',
  equipos: '👥 Equipos',
};

export default function Equipos({ user, onlineUsers = [] }) {
  const [allUsers, setAllUsers] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [activeTab, setActiveTab] = useState('equipos');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [users, eqs] = await Promise.all([api.getUsers(), api.getEquipos()]);
      setAllUsers(users);
      setEquipos(eqs);
    } catch (err) { console.error(err); }
  };

  const isOnline = (userId) => onlineUsers.some(u => u.userId === userId);
  const getUserPage = (userId) => {
    const entry = onlineUsers.find(u => u.userId === userId);
    return entry ? entry.currentPage : null;
  };

  const onlineCount = allUsers.filter(u => isOnline(u.id)).length;
  const offlineCount = allUsers.length - onlineCount;

  // ── Equipo CRUD ──
  const handleCreateEquipo = async (e) => {
    e.preventDefault();
    try {
      await api.createEquipo(form);
      setShowCreateModal(false);
      setForm({ nombre: '', descripcion: '' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleEditEquipo = async (e) => {
    e.preventDefault();
    if (!editingEquipo) return;
    try {
      await api.updateEquipo(editingEquipo.id, form);
      setShowEditModal(false);
      setEditingEquipo(null);
      setForm({ nombre: '', descripcion: '' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteEquipo = async (equipo) => {
    if (!confirm(`¿Eliminar el equipo "${equipo.nombre}"? Los miembros serán desvinculados.`)) return;
    try {
      await api.deleteEquipo(equipo.id);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (equipo) => {
    setEditingEquipo(equipo);
    setForm({ nombre: equipo.nombre, descripcion: equipo.descripcion || '' });
    setShowEditModal(true);
  };

  const openAddMember = (equipo) => {
    setSelectedEquipo(equipo);
    setShowAddMemberModal(true);
  };

  const handleAddMember = async (userId) => {
    if (!selectedEquipo) return;
    try {
      await api.addMiembro(selectedEquipo.id, userId);
      loadData();
      setShowAddMemberModal(false);
    } catch (err) { alert(err.message); }
  };

  const handleRemoveMember = async (equipoId, userId) => {
    if (!confirm('¿Quitar este miembro del equipo?')) return;
    try {
      await api.removeMiembro(equipoId, userId);
      loadData();
    } catch (err) { alert(err.message); }
  };

  // Users not in any team (available to add)
  const availableUsers = allUsers.filter(u => !u.equipo_id || (selectedEquipo && u.equipo_id !== selectedEquipo.id));

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Equipos y Miembros 👥</h2>
          <p>Gestiona los equipos del proyecto y sus integrantes</p>
        </div>
        {activeTab === 'equipos' && (
          <button className="btn btn-primary" onClick={() => { setForm({ nombre: '', descripcion: '' }); setShowCreateModal(true); }}>
            ➕ Nuevo Equipo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="login-tabs" style={{ marginBottom: '24px', maxWidth: '360px' }}>
        <button className={`login-tab ${activeTab === 'equipos' ? 'active' : ''}`} onClick={() => setActiveTab('equipos')}>
          Equipos ({equipos.length})
        </button>
        <button className={`login-tab ${activeTab === 'miembros' ? 'active' : ''}`} onClick={() => setActiveTab('miembros')}>
          Miembros ({allUsers.length})
        </button>
      </div>

      {activeTab === 'equipos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {equipos.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}></div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No hay equipos</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Crea tu primer equipo para organizar a los miembros.</p>
              <button className="btn btn-primary" onClick={() => { setForm({ nombre: '', descripcion: '' }); setShowCreateModal(true); }}>
                ➕ Crear Equipo
              </button>
            </div>
          ) : (
            equipos.map(equipo => (
              <div key={equipo.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Team Header */}
                <div style={{
                  padding: '20px 24px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'rgba(99, 102, 241, 0.03)'
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0
                  }}>
                    {equipo.numero}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{equipo.nombre}</div>
                    {equipo.descripcion && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {equipo.descripcion.length > 120 ? equipo.descripcion.substring(0, 120) + '...' : equipo.descripcion}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openAddMember(equipo)} title="Agregar miembro">
                      ➕ Miembro
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(equipo)} title="Editar equipo">
                      ✏️
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEquipo(equipo)} title="Eliminar equipo">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Team Members */}
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Miembros ({equipo.miembros?.length || 0})
                  </div>
                  {(!equipo.miembros || equipo.miembros.length === 0) ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                      Sin miembros asignados. Haz clic en "➕ Miembro" para agregar.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {equipo.miembros.map(member => {
                        const online = isOnline(member.id);
                        return (
                          <div key={member.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 12px', background: 'var(--bg-primary)',
                            borderRadius: '10px', transition: 'all 0.2s',
                            borderLeft: online ? '3px solid var(--success)' : '3px solid transparent'
                          }}>
                            <div className="user-avatar" style={{ background: member.avatar_color, width: '32px', height: '32px', fontSize: '12px', opacity: online ? 1 : 0.6 }}>
                              {member.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                {member.nombre}
                                {member.id === user.id && <span style={{ color: 'var(--accent)', fontSize: '11px', marginLeft: '4px' }}>(Tú)</span>}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.email}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {online && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--success)' }}>
                                  <span className="presence-dot-live" style={{ width: '6px', height: '6px' }}></span>
                                  En línea
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveMember(equipo.id, member.id)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: 'var(--text-muted)', fontSize: '14px', padding: '4px',
                                  borderRadius: '4px', transition: 'all 0.2s'
                                }}
                                title="Quitar del equipo"
                                onMouseEnter={e => { e.target.style.color = '#ef4444'; e.target.style.background = 'rgba(239,68,68,0.1)'; }}
                                onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.background = 'none'; }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'miembros' && (
        <>
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

          {/* Online users */}
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
        </>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏢 Nuevo Equipo</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateEquipo}>
              <div className="form-group">
                <label>Nombre del equipo *</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Equipo de Diseño" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe el propósito del equipo..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">✨ Crear Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Editar Equipo</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditEquipo}>
              <div className="form-group">
                <label>Nombre del equipo *</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del equipo" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del equipo..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">💾 Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedEquipo && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Agregar Miembro a "{selectedEquipo.nombre}"</h3>
              <button className="modal-close" onClick={() => setShowAddMemberModal(false)}>×</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <p>No hay usuarios disponibles para agregar.</p>
                </div>
              ) : (
                availableUsers.map(u => (
                  <div key={u.id}
                    onClick={() => handleAddMember(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', background: 'var(--bg-primary)',
                      borderRadius: '10px', cursor: 'pointer',
                      border: '1px solid var(--border)', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                  >
                    <div className="user-avatar" style={{ background: u.avatar_color, width: '36px', height: '36px', fontSize: '14px' }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.nombre}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                      {u.equipo_id && (
                        <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '2px' }}>
                          ⚠️ Actualmente en otro equipo (será reasignado)
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: '18px' }}>＋</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
