import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">StudySync Pro</h1>
              <p className="text-xs text-blue-200">Productivity Intelligence Platform</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Master your time.<br />Ace your academics.
            </h2>
            <p className="text-lg text-blue-100 max-w-md">
              The intelligent productivity platform designed for B.Tech students.
              Track tasks, manage study sessions, and visualize your progress.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                { label: 'Study Hours', value: '24/7' },
                { label: 'Smart Analytics', value: 'Real-time' },
                { label: 'Task Manager', value: 'Full CRUD' },
                { label: 'ESP32 Ready', value: 'IoT' },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                  <p className="text-2xl font-bold">{f.value}</p>
                  <p className="text-sm text-blue-200">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-blue-200">© {new Date().getFullYear()} StudySync Pro. Final Year B.Tech IoT Project.</p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gradient-to-br from-blue-50/50 to-background p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">StudySync Pro</span>
            </Link>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
