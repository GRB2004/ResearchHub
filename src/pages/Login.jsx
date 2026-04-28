import { useState } from 'react';
import api from '../api';

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (tab === 'login') {
        result = await api.login({ email, password });
      } else {
        if (!nombre.trim()) { setError('Nombre es requerido'); setLoading(false); return; }
        result = await api.register({ nombre, email, password });
      }
      onLogin(result.user, result.token);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container animate-in">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">R</div>
            <h2>ResearchHub</h2>
            <p>Plataforma de Gestión de Investigación Colaborativa</p>
          </div>

          <div className="login-tabs">
            <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
              Iniciar Sesión
            </button>
            <button className={`login-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
              Registrarse
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label>Nombre completo</label>
                <input className="form-input" type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
            )}

            <div className="form-group">
              <label>Correo electrónico</label>
              <input className="form-input" type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Procesando...' : (tab === 'login' ? ' Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </form>

          {tab === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              ¿No tienes cuenta? <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setTab('register')}>Regístrate aquí</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
