import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  is_read?: boolean;
  created_at?: string;
  related_id?: string | null;
};

type NotificationBellProps = {
  viewAllPath?: string;
};

export default function NotificationBell({ viewAllPath = '/customer/profile' }: NotificationBellProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const authToken = token ?? localStorage.getItem('token');
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadNotifications = React.useCallback(async () => {
    if (!authToken) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<NotificationItem[]>('/notifications', {}, authToken);
      setNotifications(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Không tải được thông báo');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  React.useEffect(() => {
    if (!authToken) {
      return;
    }

    void loadNotifications();
  }, [authToken, loadNotifications]);

  React.useEffect(() => {
    if (!open || !authToken) {
      return;
    }

    void loadNotifications();
  }, [authToken, loadNotifications, open]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-notification-bell]')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="relative" data-notification-bell>
      <Button variant="ghost" size="icon" className="relative hover:text-cyan-600" onClick={() => setOpen((value) => !value)}>
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Thông báo</p>
              <p className="text-xs text-slate-500">Từ hệ thống và đơn hàng</p>
            </div>
            <button className="text-xs font-medium text-cyan-600 hover:text-cyan-700" onClick={() => navigate(viewAllPath)}>
              Xem tất cả
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Đang tải thông báo...</div>
            ) : error ? (
              <div className="px-4 py-6 text-sm text-red-600">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo nào.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${notification.is_read ? 'bg-white' : 'bg-cyan-50/40'}`}
                  onClick={() => setOpen(false)}
                >
                  <div className={`mt-0.5 size-2.5 shrink-0 rounded-full ${notification.is_read ? 'bg-slate-300' : 'bg-cyan-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{notification.title}</p>
                      <ChevronRight className="size-4 shrink-0 text-slate-400" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.message}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
