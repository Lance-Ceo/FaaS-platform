import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Zap, LayoutDashboard, Code2, Rocket, Key, ScrollText,
  BarChart3, Settings, Shield, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Functions', icon: Code2, path: '/dashboard/functions' },
  { label: 'Deploy', icon: Rocket, path: '/dashboard/deploy' },
  { label: 'API Keys', icon: Key, path: '/dashboard/api-keys' },
  { label: 'Logs', icon: ScrollText, path: '/dashboard/logs' },
  { label: 'Metrics', icon: BarChart3, path: '/dashboard/metrics' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <aside className="w-[260px] flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FaaS Platform</div>
            <div className="text-xs text-slate-500">Serverless Engine</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">
          Main
        </div>
        {navItems.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx('nav-item', isActive && 'active')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </NavLink>
          );
        })}

        {user?.role === 'admin' && (
          <>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mt-4 mb-2">
              Admin
            </div>
            <NavLink
              to="/dashboard/admin"
              className={clsx(
                'nav-item',
                location.pathname.startsWith('/dashboard/admin') && 'active'
              )}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Admin Panel</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-sm font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.username}</div>
            <div className="text-xs text-slate-500 truncate">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
