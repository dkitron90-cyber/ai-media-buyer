import { Router } from 'express';
import {
  createCampaignHandler,
  getCampaignByIdHandler,
  listCampaignsHandler,
  patchCampaignByIdHandler,
  deleteCampaignByIdHandler,
} from '../controllers/campaignController';
import {
  getCampaignSettingsHandler,
  patchCampaignSettingsHandler,
} from '../controllers/campaignSettingsController';
import {
  createCampaignGoalHandler,
  listCampaignGoalsHandler,
  patchCampaignGoalHandler,
  deleteCampaignGoalHandler,
} from '../controllers/campaignGoalController';
import {
  createCampaignNoteHandler,
  listCampaignNotesHandler,
  patchCampaignNoteHandler,
  deleteCampaignNoteHandler,
} from '../controllers/campaignNoteController';
import {
  createCampaignEventHandler,
  listCampaignEventsHandler,
} from '../controllers/campaignEventController';
import {
  activeReportsHandler,
  campaignReportStatusHandler,
  listCampaignReportsHandler,
  uploadCampaignReportHandler,
  deleteCampaignReportHandler,
} from '../controllers/reportController';
import {
  getCampaignAnalysisReadinessHandler,
  getCampaignSummaryHandler,
} from '../controllers/analysisController';
import {
  analyzeCampaignHandler,
  aiAnalyzeCampaignHandler,
  getCampaignAiContextDebugHandler,
  listCampaignAnalysesHandler,
  getCampaignAnalysisByIdHandler,
  deleteCampaignAnalysisHandler,
} from '../controllers/campaignAnalysisController';
import {
  listActionsHandler,
  getActionByIdHandler,
  createActionHandler,
  patchActionHandler,
  createActionsFromAnalysisHandler,
  deleteActionHandler,
} from '../controllers/actionPlanController';
import {
  captureActionImpactHandler,
  getActionImpactHandler,
} from '../controllers/actionImpactController';
import { getDataWindowHandler } from '../controllers/dataWindowController';
import { getCampaignGapsHandler } from '../controllers/gapDetectionController';
import { getCampaignDecisionEngineHandler } from '../controllers/decisionEngineController';
import { getCampaignDecisionSummaryHandler } from '../controllers/decisionSummaryController';
import { getNextBestActionHandler } from '../controllers/nextBestActionController';
import { getCampaignAnalysisStatusHandler } from '../controllers/analysisStatusController';
import {
  getCampaignChecklistHandler,
  patchCampaignChecklistItemHandler,
} from '../controllers/campaignChecklistController';
import {
  listPlacementsHandler,
  listBlacklistHandler,
  listWhitelistHandler,
  createPlacementHandler,
  patchPlacementHandler,
  deletePlacementHandler,
} from '../controllers/placementListController';
import {
  createPlacementsFromAnalysisHandler,
  executeActionHandler,
} from '../controllers/placementExecutionController';
import {
  getAdvisorChatMessagesHandler,
  postAdvisorChatHandler,
} from '../controllers/advisorChatController';
import { getCampaignPlaybookHandler } from '../controllers/playbookController';
import { reportUpload } from '../middleware/reportUpload';

export const campaignsRouter = Router();

campaignsRouter.post('/', createCampaignHandler);
campaignsRouter.get('/', listCampaignsHandler);
campaignsRouter.get('/:id/settings', getCampaignSettingsHandler);
campaignsRouter.patch('/:id/settings', patchCampaignSettingsHandler);
campaignsRouter.get('/:id', getCampaignByIdHandler);
campaignsRouter.patch('/:id', patchCampaignByIdHandler);
campaignsRouter.delete('/:id', deleteCampaignByIdHandler);

// Goals
campaignsRouter.post('/:id/goals', createCampaignGoalHandler);
campaignsRouter.get('/:id/goals', listCampaignGoalsHandler);
campaignsRouter.patch('/:id/goals/:goalId', patchCampaignGoalHandler);
campaignsRouter.delete('/:id/goals/:goalId', deleteCampaignGoalHandler);

// Notes
campaignsRouter.post('/:id/notes', createCampaignNoteHandler);
campaignsRouter.get('/:id/notes', listCampaignNotesHandler);
campaignsRouter.patch('/:id/notes/:noteId', patchCampaignNoteHandler);
campaignsRouter.delete('/:id/notes/:noteId', deleteCampaignNoteHandler);

// Events / timeline
campaignsRouter.post('/:id/events', createCampaignEventHandler);
campaignsRouter.get('/:id/events', listCampaignEventsHandler);

// Reports
campaignsRouter.post(
  '/:id/reports',
  reportUpload.single('file'),
  uploadCampaignReportHandler
);
campaignsRouter.get('/:id/reports', listCampaignReportsHandler);
campaignsRouter.get('/:id/reports/status', campaignReportStatusHandler);
campaignsRouter.get('/:id/reports/active', activeReportsHandler);
campaignsRouter.delete('/:id/reports/:reportId', deleteCampaignReportHandler);

// Data window
campaignsRouter.get('/:id/data-window', getDataWindowHandler);

// Gaps / auto gap detection
campaignsRouter.get('/:id/gaps', getCampaignGapsHandler);

// Checklist progress
campaignsRouter.get('/:id/checklist', getCampaignChecklistHandler);
campaignsRouter.patch('/:id/checklist/:itemId', patchCampaignChecklistItemHandler);

// Unified decision engine
campaignsRouter.get('/:id/decision-engine', getCampaignDecisionEngineHandler);

// Compact decision summary (primary issue, focus, money estimates, next step)
campaignsRouter.get('/:id/decision-summary', getCampaignDecisionSummaryHandler);

// Auto playbook (P0/P1/P2 action plan — no chat)
campaignsRouter.get('/:id/playbook', getCampaignPlaybookHandler);

// Follow-up advisor chat (OpenAI, context-grounded)
campaignsRouter.get('/:id/advisor-chat', getAdvisorChatMessagesHandler);
campaignsRouter.post('/:id/advisor-chat', postAdvisorChatHandler);

// Next best action engine
campaignsRouter.get('/:id/next-best-action', getNextBestActionHandler);

// Analysis freshness / auto refresh status
campaignsRouter.get('/:id/analysis-status', getCampaignAnalysisStatusHandler);

// Analysis
campaignsRouter.get('/:id/analysis-readiness', getCampaignAnalysisReadinessHandler);
campaignsRouter.get('/:id/summary', getCampaignSummaryHandler);
campaignsRouter.post('/:id/analyze', analyzeCampaignHandler);
campaignsRouter.post('/:id/ai-analyze', aiAnalyzeCampaignHandler);
campaignsRouter.get('/:id/ai-context-debug', getCampaignAiContextDebugHandler);

// Analysis history
campaignsRouter.get('/:id/analyses', listCampaignAnalysesHandler);
campaignsRouter.get('/:id/analyses/:analysisId', getCampaignAnalysisByIdHandler);
campaignsRouter.delete('/:id/analyses/:analysisId', deleteCampaignAnalysisHandler);

// Create action plan items from a saved analysis
campaignsRouter.post('/:id/analyses/:analysisId/actions', createActionsFromAnalysisHandler);

// Action plan
campaignsRouter.get('/:id/actions', listActionsHandler);
campaignsRouter.post('/:id/actions', createActionHandler);
campaignsRouter.get('/:id/actions/:actionId', getActionByIdHandler);
campaignsRouter.patch('/:id/actions/:actionId', patchActionHandler);
campaignsRouter.delete('/:id/actions/:actionId', deleteActionHandler);
campaignsRouter.post('/:id/actions/:actionId/execute', executeActionHandler);
campaignsRouter.post('/:id/actions/:actionId/capture-impact', captureActionImpactHandler);
campaignsRouter.get('/:id/actions/:actionId/impact', getActionImpactHandler);

// Placement blacklist / whitelist
campaignsRouter.post('/:id/placements/from-analysis', createPlacementsFromAnalysisHandler);
campaignsRouter.get('/:id/placements/blacklist', listBlacklistHandler);
campaignsRouter.get('/:id/placements/whitelist', listWhitelistHandler);
campaignsRouter.get('/:id/placements', listPlacementsHandler);
campaignsRouter.post('/:id/placements', createPlacementHandler);
campaignsRouter.patch('/:id/placements/:placementId', patchPlacementHandler);
campaignsRouter.delete('/:id/placements/:placementId', deletePlacementHandler);

