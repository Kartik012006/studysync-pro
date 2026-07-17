import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { Clock, CheckCircle2, FileText, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, GlassCard, StatCard, LoadingState } from '@/components/shared';
import { cn } from '@/lib/utils';
import { calculateProductivityScore, getScoreColor } from '@/lib/productivity';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const { tasks, assignments, sessions, subjects, loading } = useUserData(user?.id);
  const [period, setPeriod] = useState<Period>('weekly');

  const data = useMemo(() => {
    const now = new Date();
    let days = 7;
    if (period === 'daily') days = 1;
    if (period === 'weekly') days = 7;
    if (period === 'monthly') days = 30;
    if (period === 'yearly') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const periodSessions = sessions.filter((s) => new Date(s.start_time) >= startDate);
    const totalStudyMinutes = periodSessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
    const totalFocusMinutes = periodSessions.reduce((a, s) => a + Math.round((s.duration_seconds * (s.focus_score || 50)) / 6000), 0);

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completedAssignments = assignments.filter((a) => a.status === 'completed').length;

    // Study hours chart data
    const chartData = Array.from({ length: period === 'daily' ? 24 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 12 }, (_, i) => {
      if (period === 'yearly') {
        const monthDate = new Date(now.getFullYear(), i, 1);
        const nextMonth = new Date(now.getFullYear(), i + 1, 1);
        const monthSessions = sessions.filter((s) => {
          const d = new Date(s.start_time);
          return d >= monthDate && d < nextMonth;
        });
        const minutes = monthSessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
        return {
          label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          studyHours: Math.round((minutes / 60) * 10) / 10,
          focusHours: Math.round((monthSessions.reduce((a, s) => a + (s.duration_seconds * (s.focus_score || 50)) / 6000, 0) / 60) * 10) / 10,
        };
      }
      if (period === 'daily') {
        const hour = i;
        const hourSessions = sessions.filter((s) => {
          const d = new Date(s.start_time);
          return d.toDateString() === now.toDateString() && d.getHours() === hour;
        });
        const minutes = hourSessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
        return { label: `${hour}:00`, studyHours: Math.round((minutes / 60) * 10) / 10, focusHours: 0 };
      }
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter((s) => s.start_time.startsWith(dateStr));
      const minutes = daySessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
      const focusMin = daySessions.reduce((a, s) => a + Math.round((s.duration_seconds * (s.focus_score || 50)) / 6000), 0);
      return {
        label: d.toLocaleDateString('en-US', period === 'weekly' ? { weekday: 'short' } : { day: 'numeric' }),
        studyHours: Math.round((minutes / 60) * 10) / 10,
        focusHours: Math.round((focusMin / 60) * 10) / 10,
      };
    });

    // Subject-wise study time
    const subjectData = subjects.map((s) => {
      const subjSessions = periodSessions.filter((sess) => sess.subject_id === s.id);
      const minutes = subjSessions.reduce((a, sess) => a + Math.round(sess.duration_seconds / 60), 0);
      return { name: s.name, value: Math.round((minutes / 60) * 10) / 10, color: s.color };
    }).filter((d) => d.value > 0);

    // Task completion data
    const taskCompletion = [
      { name: 'Completed', value: completedTasks, fill: 'hsl(142 71% 45%)' },
      { name: 'Pending', value: tasks.filter((t) => t.status === 'pending').length, fill: 'hsl(38 92% 50%)' },
      { name: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, fill: 'hsl(217 91% 60%)' },
      { name: 'Overdue', value: tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length, fill: 'hsl(0 84% 60%)' },
    ];

    // Assignment completion
    const assignmentCompletion = [
      { name: 'Completed', value: completedAssignments, fill: 'hsl(142 71% 45%)' },
      { name: 'Pending', value: assignments.filter((a) => a.status === 'pending').length, fill: 'hsl(38 92% 50%)' },
      { name: 'In Progress', value: assignments.filter((a) => a.status === 'in_progress').length, fill: 'hsl(217 91% 60%)' },
    ];

    const score = calculateProductivityScore({
      studyMinutes: totalStudyMinutes,
      dailyGoalMinutes: profile?.daily_goal_minutes ?? 120,
      tasksCompleted: completedTasks,
      tasksTotal: tasks.length,
      assignmentsCompleted: completedAssignments,
      assignmentsTotal: assignments.length,
      consistencyDays: 5,
      totalDays: 7,
      attendancePercentage: 85,
    });

    return {
      totalStudyMinutes, totalFocusMinutes, completedTasks, completedAssignments,
      chartData, subjectData, taskCompletion, assignmentCompletion, score,
    };
  }, [tasks, assignments, sessions, subjects, period, profile]);

  if (loading) return <LoadingState />;

  const periods: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];
  const scoreColor = getScoreColor(data.score);

  return (
    <div>
      <PageHeader title="Productivity Analytics" description="Deep insights into your study patterns" />

      <div className="mb-6 flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
              period === p ? 'bg-primary text-primary-foreground shadow-md' : 'glass hover:bg-accent'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Study Time" value={`${(data.totalStudyMinutes / 60).toFixed(1)}h`} icon={<Clock className="h-6 w-6" />} color="blue" />
        <StatCard title="Focus Time" value={`${(data.totalFocusMinutes / 60).toFixed(1)}h`} icon={<Zap className="h-6 w-6" />} color="purple" />
        <StatCard title="Tasks Done" value={data.completedTasks} icon={<CheckCircle2 className="h-6 w-6" />} color="emerald" />
        <StatCard title="Assignments Done" value={data.completedAssignments} icon={<FileText className="h-6 w-6" />} color="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Study & Focus Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.chartData}>
              <defs>
                <linearGradient id="studyG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="focusG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              <Legend />
              <Area type="monotone" dataKey="studyHours" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#studyG)" name="Study Hours" />
              <Area type="monotone" dataKey="focusHours" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#focusG)" name="Focus Hours" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Productivity Score</h3>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'score', value: data.score, fill: `hsl(${data.score >= 75 ? '142 71% 45%' : data.score >= 50 ? '38 92% 50%' : '0 84% 60%'})` }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{data.score}</span>
              <span className={`text-sm font-medium ${scoreColor.text}`}>{scoreColor.label}</span>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Study Time (30%)</span><span className="font-medium">{Math.round(data.totalStudyMinutes / (profile?.daily_goal_minutes ?? 120) * 100)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Task Completion (25%)</span><span className="font-medium">{tasks.length > 0 ? Math.round(data.completedTasks / tasks.length * 100) : 0}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Assignments (20%)</span><span className="font-medium">{assignments.length > 0 ? Math.round(data.completedAssignments / assignments.length * 100) : 0}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Consistency (15%)</span><span className="font-medium">71%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Attendance (10%)</span><span className="font-medium">85%</span></div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <h3 className="mb-4 font-semibold">Subject-wise Study Time</h3>
          {data.subjectData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No study data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={(e) => `${e.name}: ${e.value}h`}>
                  {data.subjectData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Task Completion</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.taskCompletion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {data.taskCompletion.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Assignment Completion</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.assignmentCompletion} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                {data.assignmentCompletion.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="mt-4">
        <h3 className="mb-4 font-semibold">Attendance Overview</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">85%</p>
            <p className="text-sm text-muted-foreground">Overall attendance (manual entry)</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">42</p>
              <p className="text-xs text-muted-foreground">Classes Attended</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">7</p>
              <p className="text-xs text-muted-foreground">Classes Missed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">49</p>
              <p className="text-xs text-muted-foreground">Total Classes</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
