import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, CheckCircle2, ListTodo, Timer, GraduationCap, FileText,
  TrendingUp, Plus, ArrowRight, BookOpen, Target,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { StatCard, GlassCard, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateProductivityScore, getScoreColor } from '@/lib/productivity';
import { formatDuration, formatDate, getGreeting, daysUntil, priorityColor } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { tasks, subjects, assignments, exams, sessions, loading } = useUserData(user?.id);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter((s) => s.start_time.startsWith(today));
    const studyMinutesToday = todaySessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
    const focusMinutesToday = todaySessions.reduce((a, s) => a + Math.round((s.duration_seconds * (s.focus_score || 50)) / 6000), 0);
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    const overdueTasks = tasks.filter((t) => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')).length;

    const upcomingExams = exams.filter((e) => new Date(e.exam_date) >= new Date()).slice(0, 5);
    const upcomingAssignments = assignments
      .filter((a) => a.status !== 'completed' && a.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter((s) => s.start_time.startsWith(dateStr));
      const dayMinutes = daySessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
      const dayTasksCompleted = tasks.filter((t) => t.status === 'completed').length;
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        studyHours: Math.round((dayMinutes / 60) * 10) / 10,
        tasks: dayTasksCompleted,
      };
    });

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter((s) => s.start_time.startsWith(dateStr));
      const dayMinutes = daySessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
      return {
        day: d.getDate().toString(),
        studyHours: Math.round((dayMinutes / 60) * 10) / 10,
      };
    });

    const score = calculateProductivityScore({
      studyMinutes: studyMinutesToday,
      dailyGoalMinutes: profile?.daily_goal_minutes ?? 120,
      tasksCompleted: completedTasks,
      tasksTotal: tasks.length,
      assignmentsCompleted: assignments.filter((a) => a.status === 'completed').length,
      assignmentsTotal: assignments.length,
      consistencyDays: 5,
      totalDays: 7,
      attendancePercentage: 85,
    });

    return {
      studyMinutesToday, focusMinutesToday, completedTasks, pendingTasks, overdueTasks,
      upcomingExams, upcomingAssignments, last7Days, last30Days, score,
    };
  }, [tasks, subjects, assignments, exams, sessions, profile]);

  const scoreColor = getScoreColor(stats.score);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${getGreeting()}, ${profile?.full_name?.split(' ')[0] ?? 'Student'}!`}
        description={now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        action={
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/app/study-session"><Timer className="mr-2 h-4 w-4" /> Start Session</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/tasks"><Plus className="mr-2 h-4 w-4" /> New Task</Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-mono tabular-nums">{now.toLocaleTimeString('en-US')}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Productivity Score" value={stats.score} icon={<Target className="h-6 w-6" />} color={stats.score >= 50 ? 'emerald' : 'amber'} />
        <StatCard title="Focus Time Today" value={formatDuration(stats.focusMinutesToday * 60)} icon={<Clock className="h-6 w-6" />} color="blue" />
        <StatCard title="Study Hours Today" value={`${(stats.studyMinutesToday / 60).toFixed(1)}h`} icon={<BookOpen className="h-6 w-6" />} color="purple" />
        <StatCard title="Tasks Completed" value={stats.completedTasks} icon={<CheckCircle2 className="h-6 w-6" />} color="emerald" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Tasks" value={stats.pendingTasks} icon={<ListTodo className="h-6 w-6" />} color="amber" />
        <StatCard title="Overdue Tasks" value={stats.overdueTasks} icon={<TrendingUp className="h-6 w-6" />} color="red" />
        <StatCard title="Upcoming Exams" value={stats.upcomingExams.length} icon={<GraduationCap className="h-6 w-6" />} color="red" />
        <StatCard title="Pending Assignments" value={stats.upcomingAssignments.length} icon={<FileText className="h-6 w-6" />} color="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Weekly Progress</h3>
              <p className="text-xs text-muted-foreground">Study hours and task completion</p>
            </div>
            <Badge variant="secondary">Last 7 days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.last7Days}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              <Area type="monotone" dataKey="studyHours" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#studyGrad)" name="Study Hours" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <div className="mb-4">
            <h3 className="font-semibold">Productivity Score</h3>
            <p className="text-xs text-muted-foreground">Based on multiple factors</p>
          </div>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'score', value: stats.score, fill: `hsl(${stats.score >= 75 ? '142 71% 45%' : stats.score >= 50 ? '38 92% 50%' : '0 84% 60%'})` }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{stats.score}</span>
              <span className={`text-sm font-medium ${scoreColor.text}`}>{scoreColor.label}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Monthly Study Hours</h3>
            <Badge variant="secondary">Last 30 days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.last30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              <Bar dataKey="studyHours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Study Hours" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Exams</CardTitle>
                <Link to="/app/exams" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming exams</p>
              ) : stats.upcomingExams.map((exam) => {
                const days = daysUntil(exam.exam_date);
                const subj = subjects.find((s) => s.id === exam.subject_id);
                return (
                  <div key={exam.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${subj?.color ?? '#3b82f6'}20`, color: subj?.color ?? '#3b82f6' }}>
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{exam.name}</p>
                        <p className="text-xs text-muted-foreground">{subj?.name ?? 'No subject'} · {formatDate(exam.exam_date)}</p>
                      </div>
                    </div>
                    <Badge variant={days <= 3 ? 'destructive' : 'secondary'}>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Assignments</CardTitle>
                <Link to="/app/assignments" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.upcomingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending assignments</p>
              ) : stats.upcomingAssignments.map((a) => {
                const days = a.due_date ? daysUntil(a.due_date) : 0;
                const subj = subjects.find((s) => s.id === a.subject_id);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${subj?.color ?? '#3b82f6'}20`, color: subj?.color ?? '#3b82f6' }}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{subj?.name ?? 'No subject'} · {formatDate(a.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${priorityColor(a.priority)}`}>{a.priority}</span>
                      <Badge variant={days <= 1 ? 'destructive' : 'secondary'}>{days <= 0 ? 'Today' : `${days}d`}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'New Task', icon: ListTodo, to: '/app/tasks', color: 'blue' },
            { label: 'New Assignment', icon: FileText, to: '/app/assignments', color: 'emerald' },
            { label: 'Add Exam', icon: GraduationCap, to: '/app/exams', color: 'amber' },
            { label: 'Study Session', icon: Timer, to: '/app/study-session', color: 'purple' },
          ].map((a) => (
            <Link key={a.label} to={a.to}>
              <Card className="glass group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${a.color}-50 dark:bg-${a.color}-950/40 text-${a.color}-600`}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{a.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
