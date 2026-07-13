import type { Request, Response, NextFunction } from 'express';
import { analyzeLandingPageUrl } from '../services/landingPageAnalyzerService';

export const postAnalyzeLandingPageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const url = (req.body as { url?: unknown })?.url;
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "url" is required (non-empty string).',
      });
    }
    const result = await analyzeLandingPageUrl(url);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.';
    return res.status(400).json({ error: message });
  }
};
