import { Bell, LogOut, User, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { wsClient } from '@/lib/websocket';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/functions': 'Functions',
  '/dashboard/deploy': 'Deploy Function',
  '/dashboard/api-keys': 'API Keys',
  '/dashboard/logs': 'Live Logs',
  '/dashboard/metrics': 'Metrics',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin': 'Admin Panel',
};

export default function Header() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [wsConnected, setWsConnected] = useState(false);

  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      path === '/dashboard'
        ? location.pathname === '/dashboard'
        : location.pathname.startsWith(path)
    )?.[1] || 'Dashboard';

  useEffect(() => {
    const check = setInterval(() => setWsConnected(wsClient.isConnected), 2000);
    return () => clearInterval(check);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        <p className="text-xs text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* WebSocket status */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            wsConnected
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-slate-500 bg-slate-800 border-slate-700'
          }`}
        >
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? 'Live' : 'Offline'}
        </div>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <span className="hidden sm:block">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost p-2 text-slate-500 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
