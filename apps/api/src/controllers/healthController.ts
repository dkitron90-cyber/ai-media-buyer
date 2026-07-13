import type { Request, Response } from 'express';
import { getHealthStatus } from '../services/healthService';

export const getHealth = (_req: Request, res: Response): void => {
  const payload = getHealthStatus();
  res.status(200).json(payload);
};

