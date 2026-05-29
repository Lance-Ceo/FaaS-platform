import { CheckCircle, XCircle, Clock, Loader2, Rocket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Deployment } from '@faas/shared-types';

interface DeploymentTimelineProps {
  deployments: Deployment[];
}

const STATUS_ICON: Record<string, React.ElementType> = {
  SUCCESS: CheckCircle,
  FAILED: XCircle,
  QUEUED: Clock,
  BUILDING: Loader2,
  DEPLOYING: Rocket,
  PUSHING: Loader2,
  ROLLED_BACK: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FAILED: 'text-red-400 bg-red-500/10 border-red-500/20',
  QUEUED: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  BUILDING: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  DEPLOYING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  PUSHING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ROLLED_BACK: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export default function DeploymentTimeline({ deployments }: DeploymentTimelineProps) {
  if (deployments.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No deployments yet</p>;
  }

  return (
    <div className="space-y-3">
      {deployments.map((d, i) => {
        const Icon = STATUS_ICON[d.status] || Clock;
        const colorClass = STATUS_COLOR[d.status] || STATUS_COLOR.QUEUED;
        const isAnimated = ['BUILDING', 'DEPLOYING', 'PUSHING'].includes(d.status);
        const duration = d.completedAt
          ? Math.round((new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime()) / 1000)
          : null;

        return (
          <div key={d.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon className={`w-4 h-4 ${isAnimated ? 'animate-spin' : ''}`} />
              </div>
              {i < deployments.length - 1 && (
                <div className="w-px flex-1 bg-slate-800 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">v{d.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                    {d.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(d.startedAt), { addSuffix: true })}
                  {duration !== null && ` · ${duration}s`}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">by {d.triggeredBy}</p>
              {d.error && (
                <p className="text-xs text-red-400 mt-1 font-mono bg-red-500/5 px-2 py-1 rounded">
                  {d.error}
                </p>
              )}
              {d.logs && d.logs.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                    {d.logs.length} log entries
                  </summary>
                  <div className="mt-1 code-block text-xs max-h-32 overflow-y-auto">
                    {d.logs.map((log, li) => (
                      <div key={li} className="py-0.5">{log}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
