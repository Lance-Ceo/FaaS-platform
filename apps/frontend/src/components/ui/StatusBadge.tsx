import { clsx } from 'clsx';
import { CheckCircle, AlertCircle, Clock, Loader2, Square, Rocket } from 'lucide-react';

type Status = string;

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  READY: { label: 'Ready', className: 'badge-ready', icon: CheckCircle },
  BUILDING: { label: 'Building', className: 'badge-building', icon: Loader2 },
  DEPLOYING: { label: 'Deploying', className: 'badge-deploying', icon: Rocket },
  PENDING: { label: 'Pending', className: 'badge-pending', icon: Clock },
  ERROR: { label: 'Error', className: 'badge-error', icon: AlertCircle },
  STOPPED: { label: 'Stopped', className: 'badge-stopped', icon: Square },
  // Deployment statuses
  SUCCESS: { label: 'Success', className: 'badge-ready', icon: CheckCircle },
  FAILED: { label: 'Failed', className: 'badge-error', icon: AlertCircle },
  QUEUED: { label: 'Queued', className: 'badge-pending', icon: Clock },
  PUSHING: { label: 'Pushing', className: 'badge-deploying', icon: Rocket },
  ROLLED_BACK: { label: 'Rolled Back', className: 'badge-stopped', icon: Square },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const isAnimated = ['BUILDING', 'DEPLOYING', 'PUSHING'].includes(status?.toUpperCase());

  return (
    <span className={clsx(cfg.className, className)}>
      <Icon className={clsx('w-3 h-3', isAnimated && 'animate-spin')} />
      {cfg.label}
    </span>
  );
}
