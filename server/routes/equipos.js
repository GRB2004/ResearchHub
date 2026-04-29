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

// POST /api/equipos - Create team
router.post('/', (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre del equipo requerido' });

    // Get next team number
    const maxNum = db.prepare('SELECT MAX(numero) as max FROM equipos').get();
    const nextNumero = (maxNum.max || 0) + 1;

    const result = db.prepare(
      'INSERT INTO equipos (numero, nombre, descripcion) VALUES (?, ?, ?)'
    ).run(nextNumero, nombre, descripcion || '');

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'equipo_creado', `Equipo "${nombre}" creado`
    );

    const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(result.lastInsertRowid);
    res.json({ ...equipo, miembros: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/equipos/:id - Update team
router.put('/:id', (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const existing = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Equipo no encontrado' });

    db.prepare('UPDATE equipos SET nombre = ?, descripcion = ? WHERE id = ?').run(
      nombre || existing.nombre,
      descripcion !== undefined ? descripcion : existing.descripcion,
      req.params.id
    );

    const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    const miembros = db.prepare('SELECT id, nombre, email, avatar_color, estado, ultimo_acceso FROM users WHERE equipo_id = ?').all(equipo.id);
    res.json({ ...equipo, miembros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equipos/:id - Delete team
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Equipo no encontrado' });

    // Remove team assignment from users
    db.prepare('UPDATE users SET equipo_id = NULL WHERE equipo_id = ?').run(req.params.id);
    // Remove team from tasks
    db.prepare('UPDATE tareas SET equipo_id = NULL WHERE equipo_id = ?').run(req.params.id);
    // Delete team
    db.prepare('DELETE FROM equipos WHERE id = ?').run(req.params.id);

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'equipo_eliminado', `Equipo "${existing.nombre}" eliminado`
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/equipos/:id/miembros/:userId - Add member to team
router.put('/:id/miembros/:userId', (req, res) => {
  try {
    const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    const user = db.prepare('SELECT id, nombre FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    db.prepare('UPDATE users SET equipo_id = ? WHERE id = ?').run(req.params.id, req.params.userId);

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'miembro_agregado', `${user.nombre} agregado al equipo "${equipo.nombre}"`
    );

    const miembros = db.prepare('SELECT id, nombre, email, avatar_color, estado, ultimo_acceso FROM users WHERE equipo_id = ?').all(equipo.id);
    res.json({ ...equipo, miembros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equipos/:id/miembros/:userId - Remove member from team
router.delete('/:id/miembros/:userId', (req, res) => {
  try {
    const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    const user = db.prepare('SELECT id, nombre FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    db.prepare('UPDATE users SET equipo_id = NULL WHERE id = ? AND equipo_id = ?').run(req.params.userId, req.params.id);

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'miembro_removido', `${user.nombre} removido del equipo "${equipo.nombre}"`
    );

    const miembros = db.prepare('SELECT id, nombre, email, avatar_color, estado, ultimo_acceso FROM users WHERE equipo_id = ?').all(equipo.id);
    res.json({ ...equipo, miembros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
