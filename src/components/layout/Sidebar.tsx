import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, BookOpen, FileText, GraduationCap,
  Timer, BarChart3, Calendar, FileBarChart, Cpu, Sparkles, Settings, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/app/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/app/assignments', label: 'Assignments', icon: FileText },
  { to: '/app/exams', label: 'Exams', icon: GraduationCap },
  { to: '/app/study-session', label: 'Study Session', icon: Timer },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart },
  { to: '/app/device', label: 'ESP32 Device', icon: Cpu },
  { to: '/app/ai-insights', label: 'AI Insights', icon: Sparkles },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col glass-strong border-r border-border/50">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">StudySync Pro</h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Productivity Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/50 p-3">
        <NavLink
          to="/app/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )
          }
        >
          <Settings className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          Settings
        </NavLink>
        {profile && (
          <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
              {(profile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{profile.full_name || 'Student'}</p>
              <p className="truncate text-[10px] text-muted-foreground">B.Tech Student</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full animate-slide-in-right">
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border/50 glass-strong px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-lg p-2 hover:bg-accent transition-colors"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <NavLink to="/app/notifications" className="relative rounded-lg p-2 hover:bg-accent transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
      </NavLink>
    </header>
  );
}
