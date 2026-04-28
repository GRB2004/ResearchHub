import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

let globalSocket = null;

export function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!token) return;

    if (globalSocket && globalSocket.connected) {
      setSocket(globalSocket);
      return;
    }

    const isDev = import.meta.env.DEV;
    const socketUrl = isDev ? 'http://localhost:3001' : '/';
    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('🔌 WebSocket conectado');
    });

    s.on('presence_update', (users) => {
      setOnlineUsers(users);
    });

    s.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 20));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== notif));
      }, 5000);
    });

    s.on('new_activity', (activity) => {
      setNotifications(prev => [{
        type: 'activity',
        message: activity.descripcion || `${activity.user.nombre} realizó una acción`,
        user: activity.user,
        timestamp: activity.timestamp
      }, ...prev].slice(0, 20));
    });

    s.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
    });

    globalSocket = s;
    setSocket(s);

    return () => {
      s.disconnect();
      globalSocket = null;
    };
  }, [token]);

  const changePage = useCallback((page) => {
    if (globalSocket) globalSocket.emit('page_change', page);
  }, []);

  const emitActivity = useCallback((data) => {
    if (globalSocket) globalSocket.emit('activity', data);
  }, []);

  const dismissNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    socket,
    onlineUsers,
    notifications,
    changePage,
    emitActivity,
    dismissNotification
  };
}
