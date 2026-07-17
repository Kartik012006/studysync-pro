export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type NotificationType = 'task' | 'assignment' | 'exam' | 'session' | 'deadline' | 'general';
export type ReportType = 'daily' | 'weekly' | 'monthly';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
  theme: 'light' | 'dark';
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  target_hours_per_week: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  subject_id: string | null;
  due_date: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  name: string;
  subject_id: string | null;
  due_date: string | null;
  priority: Priority;
  status: AssignmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  name: string;
  subject_id: string | null;
  exam_date: string;
  exam_time: string;
  room: string;
  notes: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  focus_score: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface DeviceStatus {
  id: string;
  user_id: string;
  device_name: string;
  wifi_status: string;
  firmware_version: string;
  battery_level: number;
  connection_status: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsRow {
  id: string;
  user_id: string;
  date: string;
  study_minutes: number;
  focus_minutes: number;
  tasks_completed: number;
  tasks_total: number;
  assignments_completed: number;
  assignments_total: number;
  attendance_percentage: number;
  productivity_score: number;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  summary: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
  extendedProps?: {
    type: 'task' | 'assignment' | 'exam' | 'session';
    [key: string]: unknown;
  };
}
