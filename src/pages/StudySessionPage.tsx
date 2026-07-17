import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Play, Pause, Square, RotateCcw, Clock, Timer as TimerIcon, BookOpen, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, GlassCard, StatCard, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatTimer, formatDuration, formatDateTime } from '@/lib/utils';
import { startSessionOnDevice, stopSessionOnDevice, syncSession } from '@/lib/esp32';
import type { StudySession as StudySessionType } from '@/types';

export default function StudySessionPage() {
  const { user } = useAuth();
  const { subjects, sessions, loading, refresh } = useUserData(user?.id);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, paused]);

  const handleStart = async () => {
    setSeconds(0);
    setRunning(true);
    setPaused(false);
    setStartTime(new Date());

    const { data, error } = await supabase.from('study_sessions').insert({
      user_id: user!.id,
      subject_id: selectedSubject || null,
      start_time: new Date().toISOString(),
      duration_seconds: 0,
    }).select().maybeSingle();

    if (error) { toast.error('Failed to start session'); return; }
    if (data) {
      setCurrentSessionId(data.id);
      startSessionOnDevice(selectedSubject || null);
    }
  };

  const handlePause = () => setPaused(true);
  const handleResume = () => setPaused(false);

  const handleStop = useCallback(async () => {
    setRunning(false);
    setPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (currentSessionId) {
      const { error } = await supabase.from('study_sessions').update({
        end_time: new Date().toISOString(),
        duration_seconds: seconds,
        focus_score: Math.min(50 + Math.floor(seconds / 60), 100),
      }).eq('id', currentSessionId);

      if (error) { toast.error('Failed to save session'); }
      else {
        toast.success(`Session saved: ${formatDuration(seconds)}`);
        stopSessionOnDevice(currentSessionId);
        syncSession(currentSessionId);
      }
    }

    setSeconds(0);
    setCurrentSessionId(null);
    setStartTime(null);
    refresh();
  }, [currentSessionId, seconds, user, refresh]);

  const handleReset = () => {
    setSeconds(0);
    setRunning(false);
    setPaused(false);
  };

  const recentSessions = sessions.slice(0, 10);
  const todaySessions = sessions.filter((s) => s.start_time.startsWith(new Date().toISOString().split('T')[0]));
  const todayMinutes = todaySessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
  const totalMinutes = sessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Study Session" description="Focus timer with automatic tracking" />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Today's Focus" value={formatDuration(todayMinutes * 60)} icon={<Clock className="h-6 w-6" />} color="blue" />
        <StatCard title="Sessions Today" value={todaySessions.length} icon={<TimerIcon className="h-6 w-6" />} color="emerald" />
        <StatCard title="Total Study Time" value={formatDuration(totalMinutes * 60)} icon={<BookOpen className="h-6 w-6" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 flex flex-col items-center justify-center py-12">
          <div className="mb-6 w-full max-w-xs">
            <label className="mb-2 block text-sm font-medium">Subject (optional)</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(seconds % 3600) / 3600 * 565.48} 565.48`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="text-center">
              <p className="font-mono text-5xl font-bold tabular-nums">{formatTimer(seconds)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {running ? (paused ? 'Paused' : 'In progress') : 'Ready to start'}
              </p>
              {startTime && running && (
                <p className="mt-1 text-xs text-muted-foreground">Started at {startTime.toLocaleTimeString('en-US')}</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            {!running && !paused && (
              <Button size="lg" onClick={handleStart} className="h-12 px-8">
                <Play className="mr-2 h-5 w-5" /> Start
              </Button>
            )}
            {running && !paused && (
              <Button size="lg" variant="outline" onClick={handlePause} className="h-12 px-8">
                <Pause className="mr-2 h-5 w-5" /> Pause
              </Button>
            )}
            {running && paused && (
              <Button size="lg" onClick={handleResume} className="h-12 px-8">
                <Play className="mr-2 h-5 w-5" /> Resume
              </Button>
            )}
            {running && (
              <Button size="lg" variant="destructive" onClick={handleStop} className="h-12 px-8">
                <Square className="mr-2 h-5 w-5" /> Stop
              </Button>
            )}
            {seconds > 0 && !running && (
              <Button size="lg" variant="outline" onClick={handleReset} className="h-12 px-8">
                <RotateCcw className="mr-2 h-5 w-5" /> Reset
              </Button>
            )}
          </div>
        </GlassCard>

        <div>
          <h3 className="mb-3 font-semibold">Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <Card className="glass"><CardContent className="py-8 text-center text-sm text-muted-foreground">No sessions yet</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s: StudySessionType) => {
                const subj = subjects.find((sub) => sub.id === s.subject_id);
                return (
                  <Card key={s.id} className="glass">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${subj?.color ?? '#3b82f6'}20`, color: subj?.color ?? '#3b82f6' }}>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{subj?.name ?? 'General Study'}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(s.start_time)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{formatDuration(s.duration_seconds)}</Badge>
                          {s.focus_score > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-0.5">
                              <Zap className="h-3 w-3" /> {s.focus_score}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
