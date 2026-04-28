import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from './auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/calendario
router.get('/', (req, res) => {
  try {
    const { mes, anio } = req.query;
    let sql = `SELECT ec.*, e.nombre as equipo_nombre, e.numero as equipo_numero, u.nombre as creador_nombre
               FROM eventos_calendario ec
               LEFT JOIN equipos e ON ec.equipo_id = e.id
               LEFT JOIN users u ON ec.creado_por = u.id`;
    const params = [];

    if (mes && anio) {
      sql += ` WHERE (strftime('%m', ec.fecha_inicio) = ? AND strftime('%Y', ec.fecha_inicio) = ?)
               OR (ec.fecha_fin IS NOT NULL AND strftime('%m', ec.fecha_fin) = ? AND strftime('%Y', ec.fecha_fin) = ?)`;
      params.push(mes.padStart(2, '0'), anio, mes.padStart(2, '0'), anio);
    }

    sql += ' ORDER BY ec.fecha_inicio ASC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendario
router.post('/', (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_fin, tipo, equipo_id, color } = req.body;
    if (!titulo || !fecha_inicio) return res.status(400).json({ error: 'Título y fecha de inicio requeridos' });

    const result = db.prepare(
      'INSERT INTO eventos_calendario (titulo, descripcion, fecha_inicio, fecha_fin, tipo, equipo_id, color, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(titulo, descripcion || '', fecha_inicio, fecha_fin || null, tipo || 'evento', equipo_id || null, color || '#6366f1', req.user.id);

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'evento_creado', `Evento "${titulo}" agregado al cronograma`
    );

    const evento = db.prepare('SELECT * FROM eventos_calendario WHERE id = ?').get(result.lastInsertRowid);
    res.json(evento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendario/:id
router.put('/:id', (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_fin, tipo, equipo_id, color } = req.body;
    const existing = db.prepare('SELECT * FROM eventos_calendario WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evento no encontrado' });

    db.prepare(
      'UPDATE eventos_calendario SET titulo=?, descripcion=?, fecha_inicio=?, fecha_fin=?, tipo=?, equipo_id=?, color=? WHERE id=?'
    ).run(
      titulo || existing.titulo, descripcion ?? existing.descripcion,
      fecha_inicio || existing.fecha_inicio, fecha_fin !== undefined ? fecha_fin : existing.fecha_fin,
      tipo || existing.tipo, equipo_id !== undefined ? equipo_id : existing.equipo_id,
      color || existing.color, req.params.id
    );

    const evento = db.prepare('SELECT * FROM eventos_calendario WHERE id = ?').get(req.params.id);
    res.json(evento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendario/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM eventos_calendario WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
