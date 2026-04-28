import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from './auth.js';

const router = Router();

// GET /api/equipos (public - no auth required for registration)
router.get('/', (req, res) => {
  try {
    const equipos = db.prepare('SELECT * FROM equipos ORDER BY numero ASC').all();
    const equiposConMiembros = equipos.map(equipo => {
      const miembros = db.prepare('SELECT id, nombre, email, avatar_color, estado, ultimo_acceso FROM users WHERE equipo_id = ?').all(equipo.id);
      return { ...equipo, miembros };
    });
    res.json(equiposConMiembros);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected routes below
router.use(authMiddleware);

// GET /api/equipos/:id
router.get('/:id', (req, res) => {
  try {
    const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    const miembros = db.prepare('SELECT id, nombre, email, avatar_color, estado, ultimo_acceso FROM users WHERE equipo_id = ?').all(equipo.id);
    res.json({ ...equipo, miembros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/actividad
router.get('/actividad/recent', (req, res) => {
  try {
    const actividades = db.prepare(`
      SELECT a.*, u.nombre as usuario_nombre, u.avatar_color as usuario_color 
      FROM actividad a LEFT JOIN users u ON a.usuario_id = u.id 
      ORDER BY a.fecha DESC LIMIT 30
    `).all();
    res.json(actividades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipos/users/all
router.get('/users/all', (req, res) => {
  try {
    const users = db.prepare('SELECT id, nombre, email, avatar_color, equipo_id FROM users ORDER BY nombre').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
