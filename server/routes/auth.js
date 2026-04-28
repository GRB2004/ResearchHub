import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'groupware-secret-2026';

// Middleware auth
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    // Update last access
    db.prepare("UPDATE users SET ultimo_acceso = datetime('now'), estado = 'online' WHERE id = ?").run(req.user.id);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { nombre, email, password, equipo_id } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const hash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      "INSERT INTO users (nombre, email, password_hash, equipo_id, avatar_color, estado, ultimo_acceso) VALUES (?, ?, ?, ?, ?, 'online', datetime('now'))"
    ).run(nombre, email, hash, equipo_id || null, avatarColor);

    const user = db.prepare('SELECT u.*, e.nombre as equipo_nombre, e.numero as equipo_numero FROM users u LEFT JOIN equipos e ON u.equipo_id = e.id WHERE u.id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, nombre: user.nombre }, SECRET, { expiresIn: '7d' });

    // Log activity
    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      user.id, 'registro', `${user.nombre} se ha unido al proyecto`
    );

    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, equipo_id: user.equipo_id, equipo_nombre: user.equipo_nombre, equipo_numero: user.equipo_numero, avatar_color: user.avatar_color } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT u.*, e.nombre as equipo_nombre, e.numero as equipo_numero FROM users u LEFT JOIN equipos e ON u.equipo_id = e.id WHERE u.email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    db.prepare("UPDATE users SET estado = 'online', ultimo_acceso = datetime('now') WHERE id = ?").run(user.id);
    const token = jwt.sign({ id: user.id, email: user.email, nombre: user.nombre }, SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, equipo_id: user.equipo_id, equipo_nombre: user.equipo_nombre, equipo_numero: user.equipo_numero, avatar_color: user.avatar_color } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT u.id, u.nombre, u.email, u.equipo_id, u.avatar_color, e.nombre as equipo_nombre, e.numero as equipo_numero FROM users u LEFT JOIN equipos e ON u.equipo_id = e.id WHERE u.id = ?').get(req.user.id);
  res.json(user);
});

export default router;
