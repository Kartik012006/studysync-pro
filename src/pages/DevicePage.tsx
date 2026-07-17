import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Cpu, Wifi, WifiOff, Battery, RefreshCw, Bluetooth, Radio, Zap, Activity,
  CheckCircle2, XCircle, Clock, Download, Upload,
} from 'lucide-react';
import { PageHeader, GlassCard, StatCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { connectDevice, disconnectDevice, syncData } from '@/lib/esp32';
import { formatDateTime } from '@/lib/utils';
import type { DeviceStatus } from '@/types';

export default function DevicePage() {
  const { user } = useAuth();
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDevice = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('device_status').select('*').eq('user_id', user.id).maybeSingle();
    if (error) { setLoading(false); return; }
    if (data) {
      setDevice(data as DeviceStatus);
    } else {
      const { data: newDevice } = await supabase.from('device_status').insert({
        user_id: user.id,
        device_name: 'ESP32 StudySync',
      }).select().maybeSingle();
      if (newDevice) setDevice(newDevice as DeviceStatus);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDevice(); }, [user]);

  const handleConnect = async () => {
    setConnecting(true);
    const result = await connectDevice();
    setConnecting(false);
    if (result.success && device) {
      const { data, error } = await supabase.from('device_status').update({
        connection_status: 'connected',
        wifi_status: 'connected',
        battery_level: 85,
        last_sync_at: new Date().toISOString(),
      }).eq('id', device.id).select().maybeSingle();
      if (!error && data) setDevice(data as DeviceStatus);
      toast.success(result.message);
    }
  };

  const handleDisconnect = async () => {
    const result = await disconnectDevice();
    if (result.success && device) {
      const { data, error } = await supabase.from('device_status').update({
        connection_status: 'disconnected',
        wifi_status: 'disconnected',
      }).eq('id', device.id).select().maybeSingle();
      if (!error && data) setDevice(data as DeviceStatus);
      toast.success(result.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncData();
    setSyncing(false);
    if (result.success && device) {
      const { data, error } = await supabase.from('device_status').update({
        last_sync_at: new Date().toISOString(),
      }).eq('id', device.id).select().maybeSingle();
      if (!error && data) setDevice(data as DeviceStatus);
      toast.success(result.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isConnected = device?.connection_status === 'connected';

  return (
    <div>
      <PageHeader title="ESP32 Device" description="Manage your IoT study companion" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Connection"
          value={isConnected ? 'Connected' : 'Disconnected'}
          icon={isConnected ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          color={isConnected ? 'emerald' : 'red'}
        />
        <StatCard title="WiFi Status" value={device?.wifi_status ?? 'Unknown'} icon={<Radio className="h-6 w-6" />} color="blue" />
        <StatCard title="Battery" value={`${device?.battery_level ?? 0}%`} icon={<Battery className="h-6 w-6" />} color="amber" />
        <StatCard title="Firmware" value={device?.firmware_version ?? '1.0.0'} icon={<Cpu className="h-6 w-6" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isConnected ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-600'}`}>
                <Cpu className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{device?.device_name ?? 'ESP32 StudySync'}</h3>
                <p className="text-sm text-muted-foreground">IoT Study Companion</p>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'} className={isConnected ? 'bg-emerald-600' : ''}>
              {isConnected ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
              {isConnected ? 'Online' : 'Offline'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-muted-foreground">Battery Level</span>
                <span className="font-medium">{device?.battery_level ?? 0}%</span>
              </div>
              <Progress value={device?.battery_level ?? 0} className="h-2" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={<Wifi className="h-4 w-4" />} label="WiFi Status" value={device?.wifi_status ?? 'disconnected'} />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="Firmware" value={device?.firmware_version ?? '1.0.0'} />
              <InfoRow icon={<Activity className="h-4 w-4" />} label="Connection" value={device?.connection_status ?? 'disconnected'} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Last Sync" value={device?.last_sync_at ? formatDateTime(device.last_sync_at) : 'Never'} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
                {connecting ? 'Connecting...' : 'Connect Device'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleDisconnect}>
                <WifiOff className="mr-2 h-4 w-4" /> Disconnect
              </Button>
            )}
            <Button variant="outline" onClick={handleSync} disabled={syncing || !isConnected}>
              {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Future Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Radio, label: 'MQTT Protocol', status: 'Planned' },
                { icon: Download, label: 'REST API', status: 'Planned' },
                { icon: Bluetooth, label: 'BLE', status: 'Planned' },
                { icon: Zap, label: 'RFID Sensor', status: 'Planned' },
                { icon: Activity, label: 'Fingerprint Sensor', status: 'Planned' },
                { icon: Cpu, label: 'Edge AI', status: 'Planned' },
                { icon: Upload, label: 'Wearable Sensors', status: 'Planned' },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <f.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{f.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">Planned</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
