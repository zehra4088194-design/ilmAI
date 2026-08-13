import 'server-only';
// @ts-expect-error -- node-zklib ships no type definitions.
import ZKLib from 'node-zklib';

export type BiometricPunchLog = {
  deviceUserId: string;
  recordTime: Date;
};

// Master prompt Part 8: talks to a ZKTeco K40/K50-class device over its LAN
// network SDK. Only the device's own numeric User_ID + punch timestamp are
// ever read — no fingerprint template or image crosses this boundary.
export async function fetchDevicePunchLogs(
  ip: string,
  port: number,
  timeoutMs = 10_000
): Promise<BiometricPunchLog[]> {
  const zk = new ZKLib(ip, port, timeoutMs, 4000);
  try {
    await zk.createSocket();
    const result = await zk.getAttendances();
    const records: any[] = result?.data || [];
    return records
      .filter((record) => record?.deviceUserId != null && record?.recordTime)
      .map((record) => ({
        deviceUserId: String(record.deviceUserId),
        recordTime: record.recordTime instanceof Date ? record.recordTime : new Date(record.recordTime),
      }));
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Best-effort — a failed disconnect must never mask the real sync error/result.
    }
  }
}
