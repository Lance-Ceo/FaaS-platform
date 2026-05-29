import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Rocket, Trash2, Scale, Terminal, Activity,
  Clock, Cpu, MemoryStick, Globe, RefreshCw, Play,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { wsClient } from '@/lib/websocket';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import type { FaasFunction, FunctionLog, Deployment } from '@faas/shared-types';

export default function FunctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'deployments' | 'test'>('overview');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [testPayload, setTestPayload] = useState('{\n  "name": "World"\n}');
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: fnData, isLoading } = useQuery({
    queryKey: ['function', id],
    queryFn: () => api.get(`/functions/${id}`).then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const { data: logsData } = useQuery({
    queryKey: ['function-logs', id],
    queryFn: () => api.get(`/functions/${id}/logs`).then((r) => r.data.data),
    enabled: activeTab === 'logs',
    refetchInterval: 10000,
  });

  const { data: deploymentsData } = useQuery({
    queryKey: ['function-deployments', id],
    queryFn: () => api.get(`/functions/${id}/deployments`).then((r) => r.data.data),
    enabled: activeTab === 'deployments',
  });

  const deployMutation = useMutation({
    mutationFn: () => api.post(`/functions/${id}/deploy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function', id] });
      toast.success('Deployment queued');
    },
    onError: () => toast.error('Failed to queue deployment'),
  });

  const invokeMutation = useMutation({
    mutationFn: () => api.post(`/functions/${id}/invoke`, JSON.parse(testPayload)),
    onSuccess: (res) => {
      setTestResult(JSON.stringify(res.data, null, 2));
      toast.success('Function invoked');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invocation failed';
      setTestResult(`Error: ${msg}`);
      toast.error(msg);
    },
  });

  // Subscribe to live logs via WebSocket
  useEffect(() => {
    if (!id) return;
    wsClient.subscribe(id);
    const unsub = wsClient.on('log', (payload) => {
      const log = payload as { message: string; timestamp: string };
      setLiveLogs((prev) => [`[${log.timestamp}] ${log.message}`, ...prev].slice(0, 200));
    });
    return () => {
      wsClient.unsubscribe(id);
      unsub();
    };
  }, [id]);

  const fn: FaasFunction = fnData;
  const logs: FunctionLog[] = logsData || [];
  const deployments: Deployment[] = deploymentsData || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!fn) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Function not found</p>
        <Link to="/dashboard/functions" className="btn-secondary mt-4 inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to Functions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/functions" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{fn.name}</h2>
              <StatusBadge status={fn.status} />
            </div>
            {fn.description && <p className="text-sm text-slate-400 mt-0.5">{fn.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="btn-primary"
          >
            {deployMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Deploy
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Cpu, label: 'Runtime', value: fn.runtime },
          { icon: MemoryStick, label: 'Memory', value: `${fn.memory} MB` },
          { icon: Clock, label: 'Timeout', value: `${fn.timeout}s` },
          { icon: Scale, label: 'Replicas', value: `${fn.replicas} / ${fn.maxReplicas}` },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <item.icon className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="text-sm font-semibold text-white">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Endpoint */}
      {fn.endpoint && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">Endpoint</div>
            <code className="text-sm text-emerald-400 font-mono truncate block">{fn.endpoint}</code>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(fn.endpoint!); toast.success('Copied!'); }}
            className="btn-secondary text-xs py-1.5"
          >
            Copy
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {(['overview', 'logs', 'deployments', 'test'] as const).map((tab) => (
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

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Configuration</h3>
            <dl className="space-y-2">
              {[
                { label: 'Version', value: `v${fn.version}` },
                { label: 'Min Replicas', value: fn.minReplicas },
                { label: 'Max Replicas', value: fn.maxReplicas },
                { label: 'Triggers', value: fn.triggers?.join(', ') || 'HTTP' },
                { label: 'Created', value: formatDistanceToNow(new Date(fn.createdAt), { addSuffix: true }) },
                { label: 'Last Deployed', value: fn.deployedAt ? formatDistanceToNow(new Date(fn.deployedAt), { addSuffix: true }) : 'Never' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="text-slate-200 font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Environment Variables</h3>
            {Object.keys(fn.envVars || {}).length === 0 ? (
              <p className="text-sm text-slate-500">No environment variables</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(fn.envVars || {}).map(([k]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <code className="text-brand-400 font-mono">{k}</code>
                    <span className="text-slate-600">=</span>
                    <code className="text-slate-500 font-mono">••••••••</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              Live Logs
            </h3>
            <button onClick={() => setLiveLogs([])} className="btn-ghost text-xs py-1">
              Clear
            </button>
          </div>
          <div className="code-block h-80 overflow-y-auto flex flex-col-reverse">
            {liveLogs.length === 0 && logs.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No logs yet. Invoke the function to see logs.</p>
            ) : (
              [...liveLogs, ...logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)].map((line, i) => (
                <div key={i} className={`py-0.5 ${line.includes('[ERROR]') ? 'text-red-400' : line.includes('[WARN]') ? 'text-amber-400' : 'text-slate-300'}`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'deployments' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Triggered By</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {deployments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">No deployments yet</td>
                </tr>
              ) : (
                deployments.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-sm">v{d.version}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-slate-400 text-sm">{d.triggeredBy}</td>
                    <td className="text-slate-500 text-sm">
                      {formatDistanceToNow(new Date(d.startedAt), { addSuffix: true })}
                    </td>
                    <td className="text-slate-500 text-sm">
                      {d.completedAt
                        ? `${Math.round((new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime()) / 1000)}s`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Request Payload (JSON)</h3>
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="input font-mono text-xs h-48 resize-none"
              spellCheck={false}
            />
            <button
              onClick={() => invokeMutation.mutate()}
              disabled={invokeMutation.isPending || fn.status !== 'READY'}
              className="btn-primary mt-3 w-full justify-center"
            >
              {invokeMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {fn.status !== 'READY' ? 'Function not ready' : 'Invoke Function'}
            </button>
          </div>
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Response</h3>
            <pre className="code-block h-48 overflow-auto text-xs">
              {testResult || 'Response will appear here...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
