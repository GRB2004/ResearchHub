import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable Yjs document persistence to disk (LevelDB)
// Documents will be stored in server/data/yjs-docs/
const yjsPersistenceDir = path.join(__dirname, 'data', 'yjs-docs');
fs.mkdirSync(yjsPersistenceDir, { recursive: true });
process.env.YPERSISTENCE = yjsPersistenceDir;

const yutils = require(path.join(__dirname, '..', 'node_modules', 'y-websocket', 'bin', 'utils.js'));

// Initialize database (creates tables & seeds data)
import db from './database.js';

import authRoutes from './routes/auth.js';
import tareasRoutes from './routes/tareas.js';
import documentosRoutes from './routes/documentos.js';
import calendarioRoutes from './routes/calendario.js';
import equiposRoutes from './routes/equipos.js';

const app = express();
const httpServer = createServer(app);
const SECRET = process.env.JWT_SECRET || 'groupware-secret-2026';
const PORT = process.env.PORT || 3001;

// ── Socket.io Setup (do NOT attach to httpServer yet) ──
const io = new Server({
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
io.attach(httpServer, { destroyUpgrade: false });

// ── Yjs WebSocket Setup ──
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (conn, req) => {
  console.log(`📝 Yjs WebSocket connected: ${req.url}`);
  yutils.setupWSConnection(conn, req);
});

// Route upgrade requests: /yjs/ → Yjs WSS, everything else → Socket.IO
httpServer.removeAllListeners('upgrade');
httpServer.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/yjs/')) {
    console.log(`🔄 Yjs upgrade request: ${request.url}`);
    // Extract document room name from URL
    const docName = request.url.split('/yjs/')[1].split('?')[0];
    request.url = '/' + docName;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Let Socket.IO handle its own upgrades (/socket.io/)
    io.engine.handleUpgrade(request, socket, head);
  }
});

// Connected users tracking (In-memory presence store)
const connectedUsers = new Map(); // socketId -> { userId, nombre, avatar_color, currentPage, connectedAt }
const documentLocks = new Map();  // documentId -> { userId, nombre, lockedAt, socketId }

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token requerido'));
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, nombre, email, avatar_color, equipo_id FROM users WHERE id = ?').get(decoded.id);
    if (!user) return next(new Error('Usuario no encontrado'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`🟢 ${user.nombre} conectado (socket: ${socket.id})`);

  // Register user as online
  connectedUsers.set(socket.id, {
    userId: user.id,
    nombre: user.nombre,
    avatar_color: user.avatar_color,
    currentPage: 'dashboard',
    connectedAt: new Date().toISOString()
  });

  // Update DB status
  db.prepare("UPDATE users SET estado = 'online', ultimo_acceso = datetime('now') WHERE id = ?").run(user.id);

  // Broadcast updated presence to all clients
  broadcastPresence();

  // Log activity
  db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
    user.id, 'conexion', `${user.nombre} se ha conectado`
  );

  // Broadcast notification
  socket.broadcast.emit('notification', {
    type: 'user_joined',
    message: `${user.nombre} se ha conectado`,
    user: { id: user.id, nombre: user.nombre, avatar_color: user.avatar_color },
    timestamp: new Date().toISOString()
  });

  // ── Page Navigation (Awareness) ──
  socket.on('page_change', (page) => {
    const entry = connectedUsers.get(socket.id);
    if (entry) {
      entry.currentPage = page;
      broadcastPresence();
    }
  });

  // ── Real-time Activity Broadcast ──
  socket.on('activity', (data) => {
    // Broadcast activity to all other clients
    socket.broadcast.emit('new_activity', {
      ...data,
      user: { id: user.id, nombre: user.nombre, avatar_color: user.avatar_color },
      timestamp: new Date().toISOString()
    });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log(`🔴 ${user.nombre} desconectado`);

    // Remove from connected users
    connectedUsers.delete(socket.id);

    // Check if user has other active connections
    const stillConnected = [...connectedUsers.values()].some(u => u.userId === user.id);
    if (!stillConnected) {
      db.prepare("UPDATE users SET estado = 'offline', ultimo_acceso = datetime('now') WHERE id = ?").run(user.id);

      db.prepare('INSERT INTO actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)').run(
        user.id, 'desconexion', `${user.nombre} se ha desconectado`
      );

      socket.broadcast.emit('notification', {
        type: 'user_left',
        message: `${user.nombre} se ha desconectado`,
        user: { id: user.id, nombre: user.nombre, avatar_color: user.avatar_color },
        timestamp: new Date().toISOString()
      });
    }

    broadcastPresence();
  });
});

function broadcastPresence() {
  // Deduplicate by userId (a user may have multiple tabs)
  const usersMap = new Map();
  for (const [, entry] of connectedUsers) {
    if (!usersMap.has(entry.userId)) {
      usersMap.set(entry.userId, entry);
    } else {
      // Keep the most recent page
      usersMap.set(entry.userId, entry);
    }
  }
  const onlineUsers = [...usersMap.values()];
  io.emit('presence_update', onlineUsers);
}

// Make io accessible to routes for emitting events
app.set('io', io);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/equipos', equiposRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Catch-all route to serve React's index.html for SPA routing
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready for real-time collaboration`);
});
