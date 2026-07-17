import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, FileText, AlertTriangle, Clock } from 'lucide-react';
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
import { cn, formatDate, priorityColor, statusColor, isOverdue, daysUntil } from '@/lib/utils';
import type { Assignment, Priority, AssignmentStatus } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject_id: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { assignments, subjects, loading, refresh } = useUserData(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | AssignmentStatus>('all');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', status: 'pending' },
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return assignments;
    if (filter === 'overdue') return assignments.filter((a) => a.due_date && isOverdue(a.due_date) && a.status !== 'completed');
    return assignments.filter((a) => a.status === filter);
  }, [assignments, filter]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', subject_id: '', due_date: '', priority: 'medium', status: 'pending', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    reset({
      name: a.name,
      subject_id: a.subject_id ?? '',
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
      priority: a.priority,
      status: a.status === 'overdue' ? 'pending' : a.status,
      notes: a.notes,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      subject_id: data.subject_id || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      priority: data.priority as Priority,
      status: data.status as Exclude<AssignmentStatus, 'overdue'>,
      notes: data.notes ?? '',
    };
    if (editing) {
      const { error } = await supabase.from('assignments').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Assignment updated');
    } else {
      const { error } = await supabase.from('assignments').insert({ ...payload, user_id: user!.id });
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Assignment created');
    }
    setDialogOpen(false);
    refresh();
  };

  const deleteAssignment = async (a: Assignment) => {
    const { error } = await supabase.from('assignments').delete().eq('id', a.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Assignment deleted');
    refresh();
  };

  if (loading) return <LoadingState />;

  const filters: ('all' | AssignmentStatus)[] = ['all', 'pending', 'in_progress', 'completed', 'overdue'];

  return (
    <div>
      <PageHeader
        title="Assignment Manager"
        description="Track assignments and deadlines"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Assignment</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent'
            )}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No assignments yet"
          description="Create an assignment to track deadlines and progress."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Assignment</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const subj = subjects.find((s) => s.id === a.subject_id);
            const overdue = a.due_date && isOverdue(a.due_date) && a.status !== 'completed';
            const days = a.due_date ? daysUntil(a.due_date) : null;
            return (
              <Card key={a.id} className={cn('glass transition-all hover:shadow-lg', overdue && 'border-red-300/50')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${subj?.color ?? '#3b82f6'}20`, color: subj?.color ?? '#3b82f6' }}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{a.name}</h3>
                        <p className="text-xs text-muted-foreground">{subj?.name ?? 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAssignment(a)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', priorityColor(a.priority))}>{a.priority}</span>
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', statusColor(overdue ? 'overdue' : a.status))}>
                      {overdue ? 'overdue' : a.status.replace('_', ' ')}
                    </span>
                  </div>

                  {a.due_date && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      {overdue ? <AlertTriangle className="h-3 w-3 text-red-600" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                      <span className={overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                        Due {formatDate(a.due_date)}
                        {days !== null && !overdue && a.status !== 'completed' && ` (${days === 0 ? 'today' : `${days}d left`})`}
                      </span>
                    </div>
                  )}
                  {a.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{a.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assignment Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Lab Report 3" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select onValueChange={(v) => setValue('subject_id', v)}>
                  <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="datetime-local" {...register('due_date')} />
              </div>
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
                <Select defaultValue="pending" onValueChange={(v) => setValue('status', v as Exclude<AssignmentStatus, 'overdue'>)}>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Additional notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
