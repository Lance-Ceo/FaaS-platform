import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { Terminal, Pause, Play, Trash2, Download } from 'lucide-react';
import { clsx } from 'clsx';
import type { FaasFunction, FunctionLog } from '@faas/shared-types';

interface LiveLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  functionName?: string;
}

export default function LogsPage() {
  const [selectedFunction, setSelectedFunction] = useState<string>('all');
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { data: functionsData } = useQuery({
    queryKey: ['functions-list'],
    queryFn: () => api.get('/functions?limit=100').then((r) => r.data.data),
  });

  const { data: historicalLogs } = useQuery({
    queryKey: ['logs', selectedFunction],
    queryFn: () => {
      const url = selectedFunction === 'all'
        ? '/functions'
        : `/functions/${selectedFunction}/logs`;
      return api.get(url).then((r) => r.data.data);
    },
  });

  const functions: FaasFunction[] = functionsData || [];

  // Subscribe to live logs
  useEffect(() => {
    const unsub = wsClient.on('log', (payload) => {
      if (isPausedRef.current) return;
      const log = payload as LiveLog;
      if (selectedFunction !== 'all' && log.functionName !== selectedFunction) return;
      setLiveLogs((prev) => [
        { ...log, id: `${Date.now()}-${Math.random()}` },
        ...prev,
      ].slice(0, 500));
    });
    return unsub;
  }, [selectedFunction]);

  // Auto-scroll
  useEffect(() => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, isPaused]);

  const allLogs: FunctionLog[] = Array.isArray(historicalLogs) ? historicalLogs : [];
  const filteredLogs = levelFilter
    ? allLogs.filter((l) => l.level === levelFilter)
    : allLogs;

  const downloadLogs = () => {
    const content = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.txt`;
    a.click();
  };

  const LOG_COLORS: Record<string, string> = {
    ERROR: 'text-red-400',
    WARN: 'text-amber-400',
    INFO: 'text-slate-300',
    DEBUG: 'text-slate-500',
  };

  return (
    <div className="max-w-7xl space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Live Logs</h2>
          <p className="text-sm text-slate-400 mt-0.5">Real-time function execution logs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadLogs} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={clsx('btn-secondary', isPaused && 'text-amber-400 border-amber-500/30')}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setLiveLogs([])} className="btn-ghost">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={selectedFunction}
          onChange={(e) => setSelectedFunction(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All Functions</option>
          {functions.map((fn) => (
            <option key={fn.id} value={fn.id}>{fn.name}</option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Levels</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Warning</option>
          <option value="INFO">Info</option>
          <option value="DEBUG">Debug</option>
        </select>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className={clsx('w-2 h-2 rounded-full', isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
          {isPaused ? 'Paused' : 'Live'}
          {liveLogs.length > 0 && ` · ${liveLogs.length} new`}
        </div>
      </div>

      {/* Log viewer */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/50">
          <Terminal className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-slate-300">Log Stream</span>
          <span className="ml-auto text-xs text-slate-600">{filteredLogs.length + liveLogs.length} entries</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5 bg-slate-950">
          {liveLogs.length === 0 && filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600">
              <Terminal className="w-8 h-8 mb-2 opacity-30" />
              <p>Waiting for logs...</p>
              <p className="text-xs mt-1">Invoke a function to see logs here</p>
            </div>
          ) : (
            <>
              {/* Live logs (newest first) */}
              {liveLogs.map((log) => (
                <div key={log.id} className="flex gap-3 py-0.5 animate-fade-in">
                  <span className="text-slate-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={clsx('flex-shrink-0 w-12', LOG_COLORS[log.level] || 'text-slate-400')}>
                    [{log.level}]
                  </span>
                  {log.functionName && (
                    <span className="text-brand-400 flex-shrink-0">[{log.functionName}]</span>
                  )}
                  <span className={LOG_COLORS[log.level] || 'text-slate-300'}>{log.message}</span>
                </div>
              ))}

              {/* Historical logs */}
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 py-0.5">
                  <span className="text-slate-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={clsx('flex-shrink-0 w-12', LOG_COLORS[log.level] || 'text-slate-400')}>
                    [{log.level}]
                  </span>
                  <span className={LOG_COLORS[log.level] || 'text-slate-300'}>{log.message}</span>
                </div>
              ))}
            </>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
