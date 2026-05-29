import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Activity, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import type { FaasFunction } from '@faas/shared-types';

// Generate mock time-series data
const generateHourlyData = () =>
  Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    invocations: Math.floor(Math.random() * 800 + 50),
    errors: Math.floor(Math.random() * 30),
    avgDuration: Math.floor(Math.random() * 200 + 20),
  }));

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function MetricsPage() {
  const { data: functionsData } = useQuery({
    queryKey: ['functions'],
    queryFn: () => api.get('/functions').then((r) => r.data.data),
  });

  const functions: FaasFunction[] = functionsData || [];
  const hourlyData = generateHourlyData();

  const statusDistribution = [
    { name: 'Ready', value: functions.filter((f) => f.status === 'READY').length },
    { name: 'Building', value: functions.filter((f) => f.status === 'BUILDING').length },
    { name: 'Error', value: functions.filter((f) => f.status === 'ERROR').length },
    { name: 'Pending', value: functions.filter((f) => f.status === 'PENDING').length },
  ].filter((s) => s.value > 0);

  const runtimeDistribution = [
    { name: 'Node.js', value: functions.filter((f) => f.runtime === 'NODE18').length },
    { name: 'Python', value: functions.filter((f) => f.runtime === 'PYTHON3').length },
    { name: 'Go', value: functions.filter((f) => f.runtime === 'GO119').length },
  ].filter((r) => r.value > 0);

  const totalInvocations = hourlyData.reduce((s, d) => s + d.invocations, 0);
  const totalErrors = hourlyData.reduce((s, d) => s + d.errors, 0);
  const avgDuration = Math.round(hourlyData.reduce((s, d) => s + d.avgDuration, 0) / hourlyData.length);
  const successRate = (((totalInvocations - totalErrors) / totalInvocations) * 100).toFixed(1);

  const tooltipStyle = {
    contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 },
    labelStyle: { color: '#94a3b8' },
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Metrics</h2>
        <p className="text-sm text-slate-400 mt-0.5">Platform performance and function analytics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invocations (24h)', value: totalInvocations.toLocaleString(), icon: Activity, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Errors', value: totalErrors.toLocaleString(), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Avg Duration', value: `${avgDuration}ms`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((card) => (
          <div key={card.label} className="metric-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Invocations chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4">Invocations & Errors (24h)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={hourlyData}>
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
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="invocations" name="Invocations" stroke="#3b82f6" fill="url(#invGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="errors" name="Errors" stroke="#ef4444" fill="url(#errGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Duration chart + distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Average Duration (ms)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="avgDuration" name="Avg Duration (ms)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-5">
          {/* Status distribution */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">Function Status</h3>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                    {statusDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No functions</p>
            )}
          </div>

          {/* Runtime distribution */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">Runtime Distribution</h3>
            {runtimeDistribution.length > 0 ? (
              <div className="space-y-2">
                {runtimeDistribution.map((rt, i) => (
                  <div key={rt.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-xs text-slate-400 flex-1">{rt.name}</span>
                    <span className="text-xs font-medium text-slate-200">{rt.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No functions</p>
            )}
          </div>
        </div>
      </div>

      {/* Grafana link */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Advanced Metrics</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            View detailed dashboards in Grafana with Prometheus data
          </p>
        </div>
        <a
          href="http://localhost:3003"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Open Grafana →
        </a>
      </div>
    </div>
  );
}
