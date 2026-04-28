import { useState, useEffect, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import QuillCursors from 'quill-cursors';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import api from '../api';

Quill.register('modules/cursors', QuillCursors);

const MODULES = {
  cursors: true,
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean']
  ]
};

export default function Documentos({ user, emitActivity }) {
  const [documentos, setDocumentos] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [docForm, setDocForm] = useState({ nombre: '', descripcion: '' });
  
  const quillRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);

  useEffect(() => {
    loadDocs();
    return () => {
      cleanupYjs();
    };
  }, []);

  const loadDocs = async () => {
    try {
      const docs = await api.getDocumentos();
      setDocumentos(docs);
    } catch (err) { console.error(err); }
  };

  const createDoc = async (e) => {
    e.preventDefault();
    try {
      await api.createDocumento(docForm);
      setShowCreateDoc(false);
      setDocForm({ nombre: '', descripcion: '' });
      loadDocs();
      if (emitActivity) emitActivity({ tipo: 'documento_creado', descripcion: `Documento "${docForm.nombre}" creado` });
    } catch (err) { alert(err.message); }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este documento permanentemente?')) return;
    try {
      await api.deleteDocumento(id);
      if (activeDoc?.id === id) {
        setActiveDoc(null);
        cleanupYjs();
      }
      loadDocs();
    } catch (err) { alert(err.message); }
  };

  const cleanupYjs = () => {
    if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null; }
    if (providerRef.current) { providerRef.current.destroy(); providerRef.current = null; }
    if (ydocRef.current) { ydocRef.current.destroy(); ydocRef.current = null; }
  };

  const openDocument = (doc) => {
    if (activeDoc?.id === doc.id) return;
    
    cleanupYjs();
    setActiveDoc(doc);
    
    // We wait a tick for the quill component to mount/render for the new doc
    setTimeout(() => {
      if (!quillRef.current) return;
      
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Connect to the y-websocket server on port 3001
      const wsUrl = `ws://${window.location.hostname}:3001/yjs`;
      console.log('[Yjs] Connecting to:', wsUrl, 'room:', `doc-${doc.id}`);
      const provider = new WebsocketProvider(wsUrl, `doc-${doc.id}`, ydoc);
      providerRef.current = provider;

      // Debug: monitor connection state
      provider.on('status', (event) => {
        console.log('[Yjs] Status:', event.status);
      });
      provider.on('connection-error', (event) => {
        console.error('[Yjs] Connection error:', event);
      });
      provider.on('connection-close', (event) => {
        console.log('[Yjs] Connection closed:', event);
      });
      provider.on('synced', (isSynced) => {
        console.log('[Yjs] Synced:', isSynced);
      });

      // Set awareness for cursors
      provider.awareness.setLocalStateField('user', {
        name: user.nombre,
        color: user.avatar_color || '#0088ff'
      });

      const ytext = ydoc.getText('quill');
      const editor = quillRef.current.getEditor();
      
      bindingRef.current = new QuillBinding(ytext, editor, provider.awareness);
    }, 100);
  };

  return (
    <div className="animate-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Documentos 📄</h2>
          <p>Edición colaborativa en tiempo real con cursores múltiples</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateDoc(true)}>➕ Nuevo Documento</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Document List */}
        <div className="card" style={{ width: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>Tus Documentos</h3>
          {documentos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No hay documentos</p>
          ) : (
            documentos.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => openDocument(doc)}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeDoc?.id === doc.id ? 'var(--primary-color)' : 'var(--card-bg)',
                  color: activeDoc?.id === doc.id ? 'white' : 'inherit',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{doc.nombre}</div>
                  <div style={{ fontSize: '12px', color: activeDoc?.id === doc.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginTop: '4px' }}>
                    {doc.creador_nombre}
                  </div>
                </div>
                <button 
                  onClick={(e) => deleteDoc(doc.id, e)}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', 
                    opacity: 0.6, fontSize: '14px' 
                  }}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right Area: Editor */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          {activeDoc ? (
            <>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0 }}>{activeDoc.nombre}</h3>
                {activeDoc.descripcion && <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{activeDoc.descripcion}</p>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="quill-collaborative">
                <ReactQuill 
                  ref={quillRef}
                  theme="snow" 
                  modules={MODULES}
                  style={{ height: 'calc(100% - 42px)', display: 'flex', flexDirection: 'column' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✍️</div>
              <h3>Selecciona un documento</h3>
              <p>O crea uno nuevo para empezar a editar en tiempo real</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Document Modal */}
      {showCreateDoc && (
        <div className="modal-overlay" onClick={() => setShowCreateDoc(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Nuevo Documento</h3>
              <button className="modal-close" onClick={() => setShowCreateDoc(false)}>×</button>
            </div>
            <form onSubmit={createDoc}>
              <div className="form-group">
                <label>Nombre del documento *</label>
                <input className="form-input" value={docForm.nombre} onChange={e => setDocForm({ ...docForm, nombre: e.target.value })} placeholder="Ej: Informe de Investigación" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-textarea" value={docForm.descripcion} onChange={e => setDocForm({ ...docForm, descripcion: e.target.value })} placeholder="Describe el documento..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateDoc(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">✨ Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
