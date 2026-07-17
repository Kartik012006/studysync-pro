import { useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PageHeader, LoadingState } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import type { CalendarEvent } from '@/types';

export default function CalendarPage() {
  const { user } = useAuth();
  const { tasks, assignments, exams, sessions, subjects, loading } = useUserData(user?.id);
  const calendarRef = useRef<FullCalendar>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    const taskEvents: CalendarEvent[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      title: `Task: ${t.title}`,
      start: t.due_date ?? t.created_at,
      color: '#3b82f6',
      extendedProps: { type: 'task' as const },
    }));

    const assignmentEvents: CalendarEvent[] = assignments.map((a) => ({
      id: `assignment-${a.id}`,
      title: `Assignment: ${a.name}`,
      start: a.due_date ?? a.created_at,
      color: '#10b981',
      extendedProps: { type: 'assignment' as const },
    }));

    const examEvents: CalendarEvent[] = exams.map((e) => ({
      id: `exam-${e.id}`,
      title: `Exam: ${e.name}`,
      start: e.exam_date,
      color: '#ef4444',
      extendedProps: { type: 'exam' as const },
    }));

    const sessionEvents: CalendarEvent[] = sessions.map((s) => ({
      id: `session-${s.id}`,
      title: `Study: ${subjects.find((sub) => sub.id === s.subject_id)?.name ?? 'General'}`,
      start: s.start_time,
      end: s.end_time ?? undefined,
      color: '#8b5cf6',
      extendedProps: { type: 'session' as const },
    }));

    return [...taskEvents, ...assignmentEvents, ...examEvents, ...sessionEvents];
  }, [tasks, assignments, exams, sessions, subjects]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Calendar" description="View your tasks, assignments, exams, and study sessions" />

      <div className="mb-4 flex flex-wrap gap-4">
        {[
          { label: 'Tasks', color: '#3b82f6' },
          { label: 'Assignments', color: '#10b981' },
          { label: 'Exams', color: '#ef4444' },
          { label: 'Study Sessions', color: '#8b5cf6' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
            <span className="text-sm text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          events={events as never}
          editable={false}
          selectable={false}
          dayMaxEvents={3}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
        />
      </div>
    </div>
  );
}
