const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (multer needs multipart boundaries)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return;
  }

  // For file downloads
  if (options.download) {
    return res;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Tareas
  getTareas: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/tareas${qs}`);
  },
  createTarea: (data) => request('/tareas', { method: 'POST', body: JSON.stringify(data) }),
  updateTarea: (id, data) => request(`/tareas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTarea: (id) => request(`/tareas/${id}`, { method: 'DELETE' }),

  // Documentos
  getDocumentos: () => request('/documentos'),
  createDocumento: (data) => request('/documentos', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocumento: (id) => request(`/documentos/${id}`, { method: 'DELETE' }),
  getRamas: (docId) => request(`/documentos/${docId}/ramas`),
  createRama: (docId, data) => request(`/documentos/${docId}/ramas`, { method: 'POST', body: JSON.stringify(data) }),
  getVersiones: (ramaId) => request(`/documentos/ramas/${ramaId}/versiones`),
  uploadVersion: (ramaId, formData) => request(`/documentos/ramas/${ramaId}/versiones`, {
    method: 'POST',
    body: formData
  }),
  downloadVersion: (versionId) => {
    const token = getToken();
    return fetch(`${API_BASE}/documentos/versiones/${versionId}/descargar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // Calendario
  getEventos: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/calendario${qs}`);
  },
  createEvento: (data) => request('/calendario', { method: 'POST', body: JSON.stringify(data) }),
  updateEvento: (id, data) => request(`/calendario/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvento: (id) => request(`/calendario/${id}`, { method: 'DELETE' }),

  // Equipos
  getEquipos: () => request('/equipos'),
  getEquipo: (id) => request(`/equipos/${id}`),
  createEquipo: (data) => request('/equipos', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipo: (id, data) => request(`/equipos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipo: (id) => request(`/equipos/${id}`, { method: 'DELETE' }),
  addMiembro: (equipoId, userId) => request(`/equipos/${equipoId}/miembros/${userId}`, { method: 'PUT' }),
  removeMiembro: (equipoId, userId) => request(`/equipos/${equipoId}/miembros/${userId}`, { method: 'DELETE' }),

  // Activity & Users
  getActividad: () => request('/equipos/actividad/recent'),
  getUsers: () => request('/equipos/users/all'),
};

export default api;
