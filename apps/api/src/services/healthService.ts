export interface HealthStatus {
  status: 'ok';
  service: 'ai-media-buyer-api';
  timestamp: string;
  mode: 'demo' | 'standard';
}

export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  service: 'ai-media-buyer-api',
  timestamp: new Date().toISOString(),
  mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'standard',
});

