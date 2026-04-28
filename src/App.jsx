import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import Documentos from './pages/Documentos';
import Calendario from './pages/Calendario';
import Equipos from './pages/Equipos';
import { useSocket } from './useSocket';

const PAGE_LABELS = {
  '/dashboard': 'Dashboard',
  '/board': 'Tablero',
  '/documentos': 'Documentos',
  '/calendario': 'Cronograma',
  '/equipos': 'Miembros',
};

// ── Toast Notifications ──
function NotificationToasts({ notifications, onDismiss }) {
  if (notifications.length === 0) return null;
  return (
    <div className="toast-container">
      {notifications.map((n, i) => (
        <div key={i} className={`toast toast-${n.type || 'info'}`} onClick={() => onDismiss(i)}>
          <div className="toast-icon">
            {n.type === 'user_joined' ? '🟢' : n.type === 'user_left' ? '🔴' : n.type === 'lock_denied' ? '🔒' : '💬'}
          </div>
          <div className="toast-message">{n.message}</div>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); onDismiss(i); }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Presence Widget (Sidebar) ──
function PresenceWidget({ onlineUsers }) {
  return (
    <div className="presence-widget">
      <div className="presence-header">
        <span className="presence-dot-live"></span>
        <span>{onlineUsers.length} en línea</span>
      </div>
      <div className="presence-list">
        {onlineUsers.map((u, i) => (
          <div key={i} className="presence-user">
            <div className="user-avatar" style={{ background: u.avatar_color, width: '24px', height: '24px', fontSize: '10px' }}>
              {u.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="presence-user-info">
              <span className="presence-user-name">{u.nombre}</span>
              <span className="presence-user-page">{PAGE_LABELS['/' + u.currentPage] || u.currentPage}</span>
            </div>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <div className="presence-empty">Nadie más conectado</div>
        )}
      </div>
    </div>
  );
}

// ── Location tracker for awareness ──
function PageTracker({ changePage }) {
  const location = useLocation();
  useEffect(() => {
    const page = location.pathname.replace('/', '') || 'dashboard';
    changePage(page);
  }, [location.pathname, changePage]);
  return null;
}

function Sidebar({ user, onLogout, onlineUsers }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">R</div>
        <div>
          <h1>ResearchHub</h1>
          <span className="logo-sub">Trabajo Colaborativo</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"></span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/board" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"></span>
          <span>Tablero</span>
        </NavLink>
        <NavLink to="/documentos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"></span>
          <span>Documentos</span>
        </NavLink>
        <NavLink to="/calendario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"></span>
          <span>Cronograma</span>
        </NavLink>
        <NavLink to="/equipos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"></span>
          <span>Miembros</span>
        </NavLink>
      </nav>

      {/* Real-time Presence Widget */}
      <PresenceWidget onlineUsers={onlineUsers} />

      <div className="sidebar-user">
        <div className="user-avatar" style={{ background: user.avatar_color }}>
          {user.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{user.nombre}</div>
          <div className="user-team">
            <span className="presence-dot-live" style={{ width: '6px', height: '6px' }}></span> En línea
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">⏻</button>
      </div>
    </aside>
  );
}

function AppLayout({ user, onLogout, socketData }) {
  const { onlineUsers, notifications, changePage, emitActivity, dismissNotification } = socketData;

  return (
    <div className="app-layout">
      <PageTracker changePage={changePage} />
      <Sidebar user={user} onLogout={onLogout} onlineUsers={onlineUsers} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} onlineUsers={onlineUsers} />} />
          <Route path="/board" element={<Board user={user} emitActivity={emitActivity} />} />
          <Route path="/documentos" element={<Documentos user={user} emitActivity={emitActivity} />} />
          <Route path="/calendario" element={<Calendario user={user} emitActivity={emitActivity} />} />
          <Route path="/equipos" element={<Equipos user={user} onlineUsers={onlineUsers} />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
      <NotificationToasts notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const socketData = useSocket(user ? token : null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, tkn) => {
    localStorage.setItem('token', tkn);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      {user ? (
        <AppLayout user={user} onLogout={handleLogout} socketData={socketData} />
      ) : (
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
