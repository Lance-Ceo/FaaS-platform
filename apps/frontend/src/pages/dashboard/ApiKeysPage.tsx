import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  key?: string; // Only present on creation
}

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/auth/api-keys').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/auth/api-keys', { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreatedKey(res.data.data.key);
      setShowCreate(false);
      setNewKeyName('');
    },
    onError: () => toast.error('Failed to create API key'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
    },
  });

  const keys: ApiKey[] = data || [];

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">API Keys</h2>
          <p className="text-sm text-slate-400 mt-0.5">Manage API keys for programmatic access</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New API Key
        </button>
      </div>

      {/* New key created banner */}
      {createdKey && (
        <div className="glass-card p-5 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-400 mb-1">Save your API key now</p>
              <p className="text-sm text-slate-400 mb-3">
                This key will not be shown again. Copy it and store it securely.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200">
                  {showKey ? createdKey : `${createdKey.substring(0, 12)}${'•'.repeat(20)}`}
                </code>
                <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copied!'); }}
                  className="btn-secondary"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
            <button onClick={() => setCreatedKey(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Create New API Key</h3>
          <div className="flex gap-3">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="input flex-1"
              placeholder="Key name (e.g., CI/CD Pipeline)"
              onKeyDown={(e) => e.key === 'Enter' && newKeyName && createMutation.mutate(newKeyName)}
            />
            <button
              onClick={() => createMutation.mutate(newKeyName)}
              disabled={!newKeyName || createMutation.isPending}
              className="btn-primary"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key Prefix</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Key className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-400">No API keys yet</p>
                  <p className="text-slate-600 text-sm mt-1">Create a key to access the API programmatically</p>
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id}>
                  <td className="font-medium text-slate-200">{key.name}</td>
                  <td>
                    <code className="text-xs bg-slate-800 px-2 py-1 rounded font-mono text-slate-400">
                      {key.keyPrefix}••••••••
                    </code>
                  </td>
                  <td className="text-slate-500 text-sm">
                    {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                  </td>
                  <td className="text-slate-500 text-sm">
                    {key.lastUsedAt
                      ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        if (confirm(`Revoke key "${key.name}"?`)) deleteMutation.mutate(key.id);
                      }}
                      className="btn-ghost p-1.5 text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Usage info */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-3">Using API Keys</h3>
        <p className="text-sm text-slate-400 mb-3">
          Include your API key in the <code className="text-brand-400">X-API-Key</code> header:
        </p>
        <pre className="code-block text-xs">
{`curl -X GET https://api.faas.local/api/v1/functions \\
  -H "X-API-Key: fk_your_api_key_here"`}
        </pre>
      </div>
    </div>
  );
}
