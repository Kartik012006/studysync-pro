import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, Subject, Assignment, Exam, StudySession, NotificationItem, AnalyticsRow } from '@/types';

export function useUserData(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [t, s, a, e, ss, n, an] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('assignments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }),
      supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('analytics').select('*').eq('user_id', userId).order('date', { ascending: true }),
    ]);
    setTasks(t.data as Task[] ?? []);
    setSubjects(s.data as Subject[] ?? []);
    setAssignments(a.data as Assignment[] ?? []);
    setExams(e.data as Exam[] ?? []);
    setSessions(ss.data as StudySession[] ?? []);
    setNotifications(n.data as NotificationItem[] ?? []);
    setAnalytics(an.data as AnalyticsRow[] ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tasks, subjects, assignments, exams, sessions, notifications, analytics,
    loading, refresh: fetchAll,
    setTasks, setSubjects, setAssignments, setExams, setSessions, setNotifications,
  };
}
