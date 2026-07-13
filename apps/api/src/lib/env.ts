import './serverlessBootstrap';

import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  demoMode: boolean;
}

export const config: AppConfig = {
  port: Number(getEnv('PORT', '4000')),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  databaseUrl: getEnv('DATABASE_URL', 'file:./dev.db'),
  demoMode: getEnv('DEMO_MODE', 'false') === 'true',
};
