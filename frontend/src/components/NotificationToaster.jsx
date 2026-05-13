import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { notificationsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function NotificationToaster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [seenIds, setSeenIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    // Initial load: just set seen ids without toasting
    notificationsAPI.getNotifications({ page: 1, page_size: 10, is_read: 'false' })
      .then(res => {
        if (!mounted) return;
        const list = res.data.results || res.data;
        if (Array.isArray(list)) {
          setSeenIds(new Set(list.map(n => n.id)));
        }
      })
      .catch(() => {});

    // Poll every 10 seconds for new notifications
    const interval = setInterval(async () => {
      try {
        const res = await notificationsAPI.getNotifications({ page: 1, page_size: 5, is_read: 'false' });
        const list = res.data.results || res.data;
        if (!mounted) return;

        if (Array.isArray(list)) {
          setSeenIds(prevSeen => {
            const newSeen = new Set(prevSeen);
            const newToasts = [];
            list.forEach(notif => {
              if (!notif.is_read && !newSeen.has(notif.id)) {
                newSeen.add(notif.id);
                newToasts.push(notif);
              }
            });
            
            if (newToasts.length > 0) {
              setToasts(t => [...t, ...newToasts]);
            }
            return newSeen;
          });
        }
      } catch (err) {
        // ignore errors during polling
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Auto remove toasts after 5 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(t => t.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const removeToast = (id) => {
    setToasts(t => t.filter(x => x.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 80, // slightly below header
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <div key={t.id} className="bg-white rounded-2xl shadow-xl p-4 w-80 border-l-4 border-blue-500 pointer-events-auto flex gap-3 items-start" style={{ animation: 'toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>
          <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => { removeToast(t.id); navigate('/notifications'); }}>
            <h4 className="m-0 text-sm font-bold text-gray-900">{t.title}</h4>
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} className="bg-transparent border-none cursor-pointer p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
