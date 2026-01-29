import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTaskReminders, ReminderChannel } from '@/hooks/useTaskReminders';
import { Task } from '@/types/database';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskReminderDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slackEnabled?: boolean;
}

const INTERVAL_LABELS: Record<number, string> = {
  30: '30 jours avant',
  14: '14 jours avant',
  7: '7 jours avant',
  1: '1 jour avant',
};

export function TaskReminderDialog({ task, open, onOpenChange, slackEnabled = false }: TaskReminderDialogProps) {
  const { reminders, upsertReminder, deleteReminder, hasReminder, getReminder, isUpdating, REMINDER_INTERVALS } = useTaskReminders(task?.id);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (daysBefore: number, channel: ReminderChannel, checked: boolean) => {
    if (!task) return;
    
    setSaving(true);
    try {
      const existing = getReminder(daysBefore, channel);
      if (checked) {
        await upsertReminder({
          task_id: task.id,
          days_before: daysBefore,
          channel,
          enabled: true,
        });
        toast.success(`Rappel ${INTERVAL_LABELS[daysBefore]} activé`);
      } else if (existing) {
        await deleteReminder(existing.id);
        toast.success(`Rappel ${INTERVAL_LABELS[daysBefore]} désactivé`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Rappels pour cette tâche
          </DialogTitle>
          <DialogDescription>
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {REMINDER_INTERVALS.map((days) => (
            <div key={days} className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {INTERVAL_LABELS[days]}
              </h4>
              <div className="flex flex-wrap gap-4 pl-2">
                {/* Email reminder */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`email-${days}`}
                    checked={hasReminder(days, 'EMAIL')}
                    onCheckedChange={(checked) => handleToggle(days, 'EMAIL', checked as boolean)}
                    disabled={saving || isUpdating}
                  />
                  <Label htmlFor={`email-${days}`} className="flex items-center gap-1.5 cursor-pointer">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                </div>

                {/* Slack reminder */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`slack-${days}`}
                    checked={hasReminder(days, 'SLACK')}
                    onCheckedChange={(checked) => handleToggle(days, 'SLACK', checked as boolean)}
                    disabled={saving || isUpdating || !slackEnabled}
                  />
                  <Label 
                    htmlFor={`slack-${days}`} 
                    className={`flex items-center gap-1.5 cursor-pointer ${!slackEnabled ? 'text-muted-foreground' : ''}`}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Slack
                    {!slackEnabled && <span className="text-xs">(non configuré)</span>}
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(saving || isUpdating) && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sauvegarde...
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
