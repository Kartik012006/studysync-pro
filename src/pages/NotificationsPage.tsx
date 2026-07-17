import { useMemo } from 'react';
import { Bell, CheckCircle2, AlertTriangle, FileText, GraduationCap, Timer, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, GlassCard, EmptyState, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDateTime, isOverdue, daysUntil, formatDate, cn } from '@/lib/utils';
import type { NotificationItem, NotificationType } from '@/types';

const typeIcons: Record<NotificationType, typeof Bell> = {
  task: CheckCircle2,
  assignment: FileText,
  exam: GraduationCap,
  session: Timer,
  deadline: AlertTriangle,
  general: Bell,
};

const typeColors: Record<NotificationType, string> = {
  task: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  assignment: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  exam: 'text-red-600 bg-red-50 dark:bg-red-950/40',
  session: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
  deadline: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
  general: 'text-muted-foreground bg-muted',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { tasks, assignments, exams, sessions, notifications, loading, setNotifications } = useUserData(user?.id);

  const generatedNotifications = useMemo<NotificationItem[]>(() => {
    const result: NotificationItem[] = [];

    // Overdue tasks
    tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'completed').forEach((t) => {
      result.push({
        id: `task-overdue-${t.id}`,
        user_id: user!.id,
        type: 'deadline',
        title: `Overdue: ${t.title}`,
        message: `Task was due ${formatDate(t.due_date)}`,
        read: false,
        related_id: t.id,
        created_at: t.due_date!,
      });
    });

    // Tasks due soon
    tasks.filter((t) => t.due_date && t.status !== 'completed').forEach((t) => {
      const days = daysUntil(t.due_date!);
      if (days >= 0 && days <= 2) {
        result.push({
          id: `task-due-${t.id}`,
          user_id: user!.id,
          type: 'task',
          title: `Task due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in 2 days'}`,
          message: t.title,
          read: false,
          related_id: t.id,
          created_at: new Date().toISOString(),
        });
      }
    });

    // Assignments due soon
    assignments.filter((a) => a.due_date && a.status !== 'completed').forEach((a) => {
      const days = daysUntil(a.due_date!);
      if (days >= 0 && days <= 3) {
        result.push({
          id: `assignment-due-${a.id}`,
          user_id: user!.id,
          type: 'assignment',
          title: `Assignment due ${days === 0 ? 'today' : `in ${days} days`}`,
          message: a.name,
          read: false,
          related_id: a.id,
          created_at: new Date().toISOString(),
        });
      }
    });

    // Upcoming exams
    exams.filter((e) => {
      const days = daysUntil(e.exam_date);
      return days >= 0 && days <= 7;
    }).forEach((e) => {
      const days = daysUntil(e.exam_date);
      result.push({
        id: `exam-upcoming-${e.id}`,
        user_id: user!.id,
        type: 'exam',
        title: `Exam ${days === 0 ? 'today' : `in ${days} days`}`,
        message: e.name,
        read: false,
        related_id: e.id,
        created_at: new Date().toISOString(),
      });
    });

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tasks, assignments, exams, sessions, user]);

  const allNotifications = [...generatedNotifications, ...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadDb = notifications.filter((n) => !n.read);
    if (unreadDb.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadDb.map((n) => n.id));
    }
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const markRead = async (n: NotificationItem) => {
    if (n.id.includes('-')) return; // Generated notification, not in DB
    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    setNotifications(notifications.map((item) => item.id === n.id ? { ...item, read: true } : item));
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {allNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No notifications"
          description="You're all caught up! Notifications about tasks, exams, and deadlines will appear here."
        />
      ) : (
        <div className="space-y-2">
          {allNotifications.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <GlassCard key={n.id} className={cn('!p-4 transition-all', !n.read && 'border-primary/30')}>
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', typeColors[n.type])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.read && n.id.match(/^[0-9a-f-]+$/) && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
