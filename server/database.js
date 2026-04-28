import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'app.db');

import fs from 'fs';
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Migrations ──
try {
  db.prepare('SELECT contenido FROM documentos LIMIT 1').get();
} catch (e) {
  // If the column doesn't exist, this will throw, and we add it
  try {
    db.exec('ALTER TABLE documentos ADD COLUMN contenido TEXT DEFAULT ""');
  } catch (err) {
    // Table might not exist yet, that's fine
  }
}


// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    texto_referencia TEXT,
    objetivo TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    equipo_id INTEGER,
    avatar_color TEXT DEFAULT '#6366f1',
    estado TEXT DEFAULT 'offline',
    ultimo_acceso TEXT,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
  );

  CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fecha_creacion TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER DEFAULT 1,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT DEFAULT 'backlog',
    prioridad TEXT DEFAULT 'media',
    asignado_a INTEGER,
    equipo_id INTEGER,
    fecha_limite TEXT,
    fecha_creacion TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (asignado_a) REFERENCES users(id),
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
  );

  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER DEFAULT 1,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    contenido TEXT DEFAULT '',
    creado_por INTEGER,
    fecha_creacion TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (creado_por) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS eventos_calendario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER DEFAULT 1,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT,
    tipo TEXT DEFAULT 'evento',
    equipo_id INTEGER,
    color TEXT DEFAULT '#6366f1',
    creado_por INTEGER,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (equipo_id) REFERENCES equipos(id),
    FOREIGN KEY (creado_por) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS actividad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    tipo_accion TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES users(id)
  );
`);

// ── Seed: 10 equipos ──
const equipoCount = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
if (equipoCount === 0) {
  const insertEquipo = db.prepare(
    'INSERT INTO equipos (numero, nombre, descripcion, texto_referencia, objetivo) VALUES (?, ?, ?, ?, ?)'
  );

  const equipos = [
    [1, 'Arquitecturas de Distribución en Groupware',
      'Diferencias, ventajas y desventajas de los modelos para sistemas colaborativos.',
      'El equipo definirá la arquitectura de distribución (Centralizada o Híbrida) y formalizará los componentes. Elegir entre una arquitectura Centralizada (Cliente-Servidor) o Híbrida.',
      'Ayudar al grupo a decidir la estructura de red del proyecto.'],
    [2, 'Desarrollo Basado en Componentes (CBD)',
      'Cómo descomponer una aplicación en piezas independientes e intercambiables.',
      'Diseñar un Espacio de Trabajo Compartido Modular Basado en Componentes, enfocada en aplicar el modelo de Desarrollo Groupware Basado en Componentes.',
      'Comprender la modularidad requerida para los componentes A y B.'],
    [3, 'Diseño de Interfaces e Interoperabilidad',
      'Cómo definir contratos claros (interfaces) para que distintos módulos se comuniquen sin errores.',
      'El equipo diseñará interfaces claras para cada función de colaboración (por ejemplo, IComunicacion, ISincronizacion). Los componentes están correctamente desacoplados y se comunican a través de interfaces.',
      'Enseñar a definir métodos y eventos (como ModificarTexto) antes de programar.'],
    [4, 'Estrategias de Control de Concurrencia',
      'Análisis de métodos para evitar conflictos cuando dos personas editan el mismo texto al mismo tiempo.',
      'Se requiere una estrategia básica de control de concurrencia: bloqueo optimista, bloqueo pesimista o Operational Transformation simple. Manejo de Concurrencia para evitar la pérdida de datos.',
      'Proveer las bases lógicas para el Componente A (Editor Compartido).'],
    [5, 'Conciencia de Grupo (Group Awareness)',
      'La importancia de saber quién está presente y qué está haciendo en el espacio de trabajo.',
      'Concepto Groupware clave: Conciencia de Grupo (Awareness) y Gestión de Sesión. Un widget que muestre los nombres de los usuarios y su estado.',
      'Establecer los requisitos para el Componente B (Presence Manager).'],
    [6, 'Implementación de Servidores para Groupware',
      'Cómo configurar el backend para manejar múltiples conexiones simultáneas.',
      'Configuración del Servidor: Implementar el servidor básico para manejar la conexión de múltiples clientes. El servidor reciba eventos de conexión/desconexión y los distribuya.',
      'Guiar a los equipos en la Fase 2 de infraestructura de red.'],
    [7, 'El Módulo de Integración (Core Application)',
      'El rol de la aplicación principal como pegamento de todos los componentes.',
      'La aplicación principal que inicializa, configura y conecta los Componentes A y B a través de sus interfaces. Interoperabilidad y Middleware Colaborativo.',
      'Explicar cómo ensamblar el prototipo final.'],
    [8, 'Ciclo de Vida del Desarrollo: MVP a Integración',
      'Explicación de las fases de entrega y la importancia de los Prototipos 1 y 2.',
      'Fase 2: Prototipo 1 (MVP) con Gestión de Sesión. Fase 3: Prototipo 2 con Sincronización de Contenido y Conciencia de Presencia integradas.',
      'Ayudar a los alumnos a organizar su cronograma de trabajo.'],
    [9, 'Pruebas de Estrés y Consistencia Multiusuario',
      'Cómo identificar y corregir errores que solo aparecen cuando hay muchos usuarios conectados.',
      'Pruebas Colaborativas: Probar el sistema con varios usuarios simultáneamente (simulando trabajo síncrono) para identificar bugs de concurrencia.',
      'Preparar a los equipos para la Fase 4 y la validación de consistencia.'],
    [10, 'Desafíos Sociales y Dinámicas del Groupware',
      'Un análisis teórico sobre por qué fallan o triunfan las herramientas colaborativas.',
      'CSCW y Groupware: Grudin, J. (1994). Groupware and Social Dynamics: Eight Challenges for Developers. Awareness and coordination in shared workspaces.',
      'Contextualizar el proyecto dentro del campo de la Computación Colaborativa (CSCW).'],
  ];

  const seed = db.transaction(() => {
    for (const e of equipos) insertEquipo.run(...e);
    // Create default project
    db.prepare("INSERT INTO proyectos (nombre, descripcion) VALUES (?, ?)").run(
      'Proyecto de Investigación Colaborativa',
      'Proyecto principal de investigación sobre Groupware y CSCW'
    );
  });
  seed();
}

export default db;
