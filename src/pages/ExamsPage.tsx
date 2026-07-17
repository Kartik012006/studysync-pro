import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GraduationCap, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, EmptyState, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import type { Exam } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject_id: z.string().optional(),
  exam_date: z.string().min(1, 'Date is required'),
  exam_time: z.string().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ExamsPage() {
  const { user } = useAuth();
  const { exams, subjects, loading, refresh } = useUserData(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const sortedExams = [...exams].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', subject_id: '', exam_date: '', exam_time: '', room: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (e: Exam) => {
    setEditing(e);
    reset({ name: e.name, subject_id: e.subject_id ?? '', exam_date: e.exam_date, exam_time: e.exam_time, room: e.room, notes: e.notes });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      subject_id: data.subject_id || null,
      exam_date: data.exam_date,
      exam_time: data.exam_time ?? '',
      room: data.room ?? '',
      notes: data.notes ?? '',
    };
    if (editing) {
      const { error } = await supabase.from('exams').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Exam updated');
    } else {
      const { error } = await supabase.from('exams').insert({ ...payload, user_id: user!.id });
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Exam added');
    }
    setDialogOpen(false);
    refresh();
  };

  const deleteExam = async (e: Exam) => {
    const { error } = await supabase.from('exams').delete().eq('id', e.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Exam deleted');
    refresh();
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Exam Manager"
        description="Plan and track your upcoming exams"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Exam</Button>}
      />

      {sortedExams.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title="No exams scheduled"
          description="Add your exams to get countdown alerts and plan your study."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Exam</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedExams.map((exam) => {
            const subj = subjects.find((s) => s.id === exam.subject_id);
            const days = daysUntil(exam.exam_date);
            const isPast = days < 0;
            const isSoon = days >= 0 && days <= 3;
            return (
              <Card key={exam.id} className={cn('glass transition-all hover:shadow-lg', isSoon && 'border-amber-300/50', isPast && 'opacity-60')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold" style={{ background: `${subj?.color ?? '#3b82f6'}20`, color: subj?.color ?? '#3b82f6' }}>
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{exam.name}</h3>
                        <p className="text-xs text-muted-foreground">{subj?.name ?? 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(exam)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteExam(exam)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(exam.exam_date)}{exam.exam_time && ` at ${exam.exam_time}`}</span>
                    </div>
                    {exam.room && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{exam.room}</span>
                      </div>
                    )}
                    {exam.notes && <p className="text-xs text-muted-foreground mt-2">{exam.notes}</p>}
                  </div>

                  <div className="mt-3">
                    {isPast ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : days === 0 ? (
                      <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Today!</Badge>
                    ) : days === 1 ? (
                      <Badge variant="destructive">Tomorrow</Badge>
                    ) : isSoon ? (
                      <Badge variant="destructive">{days} days left</Badge>
                    ) : (
                      <Badge variant="secondary">{days} days left</Badge>
                    )}
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
            <DialogTitle>{editing ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Exam Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Midterm Exam" />
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
                <Label htmlFor="room">Room</Label>
                <Input id="room" {...register('room')} placeholder="e.g. Room 201" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_date">Date</Label>
                <Input id="exam_date" type="date" {...register('exam_date')} />
                {errors.exam_date && <p className="text-xs text-destructive">{errors.exam_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam_time">Time</Label>
                <Input id="exam_time" type="time" {...register('exam_time')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Syllabus, topics, etc." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
