import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { FileBarChart, Download, FileText, Calendar, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { PageHeader, GlassCard, LoadingState, StatCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatDuration, formatDate } from '@/lib/utils';
import { calculateProductivityScore } from '@/lib/productivity';
import type { ReportType, Report } from '@/types';

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const { tasks, assignments, sessions, exams, subjects, loading, refresh } = useUserData(user?.id);
  const [generating, setGenerating] = useState<ReportType | null>(null);

  const reportData = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(); monthStart.setMonth(monthStart.getMonth() - 1);

    const periodStart = monthStart;
    const periodSessions = sessions.filter((s) => new Date(s.start_time) >= periodStart);
    const totalMinutes = periodSessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completedAssignments = assignments.filter((a) => a.status === 'completed').length;
    const upcomingExams = exams.filter((e) => new Date(e.exam_date) >= now);

    const score = calculateProductivityScore({
      studyMinutes: totalMinutes,
      dailyGoalMinutes: profile?.daily_goal_minutes ?? 120,
      tasksCompleted: completedTasks,
      tasksTotal: tasks.length,
      assignmentsCompleted: completedAssignments,
      assignmentsTotal: assignments.length,
      consistencyDays: 5,
      totalDays: 7,
      attendancePercentage: 85,
    });

    return { totalMinutes, completedTasks, completedAssignments, upcomingExams, score, periodStart, now };
  }, [tasks, assignments, sessions, exams, profile]);

  const generateReport = async (type: ReportType) => {
    setGenerating(type);
    const now = new Date();
    let start = new Date();
    if (type === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (type === 'weekly') start.setDate(start.getDate() - 7);
    if (type === 'monthly') start.setMonth(start.getMonth() - 1);

    const periodSessions = sessions.filter((s) => new Date(s.start_time) >= start);
    const totalMinutes = periodSessions.reduce((a, s) => a + Math.round(s.duration_seconds / 60), 0);
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completedAssignments = assignments.filter((a) => a.status === 'completed').length;

    const summary = `${type.charAt(0).toUpperCase() + type.slice(1)} Report: ${totalMinutes}min studied, ${completedTasks} tasks completed, ${completedAssignments} assignments done. Score: ${reportData.score}.`;

    const reportPayload = {
      studyMinutes: totalMinutes,
      completedTasks,
      completedAssignments,
      totalTasks: tasks.length,
      totalAssignments: assignments.length,
      score: reportData.score,
      subjectBreakdown: subjects.map((s) => {
        const subjSessions = periodSessions.filter((sess) => sess.subject_id === s.id);
        return { name: s.name, minutes: subjSessions.reduce((a, sess) => a + Math.round(sess.duration_seconds / 60), 0) };
      }),
    };

    const { error } = await supabase.from('reports').insert({
      user_id: user!.id,
      report_type: type,
      period_start: start.toISOString().split('T')[0],
      period_end: now.toISOString().split('T')[0],
      summary,
      data: reportPayload,
    });

    setGenerating(null);
    if (error) { toast.error('Failed to generate report'); return; }
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated`);
    refresh();

    // Generate PDF via print
    const pdfContent = generatePDFContent(type, start, now, reportPayload, profile?.full_name ?? 'Student');
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => { win.print(); };
    }
  };

  if (loading) return <LoadingState />;

  const reportTypes: { type: ReportType; label: string; description: string; icon: typeof FileText }[] = [
    { type: 'daily', label: 'Daily Report', description: 'Summary of today\'s activities', icon: FileText },
    { type: 'weekly', label: 'Weekly Report', description: '7-day productivity overview', icon: Calendar },
    { type: 'monthly', label: 'Monthly Report', description: '30-day comprehensive analysis', icon: FileBarChart },
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export productivity reports" />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total Study Time" value={formatDuration(reportData.totalMinutes * 60)} icon={<Clock className="h-6 w-6" />} color="blue" />
        <StatCard title="Tasks Completed" value={reportData.completedTasks} icon={<CheckCircle2 className="h-6 w-6" />} color="emerald" />
        <StatCard title="Productivity Score" value={reportData.score} icon={<TrendingUp className="h-6 w-6" />} color="purple" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {reportTypes.map((r) => (
          <Card key={r.type} className="glass transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{r.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => generateReport(r.type)}
                disabled={generating === r.type}
              >
                <Download className="mr-2 h-4 w-4" />
                {generating === r.type ? 'Generating...' : 'Generate & Export'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <GlassCard className="mt-6">
        <h3 className="mb-4 font-semibold">Recent Reports</h3>
        <RecentReports userId={user?.id} />
      </GlassCard>
    </div>
  );
}

function RecentReports({ userId }: { userId?: string }) {
  const { reports } = useReports(userId);
  if (reports.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No reports generated yet</p>;
  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
          <div className="flex items-center gap-3">
            <FileBarChart className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium capitalize">{r.report_type} Report</p>
              <p className="text-xs text-muted-foreground">{formatDate(r.period_start)} - {formatDate(r.period_end)}</p>
            </div>
          </div>
          <Badge variant="secondary">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Badge>
        </div>
      ))}
    </div>
  );
}


function useReports(userId?: string) {
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setReports((data as Report[]) ?? []));
  }, [userId]);
  return { reports };
}

function generatePDFContent(type: string, start: Date, end: Date, data: Record<string, unknown>, name: string): string {
  const subjectRows = Array.isArray(data.subjectBreakdown)
    ? (data.subjectBreakdown as Array<{ name: string; minutes: number }>).map((s) => `<tr><td>${s.name}</td><td>${formatDuration(s.minutes * 60)}</td></tr>`).join('')
    : '';

  return `<!DOCTYPE html><html><head><title>${type} Report</title>
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; }
    h1 { color: #3b82f6; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat { background: #f0f6ff; border-radius: 12px; padding: 16px; }
    .stat h3 { margin: 0; font-size: 14px; color: #64748b; }
    .stat p { margin: 8px 0 0; font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style></head><body>
    <div class="header">
      <h1>StudySync Pro - ${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
      <p>Student: ${name} | Period: ${formatDate(start)} - ${formatDate(end)}</p>
    </div>
    <div class="stats">
      <div class="stat"><h3>Study Time</h3><p>${formatDuration((data.studyMinutes as number) * 60)}</p></div>
      <div class="stat"><h3>Tasks Completed</h3><p>${data.completedTasks} / ${data.totalTasks}</p></div>
      <div class="stat"><h3>Productivity Score</h3><p>${data.score} / 100</p></div>
    </div>
    <h2>Subject Breakdown</h2>
    <table><thead><tr><th>Subject</th><th>Study Time</th></tr></thead><tbody>${subjectRows}</tbody></table>
    <div class="footer">Generated by StudySync Pro on ${new Date().toLocaleString()}</div>
  </body></html>`;
}
