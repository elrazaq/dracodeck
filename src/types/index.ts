export type ActivePanel = 'explorer' | 'terminal' | 'telemetry' | 'slayer' | 'settings';

export interface SystemStatus {
  branch: string;
  isDirty: boolean;
  activePorts: { port: number; label: string; active: boolean }[];
  localTime: string;
  platform: string;
}

