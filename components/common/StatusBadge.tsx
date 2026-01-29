import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/database';

interface StatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: 'À faire', className: 'status-todo' },
  IN_PROGRESS: { label: 'En cours', className: 'status-in-progress' },
  DONE: { label: 'Terminé', className: 'status-done' },
  BLOCKED: { label: 'Bloqué', className: 'status-blocked' },
  LATE: { label: 'En retard', className: 'status-late' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
