import { Router } from 'express';
import {
  downloadGoogleAdsExportScript,
  getGoogleAdsExportScriptInstallPage,
  getGoogleAdsExportScriptMeta,
} from '../controllers/integrationsController';

export const integrationsRouter = Router();

integrationsRouter.get('/google-ads-export-script', getGoogleAdsExportScriptMeta);
integrationsRouter.get('/google-ads-export-script/download', downloadGoogleAdsExportScript);
integrationsRouter.get('/google-ads-export-script/install', getGoogleAdsExportScriptInstallPage);
