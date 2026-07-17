import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit2, ListTodo, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, EmptyState, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { cn, formatDate, priorityColor, statusColor, isOverdue } from '@/lib/utils';
import type { Task, Priority, TaskStatus } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  subject_id: z.string().optional(),
  due_date: z.string().optional(),
  reminder_at: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, subjects, loading, refresh } = useUserData(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', status: 'pending' },
  });

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter !== 'all') {
      if (filter === 'overdue') {
        result = tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'completed');
      } else {
        result = tasks.filter((t) => t.status === filter);
      }
    }
    return result;
  }, [tasks, filter]);

  const openCreate = () => {
    setEditingTask(null);
    reset({ title: '', notes: '', priority: 'medium', status: 'pending', subject_id: '', due_date: '', reminder_at: '' });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      status: task.status === 'overdue' ? 'pending' : task.status,
      subject_id: task.subject_id ?? '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
      reminder_at: task.reminder_at ? new Date(task.reminder_at).toISOString().slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      title: data.title,
      notes: data.notes ?? '',
      priority: data.priority as Priority,
      status: data.status as Exclude<TaskStatus, 'overdue'>,
      subject_id: data.subject_id || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      reminder_at: data.reminder_at ? new Date(data.reminder_at).toISOString() : null,
    };

    if (editingTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error('Failed to update task'); return; }
      toast.success('Task updated');
    } else {
      const { error } = await supabase.from('tasks').insert({ ...payload, user_id: user!.id });
      if (error) { toast.error('Failed to create task'); return; }
      toast.success('Task created');
    }
    setDialogOpen(false);
    refresh();
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) { toast.error('Failed to update'); return; }
    refresh();
  };

  const deleteTask = async (task: Task) => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Task deleted');
    refresh();
  };

  if (loading) return <LoadingState />;

  const filterTabs: ('all' | TaskStatus)[] = ['all', 'pending', 'in_progress', 'completed', 'overdue'];

  return (
    <div>
      <PageHeader
        title="Task Manager"
        description="Create, organize, and track your tasks"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filterTabs.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'
            )}
          >
            {f === 'all' ? 'All Tasks' : f.replace('_', ' ')}
            <span className="ml-1.5 text-xs opacity-70">
              {f === 'all' ? tasks.length : f === 'overdue'
                ? tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'completed').length
                : tasks.filter((t) => t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-8 w-8" />}
          title="No tasks yet"
          description="Create your first task to start tracking your work."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Task</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const subj = subjects.find((s) => s.id === task.subject_id);
            const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'completed';
            return (
              <Card key={task.id} className={cn('glass transition-all hover:shadow-md', overdue && 'border-red-300/50')}>
                <CardContent className="flex items-start gap-3 p-4">
                  <button
                    onClick={() => toggleComplete(task)}
                    className="mt-0.5 shrink-0"
                  >
                    {task.status === 'completed'
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</p>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', priorityColor(task.priority))}>{task.priority}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', statusColor(overdue ? 'overdue' : task.status))}>
                        {overdue ? 'overdue' : task.status.replace('_', ' ')}
                      </span>
                      {subj && (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: `${subj.color}20`, color: subj.color }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: subj.color }} />
                          {subj.name}
                        </span>
                      )}
                    </div>
                    {task.notes && <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span className={cn('inline-flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                          {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(task)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} placeholder="Task title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="medium" onValueChange={(v) => setValue('priority', v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="pending" onValueChange={(v) => setValue('status', v as Exclude<TaskStatus, 'overdue'>)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select onValueChange={(v) => setValue('subject_id', v)}>
                <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="datetime-local" {...register('due_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder_at">Reminder</Label>
                <Input id="reminder_at" type="datetime-local" {...register('reminder_at')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Additional notes..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingTask ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
