/**
 * Placeholder ESP32 device API functions.
 * These will be replaced with real REST/MQTT calls in the future.
 * The function signatures are stable so callers don't change.
 */

export interface ESP32Device {
  deviceName: string;
  wifiStatus: string;
  firmwareVersion: string;
  batteryLevel: number;
  connectionStatus: string;
  lastSyncAt: string | null;
}

export async function connectDevice(): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 800));
  return { success: true, message: 'Device connection request sent.' };
}

export async function disconnectDevice(): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true, message: 'Device disconnected.' };
}

export async function syncData(): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 1000));
  return { success: true, message: 'Data sync completed.' };
}

/** Placeholder for future study-session sync with ESP32 */
export async function startSessionOnDevice(subjectId: string | null): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 600));
  return { success: true, message: `Session start signal sent for subject ${subjectId ?? 'general'}.` };
}

export async function stopSessionOnDevice(sessionId: string): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 600));
  return { success: true, message: `Session stop signal sent for session ${sessionId}.` };
}

export async function syncSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 800));
  return { success: true, message: `Session ${sessionId} synced.` };
}
