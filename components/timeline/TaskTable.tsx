import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Task, TaskStatus } from '@/types/database';
import { CheckCircle2, Clock, AlertCircle, Loader2, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { TaskReminderDialog } from './TaskReminderDialog';

interface TaskTableProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  slackEnabled?: boolean;
}

const statusConfig: Record<TaskStatus, { label: string; icon: React.ComponentType<any>; variant: string }> = {
  TODO: { label: 'À faire', icon: Clock, variant: 'secondary' },
  IN_PROGRESS: { label: 'En cours', icon: Loader2, variant: 'default' },
  DONE: { label: 'Terminé', icon: CheckCircle2, variant: 'success' },
  BLOCKED: { label: 'Bloqué', icon: AlertCircle, variant: 'destructive' },
  LATE: { label: 'En retard', icon: AlertCircle, variant: 'destructive' },
};

const taskTypeLabels: Record<string, string> = {
  COLLECT_YEAR_INPUTS: 'Collecter les informations annuelles',
  COLLECT_ACCOUNTS: 'Collecter les comptes',
  DRAFT_AGM_PACK: 'Rédiger le pack AG',
  SEND_CONVOCATIONS: 'Envoyer les convocations',
  HOLD_AGM: 'Tenir l\'AG',
  FILE_ACCOUNTS: 'Déposer les comptes',
  ARCHIVE: 'Archiver les documents',
};

export function TaskTable({ tasks, onStatusChange, slackEnabled = false }: TaskTableProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const handleOpenReminder = (task: Task) => {
    setSelectedTask(task);
    setReminderDialogOpen(true);
  };

  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Tâche</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const config = statusConfig[task.status];
              const StatusIcon = config.icon;
              const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'DONE';

              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {taskTypeLabels[task.type] || task.type}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(isOverdue && 'text-destructive font-medium')}>
                      {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.owner_role === 'PRESIDENT' ? 'Président' : 'Comptable'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn(
                              'h-4 w-4',
                              task.status === 'IN_PROGRESS' && 'animate-spin'
                            )} />
                            {config.label}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {cfg.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {slackEnabled && task.status !== 'DONE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReminder(task)}
                        title="Envoyer un rappel"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedTask && (
        <TaskReminderDialog
          task={selectedTask}
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
        />
      )}
    </>
  );
}
