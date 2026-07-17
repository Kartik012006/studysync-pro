import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(date: string | Date | null): string {
  if (!date) return 'No date';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return 'No date';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 dark:bg-red-950/40';
    case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40';
    case 'low': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40';
    case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/40';
    case 'overdue': return 'text-red-600 bg-red-50 dark:bg-red-950/40';
    case 'pending': return 'text-muted-foreground bg-muted';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
