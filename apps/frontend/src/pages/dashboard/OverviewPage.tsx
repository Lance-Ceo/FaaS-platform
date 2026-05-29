import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Code2, Rocket, CheckCircle, AlertCircle, Activity,
  TrendingUp, Users, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatusBadge from '@/components/ui/StatusBadge';
import type { FaasFunction, PlatformMetrics } from '@faas/shared-types';

// Mock chart data — in production this comes from metrics API
const chartData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  invocations: Math.floor(Math.random() * 500 + 100),
  errors: Math.floor(Math.random() * 20),
}));

export default function OverviewPage() {
  const { user } = useAuthStore();

  const { data: functionsData } = useQuery({
    queryKey: ['functions'],
    queryFn: () => api.get('/functions?limit=5').then((r) => r.data),
  });

  const { data: metricsData } = useQuery({
    queryKey: ['platform-metrics'],
    queryFn: () => api.get('/metrics/platform').then((r) => r.data),
    enabled: user?.role === 'admin',
  });

  const functions: FaasFunction[] = functionsData?.data || [];
  const metrics: PlatformMetrics = metricsData?.data || {};

  const statCards = [
    {
      label: 'Total Functions',
      value: functions.length,
      icon: Code2,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
      border: 'border-brand-500/20',
    },
    {
      label: 'Active Functions',
      value: functions.filter((f) => f.status === 'READY').length,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Deployments Today',
      value: metrics.activeDeployments ?? '—',
      icon: Rocket,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Error Rate',
      value: metrics.avgSuccessRate ? `${(100 - metrics.avgSuccessRate).toFixed(1)}%` : '0%',
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Good {getTimeOfDay()},{' '}
            <span className="text-gradient">{user?.username}</span> 👋
          </h2>
          <p className="text-slate-400 mt-1">Here's what's happening with your functions today.</p>
        </div>
        <Link to="/dashboard/deploy" className="btn-primary">
          <Zap className="w-4 h-4" />
          Deploy Function
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`metric-card border ${card.border}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>+12% from last week</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Recent functions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invocations chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Invocations (24h)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Function calls over the last 24 hours</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="invocations" stroke="#3b82f6" fill="url(#invGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="url(#errGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent functions */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Functions</h3>
            <Link to="/dashboard/functions" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {functions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No functions yet
              </div>
            ) : (
              functions.slice(0, 5).map((fn) => (
                <Link
                  key={fn.id}
                  to={`/dashboard/functions/${fn.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{fn.name}</div>
                    <div className="text-xs text-slate-500">{fn.runtime}</div>
                  </div>
                  <StatusBadge status={fn.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin metrics */}
      {user?.role === 'admin' && metrics.totalUsers && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            Platform Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: metrics.totalUsers },
              { label: 'Total Functions', value: metrics.totalFunctions },
              { label: 'Invocations (24h)', value: metrics.totalInvocations?.toLocaleString() },
              { label: 'Success Rate', value: `${metrics.avgSuccessRate?.toFixed(1)}%` },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-white">{item.value ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
