import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, EmptyState, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import type { Subject } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string(),
  target_hours_per_week: z.coerce.number().min(0).max(168),
});

type FormData = z.infer<typeof schema>;

export default function SubjectsPage() {
  const { user } = useAuth();
  const { subjects, sessions, loading, refresh } = useUserData(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: COLORS[0], target_hours_per_week: 5 },
  });

  const subjectStats = (subjectId: string) => {
    const subjectSessions = sessions.filter((s) => s.subject_id === subjectId);
    const totalSeconds = subjectSessions.reduce((a, s) => a + s.duration_seconds, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSeconds = subjectSessions
      .filter((s) => new Date(s.start_time) >= weekAgo)
      .reduce((a, s) => a + s.duration_seconds, 0);
    return { totalSeconds, weekSeconds, sessionCount: subjectSessions.length };
  };

  const openCreate = () => {
    setEditing(null);
    setSelectedColor(COLORS[0]);
    reset({ name: '', color: COLORS[0], target_hours_per_week: 5 });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setSelectedColor(s.color);
    reset({ name: s.name, color: s.color, target_hours_per_week: s.target_hours_per_week });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = { name: data.name, color: data.color, target_hours_per_week: data.target_hours_per_week };
    if (editing) {
      const { error } = await supabase.from('subjects').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Subject updated');
    } else {
      const { error } = await supabase.from('subjects').insert({ ...payload, user_id: user!.id });
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Subject created');
    }
    setDialogOpen(false);
    refresh();
  };

  const deleteSubject = async (s: Subject) => {
    const { error } = await supabase.from('subjects').delete().eq('id', s.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Subject deleted');
    refresh();
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Subject Management"
        description="Organize your subjects and track study hours"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>}
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No subjects yet"
          description="Add your subjects to start tracking study hours by topic."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const stats = subjectStats(s.id);
            const weekHours = stats.weekSeconds / 3600;
            const progress = s.target_hours_per_week > 0 ? Math.min((weekHours / s.target_hours_per_week) * 100, 100) : 0;
            return (
              <Card key={s.id} className="glass transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold" style={{ background: `${s.color}20`, color: s.color }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">Target: {s.target_hours_per_week}h/week</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSubject(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Weekly Progress</span>
                        <span className="font-medium">{weekHours.toFixed(1)}h / {s.target_hours_per_week}h</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Total: {formatDuration(stats.totalSeconds)}</span>
                      <span className="text-muted-foreground">{stats.sessionCount} sessions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Data Structures" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setSelectedColor(c); setValue('color', c); }}
                    className={`h-8 w-8 rounded-lg transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_hours_per_week">Target Hours/Week</Label>
              <Input id="target_hours_per_week" type="number" min={0} max={168} {...register('target_hours_per_week')} />
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
