import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Trash2, Rocket, RefreshCw, Code2,
  MoreVertical, Eye, Play,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';
import type { FaasFunction } from '@faas/shared-types';
import { formatDistanceToNow } from 'date-fns';

const RUNTIME_LABELS: Record<string, string> = {
  NODE18: 'Node.js 18',
  PYTHON3: 'Python 3',
  GO119: 'Go 1.19',
};

const RUNTIME_COLORS: Record<string, string> = {
  NODE18: 'text-green-400 bg-green-500/10',
  PYTHON3: 'text-blue-400 bg-blue-500/10',
  GO119: 'text-cyan-400 bg-cyan-500/10',
};

export default function FunctionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['functions', search, statusFilter],
    queryFn: () =>
      api.get('/functions', { params: { search, status: statusFilter || undefined } })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/functions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success('Function deleted');
    },
    onError: () => toast.error('Failed to delete function'),
  });

  const deployMutation = useMutation({
    mutationFn: (id: string) => api.post(`/functions/${id}/deploy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success('Deployment queued');
    },
    onError: () => toast.error('Failed to queue deployment'),
  });

  const functions: FaasFunction[] = data?.data || [];

  const handleDelete = (fn: FaasFunction) => {
    if (confirm(`Delete function "${fn.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(fn.id);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Functions</h2>
          <p className="text-sm text-slate-400 mt-0.5">{functions.length} functions deployed</p>
        </div>
        <Link to="/dashboard/deploy" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Function
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search functions..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All statuses</option>
          <option value="READY">Ready</option>
          <option value="BUILDING">Building</option>
          <option value="DEPLOYING">Deploying</option>
          <option value="ERROR">Error</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Runtime</th>
              <th>Status</th>
              <th>Memory</th>
              <th>Replicas</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading functions...
                </td>
              </tr>
            ) : functions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Code2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-400 font-medium">No functions found</p>
                  <p className="text-slate-600 text-sm mt-1">Deploy your first function to get started</p>
                  <Link to="/dashboard/deploy" className="btn-primary mt-4 inline-flex">
                    <Plus className="w-4 h-4" />
                    Deploy Function
                  </Link>
                </td>
              </tr>
            ) : (
              functions.map((fn) => (
                <tr key={fn.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-brand-600/20 flex items-center justify-center">
                        <Code2 className="w-3.5 h-3.5 text-brand-400" />
                      </div>
                      <div>
                        <Link
                          to={`/dashboard/functions/${fn.id}`}
                          className="font-medium text-slate-200 hover:text-brand-400 transition-colors"
                        >
                          {fn.name}
                        </Link>
                        {fn.description && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{fn.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${RUNTIME_COLORS[fn.runtime] || 'text-slate-400 bg-slate-800'}`}>
                      {RUNTIME_LABELS[fn.runtime] || fn.runtime}
                    </span>
                  </td>
                  <td><StatusBadge status={fn.status} /></td>
                  <td className="text-slate-400 text-sm">{fn.memory} MB</td>
                  <td className="text-slate-400 text-sm">{fn.replicas}</td>
                  <td className="text-slate-500 text-sm">
                    {formatDistanceToNow(new Date(fn.updatedAt), { addSuffix: true })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/dashboard/functions/${fn.id}`}
                        className="btn-ghost p-1.5"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => deployMutation.mutate(fn.id)}
                        disabled={deployMutation.isPending}
                        className="btn-ghost p-1.5 text-brand-400"
                        title="Deploy"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(fn)}
                        className="btn-ghost p-1.5 text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
