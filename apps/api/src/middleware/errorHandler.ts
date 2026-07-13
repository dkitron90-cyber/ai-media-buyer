import type { NextFunction, Request, Response } from 'express';

// Basic production-ready error handler to extend later.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // TODO: plug in structured logging in a later phase.
  // eslint-disable-next-line no-console
  console.error('Unhandled error in API:', err);

  res.status(500).json({
    error: 'Internal Server Error',
  });
};

