import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from './auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/tareas
router.get('/', (req, res) => {
  try {
    const { equipo_id, asignado_a, estado } = req.query;
    let sql = `SELECT t.*, u.nombre as asignado_nombre, u.avatar_color as asignado_color, e.nombre as equipo_nombre, e.numero as equipo_numero 
               FROM tareas t 
               LEFT JOIN users u ON t.asignado_a = u.id 
               LEFT JOIN equipos e ON t.equipo_id = e.id 
               WHERE 1=1`;
    const params = [];

    if (equipo_id) { sql += ' AND t.equipo_id = ?'; params.push(equipo_id); }
    if (asignado_a) { sql += ' AND t.asignado_a = ?'; params.push(asignado_a); }
    if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }

    sql += ' ORDER BY t.fecha_creacion DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tareas
router.post('/', (req, res) => {
  try {
    const { titulo, descripcion, estado, prioridad, asignado_a, equipo_id, fecha_limite } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });

    const result = db.prepare(
      'INSERT INTO tareas (titulo, descripcion, estado, prioridad, asignado_a, equipo_id, fecha_limite) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(titulo, descripcion || '', estado || 'backlog', prioridad || 'media', asignado_a || null, equipo_id || null, fecha_limite || null);

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'tarea_creada', `Tarea "${titulo}" creada`
    );

    const tarea = db.prepare(`SELECT t.*, u.nombre as asignado_nombre, u.avatar_color as asignado_color, e.nombre as equipo_nombre, e.numero as equipo_numero 
      FROM tareas t LEFT JOIN users u ON t.asignado_a = u.id LEFT JOIN equipos e ON t.equipo_id = e.id WHERE t.id = ?`).get(result.lastInsertRowid);
    res.json(tarea);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tareas/:id
router.put('/:id', (req, res) => {
  try {
    const { titulo, descripcion, estado, prioridad, asignado_a, equipo_id, fecha_limite } = req.body;
    const existing = db.prepare('SELECT * FROM tareas WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    db.prepare(
      'UPDATE tareas SET titulo=?, descripcion=?, estado=?, prioridad=?, asignado_a=?, equipo_id=?, fecha_limite=? WHERE id=?'
    ).run(
      titulo || existing.titulo, descripcion ?? existing.descripcion,
      estado || existing.estado, prioridad || existing.prioridad,
      asignado_a !== undefined ? asignado_a : existing.asignado_a,
      equipo_id !== undefined ? equipo_id : existing.equipo_id,
      fecha_limite !== undefined ? fecha_limite : existing.fecha_limite,
      req.params.id
    );

    if (estado && estado !== existing.estado) {
      db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
        req.user.id, 'tarea_movida', `Tarea "${existing.titulo}" movida a ${estado}`
      );
    }

    const tarea = db.prepare(`SELECT t.*, u.nombre as asignado_nombre, u.avatar_color as asignado_color, e.nombre as equipo_nombre, e.numero as equipo_numero 
      FROM tareas t LEFT JOIN users u ON t.asignado_a = u.id LEFT JOIN equipos e ON t.equipo_id = e.id WHERE t.id = ?`).get(req.params.id);
    res.json(tarea);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tareas/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tareas WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    db.prepare('DELETE FROM tareas WHERE id = ?').run(req.params.id);
    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'tarea_eliminada', `Tarea "${existing.titulo}" eliminada`
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
