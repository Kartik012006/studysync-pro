export interface ProductivityInput {
  studyMinutes: number;
  dailyGoalMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  consistencyDays: number;
  totalDays: number;
  attendancePercentage: number;
}

/**
 * Calculates a productivity score from 0-100.
 * Isolated so it can be replaced later (e.g. with AI-based calculation).
 */
export function calculateProductivityScore(input: ProductivityInput): number {
  const studyScore = input.dailyGoalMinutes > 0
    ? Math.min(input.studyMinutes / input.dailyGoalMinutes, 1)
    : 0;

  const taskScore = input.tasksTotal > 0
    ? input.tasksCompleted / input.tasksTotal
    : 0;

  const assignmentScore = input.assignmentsTotal > 0
    ? input.assignmentsCompleted / input.assignmentsTotal
    : 0;

  const consistencyScore = input.totalDays > 0
    ? input.consistencyDays / input.totalDays
    : 0;

  const attendanceScore = input.attendancePercentage / 100;

  const weighted =
    studyScore * 0.30 +
    taskScore * 0.25 +
    assignmentScore * 0.20 +
    consistencyScore * 0.15 +
    attendanceScore * 0.10;

  return Math.round(weighted * 100);
}

export function getScoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Excellent' };
  if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Good' };
  if (score >= 25) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Fair' };
  return { bg: 'bg-red-500', text: 'text-red-600', label: 'Needs Focus' };
}
