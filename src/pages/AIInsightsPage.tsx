import { Sparkles, Brain, TrendingUp, Target, AlertTriangle, Lightbulb, Zap, Lock } from 'lucide-react';
import { PageHeader, GlassCard } from '@/components/shared';
import { Badge } from '@/components/ui/badge';

const insights = [
  {
    icon: Brain,
    title: 'Study Recommendations',
    description: 'AI-powered suggestions on what to study next based on your patterns, upcoming exams, and weak areas.',
    color: 'blue',
  },
  {
    icon: TrendingUp,
    title: 'Productivity Prediction',
    description: 'Predict your weekly productivity score based on current trends and historical data.',
    color: 'emerald',
  },
  {
    icon: Target,
    title: 'Weak Subject Detection',
    description: 'Automatically identify subjects where you need more focus time based on study patterns and performance.',
    color: 'amber',
  },
  {
    icon: Lightbulb,
    title: 'Focus Suggestions',
    description: 'Personalized recommendations for optimal study times and session lengths to maximize focus.',
    color: 'purple',
  },
  {
    icon: AlertTriangle,
    title: 'Deadline Risk Analysis',
    description: 'AI assessment of which assignments are at risk of missing deadlines, with mitigation suggestions.',
    color: 'red',
  },
  {
    icon: Zap,
    title: 'Smart Scheduling',
    description: 'Automatic scheduling of study sessions around your classes, exams, and personal preferences.',
    color: 'blue',
  },
];

export default function AIInsightsPage() {
  return (
    <div>
      <PageHeader title="AI Insights" description="Intelligent analysis and recommendations" />

      <GlassCard className="mb-6 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">AI Module - Coming Soon</h3>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Coming Soon</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              StudySync Pro is designed to work perfectly without AI. The AI module will be integrated in a future update
              without changing the existing architecture. All data is already being collected and structured to support
              these features when they arrive.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <GlassCard key={insight.title} className="relative overflow-hidden">
            <div className="absolute right-4 top-4">
              <Lock className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-${insight.color}-50 dark:bg-${insight.color}-950/40 text-${insight.color}-600`}>
              <insight.icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">{insight.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
            <div className="mt-4">
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
