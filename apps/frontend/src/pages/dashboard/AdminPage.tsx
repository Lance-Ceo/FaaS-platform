import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, Users, Code2, Rocket, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import { useState } from 'react';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { functions: number; apiKeys: number };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'functions' | 'deployments'>('users');
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.data),
    enabled: activeTab === 'users',
  });

  const { data: functionsData } = useQuery({
    queryKey: ['admin-functions'],
    queryFn: () => api.get('/admin/functions').then((r) => r.data.data),
    enabled: activeTab === 'functions',
  });

  const { data: deploymentsData } = useQuery({
    queryKey: ['admin-deployments'],
    queryFn: () => api.get('/admin/deployments').then((r) => r.data.data),
    enabled: activeTab === 'deployments',
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated');
    },
  });

  const users: AdminUser[] = usersData || [];

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          <p className="text-sm text-slate-400">Platform administration and management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-brand-400' },
          { label: 'Total Functions', value: (functionsData || []).length, icon: Code2, color: 'text-emerald-400' },
          { label: 'Recent Deployments', value: (deploymentsData || []).length, icon: Rocket, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {(['users', 'functions', 'deployments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-brand-400 border-brand-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Functions</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-500" />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <div className="font-medium text-slate-200">{user.username}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => changeRoleMutation.mutate({ id: user.id, role: e.target.value })}
                        className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      >
                        <option value="DEVELOPER">Developer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="text-slate-400 text-sm">{user._count.functions}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-ready' : 'badge-stopped'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleUserMutation.mutate({ id: user.id, isActive: !user.isActive })}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          user.isActive
                            ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                            : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Functions tab */}
      {activeTab === 'functions' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Function</th>
                <th>Owner</th>
                <th>Runtime</th>
                <th>Status</th>
                <th>Deployments</th>
              </tr>
            </thead>
            <tbody>
              {(functionsData || []).map((fn: { id: string; name: string; description?: string; user: { username: string }; runtime: string; status: string; _count: { deployments: number } }) => (
                <tr key={fn.id}>
                  <td>
                    <div className="font-medium text-slate-200">{fn.name}</div>
                    {fn.description && <div className="text-xs text-slate-500">{fn.description}</div>}
                  </td>
                  <td className="text-slate-400 text-sm">{fn.user.username}</td>
                  <td className="text-slate-400 text-sm">{fn.runtime}</td>
                  <td><StatusBadge status={fn.status} /></td>
                  <td className="text-slate-400 text-sm">{fn._count.deployments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deployments tab */}
      {activeTab === 'deployments' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Function</th>
                <th>Version</th>
                <th>Status</th>
                <th>Triggered By</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {(deploymentsData || []).map((d: { id: string; function: { name: string }; version: number; status: string; user: { username: string }; startedAt: string }) => (
                <tr key={d.id}>
                  <td className="font-medium text-slate-200">{d.function.name}</td>
                  <td className="font-mono text-sm text-slate-400">v{d.version}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="text-slate-400 text-sm">{d.user.username}</td>
                  <td className="text-slate-500 text-sm">
                    {formatDistanceToNow(new Date(d.startedAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
