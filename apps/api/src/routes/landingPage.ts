import { Router } from 'express';
import { postAnalyzeLandingPageHandler } from '../controllers/landingPageController';

export const landingPageRouter = Router();

landingPageRouter.post('/analyze', postAnalyzeLandingPageHandler);
