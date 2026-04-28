import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from './auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/documentos
router.get('/', (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.nombre as creador_nombre
      FROM documentos d LEFT JOIN users u ON d.creado_por = u.id ORDER BY d.fecha_creacion DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documentos
router.post('/', (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

    const result = db.prepare('INSERT INTO documentos (nombre, descripcion, creado_por, contenido) VALUES (?, ?, ?, ?)').run(nombre, descripcion || '', req.user.id, '');

    db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
      req.user.id, 'documento_creado', `Documento "${nombre}" creado`
    );

    const doc = db.prepare('SELECT * FROM documentos WHERE id = ?').get(result.lastInsertRowid);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documentos/:id
router.delete('/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documentos WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    db.prepare('DELETE FROM documentos WHERE id = ?').run(req.params.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
