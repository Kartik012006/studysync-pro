import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Palette, Bell, Target, Database, Trash2, Moon, Sun, LogOut, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader, GlassCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

type ProfileData = z.infer<typeof profileSchema>;

const goalSchema = z.object({
  daily_goal_minutes: z.coerce.number().min(0).max(1440),
  weekly_goal_minutes: z.coerce.number().min(0).max(10080),
});

type GoalData = z.infer<typeof goalSchema>;

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name ?? '', avatar_url: profile?.avatar_url ?? '' },
  });

  const goalForm = useForm<GoalData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      daily_goal_minutes: profile?.daily_goal_minutes ?? 120,
      weekly_goal_minutes: profile?.weekly_goal_minutes ?? 840,
    },
  });

  // Sync form when profile loads
  if (profile && profileForm.getValues('full_name') === '' && profile.full_name) {
    profileForm.reset({ full_name: profile.full_name, avatar_url: profile.avatar_url ?? '' });
    goalForm.reset({ daily_goal_minutes: profile.daily_goal_minutes, weekly_goal_minutes: profile.weekly_goal_minutes });
  }

  const onProfileSave = async (data: ProfileData) => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: data.full_name,
      avatar_url: data.avatar_url || null,
    }).eq('id', user!.id);
    setSaving(false);
    if (error) { toast.error('Failed to update profile'); return; }
    toast.success('Profile updated');
    refreshProfile();
  };

  const onGoalSave = async (data: GoalData) => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      daily_goal_minutes: data.daily_goal_minutes,
      weekly_goal_minutes: data.weekly_goal_minutes,
    }).eq('id', user!.id);
    setSaving(false);
    if (error) { toast.error('Failed to update goals'); return; }
    toast.success('Goals updated');
    refreshProfile();
  };

  const toggleNotifications = async (enabled: boolean) => {
    const { error } = await supabase.from('profiles').update({ notification_enabled: enabled }).eq('id', user!.id);
    if (error) { toast.error('Failed to update'); return; }
    refreshProfile();
  };

  const exportData = async () => {
    setExporting(true);
    const tables = ['tasks', 'subjects', 'assignments', 'exams', 'study_sessions', 'notifications', 'analytics', 'reports'];
    const exportObj: Record<string, unknown> = {};
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*').eq('user_id', user!.id);
      exportObj[t] = data;
    }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studysync-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success('Data exported');
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure? This will permanently delete all your data.')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', user!.id);
    if (error) { toast.error('Failed to delete account'); return; }
    await signOut();
    toast.success('Account deleted');
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-fit">
          <TabsTrigger value="profile"><User className="mr-1.5 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-4 w-4" /> Alerts</TabsTrigger>
          <TabsTrigger value="goals"><Target className="mr-1.5 h-4 w-4" /> Goals</TabsTrigger>
          <TabsTrigger value="data"><Database className="mr-1.5 h-4 w-4" /> Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <GlassCard className="max-w-lg">
            <h3 className="mb-4 font-semibold">Profile Information</h3>
            <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" {...profileForm.register('full_name')} />
                {profileForm.formState.errors.full_name && <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input id="avatar_url" type="url" placeholder="https://..." {...profileForm.register('avatar_url')} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled className="bg-muted/50" />
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="appearance">
          <GlassCard className="max-w-lg">
            <h3 className="mb-4 font-semibold">Theme</h3>
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notifications">
          <GlassCard className="max-w-lg">
            <h3 className="mb-4 font-semibold">Notification Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive task and exam reminders</p>
                  </div>
                </div>
                <Switch checked={profile?.notification_enabled ?? true} onCheckedChange={toggleNotifications} />
              </div>
              <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <p className="text-sm font-medium">Notification Types</p>
                {['Task Reminders', 'Assignment Deadlines', 'Exam Alerts', 'Study Session Reminders', 'Deadline Alerts'].map((n) => (
                  <div key={n} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{n}</span>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="goals">
          <GlassCard className="max-w-lg">
            <h3 className="mb-4 font-semibold">Study Goals</h3>
            <form onSubmit={goalForm.handleSubmit(onGoalSave)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily_goal_minutes">Daily Goal (minutes)</Label>
                <Input id="daily_goal_minutes" type="number" min={0} max={1440} {...goalForm.register('daily_goal_minutes')} />
                <p className="text-xs text-muted-foreground">Target study minutes per day</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly_goal_minutes">Weekly Goal (minutes)</Label>
                <Input id="weekly_goal_minutes" type="number" min={0} max={10080} {...goalForm.register('weekly_goal_minutes')} />
                <p className="text-xs text-muted-foreground">Target study minutes per week</p>
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Goals'}
              </Button>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="data">
          <div className="max-w-lg space-y-4">
            <GlassCard>
              <h3 className="mb-4 font-semibold">Data Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                  <div>
                    <p className="text-sm font-medium">Export Data</p>
                    <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
                  </div>
                  <Button variant="outline" onClick={exportData} disabled={exporting}>
                    <Database className="mr-2 h-4 w-4" /> {exporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                  <div>
                    <p className="text-sm font-medium">Sign Out</p>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                  <Button variant="outline" onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-red-50/30 dark:bg-red-950/10 p-4">
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete all your data</p>
                  </div>
                  <Button variant="destructive" onClick={deleteAccount}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
