export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  mode?: 'demo' | 'standard';
}

export interface Client {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: number;
  clientId: number;
  name: string;
  type: string;
  status: string;
  monthlyBudget: string | null;
  targetCpa: string | null;
  product: string | null;
  productUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/landing-page/analyze */
export interface LandingPageAnalysisResult {
  url: string;
  statusCode: number;
  isHTTPS: boolean;
  loadTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasMobileViewport: boolean;
  hasCTA: boolean;
  hasForm: boolean;
  hasPhone: boolean;
  hasVideo: boolean;
  hasSocialProof: boolean;
  hasSchema: boolean;
  wordCount: number;
  imageCount: number;
  warnings: string[];
}

/** Client-level advisor profile (GET/PATCH /api/clients/:id/advisory-profile). */
export interface AdvisoryProfile {
  clientId: number;
  websiteUrl: string | null;
  industryVertical: string | null;
  conversionType: string | null;
  accountMaturity: string | null;
  approximateMonthlySpend: string | null;
  landingPageAnalysis: LandingPageAnalysisResult | null;
  landingPageAnalyzedAt: string | null;
  landingPageAnalyzedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PatchAdvisoryProfilePayload = {
  websiteUrl?: string | null;
  industryVertical?: string | null;
  conversionType?: string | null;
  accountMaturity?: string | null;
  approximateMonthlySpend?: number | null;
  landingPageAnalysis?: LandingPageAnalysisResult | null;
};

export interface UploadedReport {
  id: number;
  campaignId: number;
  reportType: string;
  fileName: string;
  filePath: string;
  uploadStatus: string;
  uploadedAt: string;
  processedAt: string | null;
  fileSizeBytes: number | null;
  checksum: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignReportStatus {
  campaignId: number;
  campaignType: string;
  relevantReportTypes: string[];
  uploadedReportTypes: string[];
  missingReportTypes: string[];
  uploadedReports: UploadedReport[];
}

export interface SearchTermReportRow {
  id: number;
  uploadedReportId: number;
  campaignId: number;
  rowIndex: number;
  searchTerm: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  createdAt: string;
}

export interface AnalysisReadiness {
  campaignId: number;
  campaignType: string;
  relevantReportTypes: string[];
  uploadedReportTypes: string[];
  parsedReportTypes: string[];
  sufficiencyLabel: 'WEAK' | 'DIRECTIONAL' | 'STRONG';
  reasons: string[];
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
  };
}

export type NextBestActionType =
  | 'action'
  | 'gap'
  | 'data_request'
  | 'settings_fix'
  | 'checklist_item';

export type NextBestActionPriority = 'high' | 'medium' | 'low';
export type NextBestActionConfidence = 'high' | 'medium' | 'low';

/** Compact decision layer from GET /campaigns/:id/decision-summary */
export interface CampaignDecisionSummary {
  campaignId: number;
  primaryIssue: string;
  focusArea: string;
  estimatedWastedSpend: number | null;
  estimatedUpside: number | null;
  confidence: 'low' | 'medium' | 'high';
  topReason: string;
  nextBestActionTitle: string;
  evidenceStrength: 'weak' | 'directional' | 'strong';
}

/** GET /api/campaigns/:id/playbook — autopilot daily / weekly / monthly plan */
export type PlaybookItemType =
  | 'execute_action'
  | 'upload_report'
  | 'fix_setting'
  | 'review_item';

export type PlaybookReviewFocus =
  | 'execution'
  | 'reports'
  | 'checklist'
  | 'impact'
  | 'analysis'
  | 'settings';

export interface PlaybookItem {
  id: string;
  title: string;
  reason: string;
  estimatedImpact: string;
  type: PlaybookItemType;
  actionId: number | null;
  reportType: string | null;
  settingKey: string | null;
  checklistItemId: string | null;
  reviewFocus: PlaybookReviewFocus | null;
  priority: 'P0' | 'P1' | 'P2';
  isExecutable: boolean;
  blockingReason: string | null;
}

export interface CampaignPlaybook {
  campaignId: number;
  generatedAt: string;
  startHere: PlaybookItem | null;
  today: PlaybookItem[];
  thisWeek: PlaybookItem[];
  thisMonth: PlaybookItem[];
}

export interface NextBestActionResult {
  campaignId: number;
  nextBestAction: {
    type: NextBestActionType;
    title: string;
    description: string;
    whyNow: string;
    priority: NextBestActionPriority;
    confidence: NextBestActionConfidence;
    isExecutable: boolean;
    actionId: number | null;
    relatedGapIds: string[];
    blockingReason: string | null;
  };
}

export interface PrioritizedAction {
  type: 'scale' | 'hold' | 'pause' | 'exclude' | 'test' | 'restructure';
  title: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  confidence: 'low' | 'medium' | 'high';
}

export interface ActionPlanItem {
  id: number;
  campaignId: number;
  analysisId: number | null;
  actionType: string;
  title: string;
  rationale: string;
  priority: string;
  confidence: string;
  status: string;
  notes: string | null;
  expectedImpact: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionInput {
  actionType: string;
  title: string;
  rationale?: string;
  priority?: string;
  confidence?: string;
}

export interface PatchActionInput {
  status?: string;
  notes?: string;
  expectedImpact?: string;
  priority?: string;
}

export interface PlacementListEntry {
  id: number;
  campaignId: number;
  listType: string;
  placement: string;
  displayName: string | null;
  source: string;
  reason: string | null;
  status: string;
  analysisId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlacementInput {
  listType: string;
  placement: string;
  displayName?: string;
  reason?: string;
  source?: string;
  analysisId?: number;
}

export interface PatchPlacementInput {
  displayName?: string;
  reason?: string;
  status?: string;
}

export interface FromAnalysisResult {
  analysisId: number;
  listType: string;
  created: PlacementListEntry[];
  skippedDuplicates: string[];
  total: number;
}

export interface ExecuteActionResult {
  actionId: number;
  actionType: string;
  status: string;
  placementsCreated: PlacementListEntry[];
  skippedDuplicates: string[];
}

export interface ImpactMetrics {
  clicks?: number;
  impressions?: number;
  cost?: number;
  conversions?: number;
  conversionValue?: number;
  roas?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpa?: number | null;
}

export interface ActionImpactSnapshot {
  id: number;
  actionId: number;
  campaignId: number;
  snapshotType: string;
  capturedAt: string;
  metrics: ImpactMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface ActionImpactSummary {
  actionId: number;
  before: ActionImpactSnapshot | null;
  after: ActionImpactSnapshot | null;
  delta: ImpactMetrics | null;
  assessment: {
    status: 'insufficient_data' | 'measured';
    message: string;
    highlights?: string[];
  };
}

export interface ActiveReport {
  id: number;
  campaignId: number;
  reportType: string;
  fileName: string;
  uploadStatus: string;
  uploadedAt: string;
  processedAt: string | null;
}

export interface ActiveReportSummary {
  campaignId: number;
  activeReports: ActiveReport[];
  supersededReports: ActiveReport[];
  coverageByType: Record<string, { activeReportId: number; supersededCount: number }>;
}

export type AlignmentStatus = 'ALIGNED' | 'PARTIAL' | 'MISALIGNED' | 'UNKNOWN';
export type FreshnessStatus = 'FRESH' | 'AGING' | 'STALE' | 'UNKNOWN';

export interface ReportDateRange {
  reportId: number;
  reportType: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  rowCount: number | null;
  processedAt: string | null;
}

export interface DataWindow {
  campaignId: number;
  activeReportRanges: ReportDateRange[];
  recommendedAnalysisWindow: {
    start: string | null;
    end: string | null;
  };
  alignmentStatus: AlignmentStatus;
  freshnessStatus: FreshnessStatus;
  notes: string[];
}

export type ReportIntakeMatchStatus = 'exact' | 'normalized' | 'no_match';

export interface ReportIntakeCampaignMatch {
  campaignName: string;
  matchedCampaignId: number | null;
  matchedCampaignName: string | null;
  matchStatus: ReportIntakeMatchStatus;
  inferredCampaignType: string;
  inferredCampaignTypeSource: 'campaign_name' | 'report_type' | 'default';
  inferredCampaignTypeConfidence: 'high' | 'medium' | 'low';
}

export interface ReportInspectionResult {
  stagingId: string;
  reportType: string | null;
  fileName: string;
  detectedEncoding: string;
  detectedDelimiter: string;
  detectedHeaderRowIndex: number;
  originalHeaders: string[];
  normalizedHeaders: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  campaignNames: string[];
  campaignMatches: ReportIntakeCampaignMatch[];
  previewRowCount: number;
  warnings: string[];
  inferredCampaignType: string;
  inferredCampaignTypeSource: 'campaign_name' | 'report_type' | 'default';
  inferredCampaignTypeConfidence: 'high' | 'medium' | 'low';
}

export interface ReportAttachResultItem {
  campaignId: number;
  uploadedReportId: number;
  autoParse: {
    attempted: boolean;
    success: boolean;
    parsedRowCount: number | null;
    error: string | null;
  };
}

export interface ReportAttachResponse {
  results: ReportAttachResultItem[];
}

export interface SavedAnalysis {
  id: number;
  campaignId: number;
  analysisType: string;
  evidenceStrength: string;
  executiveSummary: string | null;
  modelName: string | null;
  outputJson: CampaignDiagnosis;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignGoal {
  id: number;
  campaignId: number;
  name: string;
  metric: string;
  description: string | null;
  targetValue: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignNote {
  id: number;
  campaignId: number;
  content: string;
  author: string | null;
  pinned: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/** Must match backend `SETTINGS_SCHEMA_VERSION`. */
export const CAMPAIGN_SETTINGS_SCHEMA_VERSION = 1;

export type CampaignCanonicalTypeCode =
  | 'SEARCH'
  | 'DISPLAY'
  | 'PERFORMANCE_MAX'
  | 'VIDEO'
  | 'SHOPPING'
  | 'APP'
  | 'DEMAND_GEN'
  | 'OTHER';

export interface CampaignTypeSummary {
  code: CampaignCanonicalTypeCode;
  label: string;
  description: string;
  importantReportTypes: string[];
  recommendedReportTypes: string[];
  defaultObjectives: string[];
  optimizationPriorities: string[];
  specialWarnings: string[];
}

export interface CampaignTypeChecklistItem {
  id: string;
  label: string;
  detail?: string;
  phase: 'launch' | 'optimization';
}

export interface CampaignTypeChecklistTemplate {
  launch: CampaignTypeChecklistItem[];
  optimization: CampaignTypeChecklistItem[];
}

export interface CampaignTypePlaybookTemplate {
  expectedReportsSummary: string;
  missingReportSeverity: {
    strongWarnings: string[];
    moderateWarnings: string[];
  };
  aiPlaybookGuidance: string[];
}

export interface CampaignTypeFull extends CampaignTypeSummary {
  defaultChecklistTemplate: CampaignTypeChecklistTemplate;
  defaultPlaybookTemplate: CampaignTypePlaybookTemplate;
  minimumRecommendedCoverage: { directional: number; strong: number };
  missingReportGuidance: Record<string, string>;
  aiInstructions: string[];
}

export interface CampaignSettingsResponse {
  campaignId: number;
  canonicalCampaignType: CampaignCanonicalTypeCode;
  settingsSchemaVersion: number;
  settings: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CampaignDiagnosis {
  executiveSummary: string;
  evidenceStrength: 'weak' | 'directional' | 'strong';
  whatIsHappening: string[];
  whyItIsHappening: string[];
  risks: string[];
  opportunities: string[];
  prioritizedActions: PrioritizedAction[];
  missingData: string[];
  exclusions: string[];
  scaleTargets: string[];
}

/** Counts + ids returned after POST /campaigns/:id/analyze (action auto-generation). */
export interface ActionGenerationSummary {
  createdActions: number;
  skippedActions: number;
  createdPlacements: number;
  skippedPlacements: number;
  createdActionIds: number[];
}

export interface AnalyzeCampaignResponse {
  diagnosis: CampaignDiagnosis;
  analysisId: number | null;
  actionGeneration: ActionGenerationSummary;
  analysisSource?: 'openai' | 'deterministic-fallback';
}

export interface SmartImportResultItem {
  detectedCampaignName: string;
  outcome: 'mapped_existing' | 'created_new' | 'skipped';
  campaignId: number | null;
  createdCampaignType?: string | null;
  uploadedReportId: number | null;
  autoParse:
    | {
        attempted: boolean;
        success: boolean;
        parsedRowCount: number | null;
        error: string | null;
      }
    | null;
  warnings: string[];
}

export interface SmartImportResponse {
  results: SmartImportResultItem[];
  note?: string;
}

// Checklist progress

export interface CampaignChecklistItem {
  id: string;
  phase: 'launch' | 'optimization' | string;
  label: string;
  detail?: string | null;
  status: 'pending' | 'done' | 'skipped' | string;
}

export interface CampaignChecklistSummary {
  total: number;
  done: number;
  pending: number;
  skipped: number;
  completionPercent: number;
}

export interface CampaignChecklistResponse {
  items: CampaignChecklistItem[];
  summary: CampaignChecklistSummary;
}

// Gaps (auto gap detection)

export type GapCategory = 'reports' | 'settings' | 'checklist' | 'data';
export type GapSeverity = 'high' | 'medium' | 'low';

export interface CampaignGap {
  id: string;
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  description: string;
  recommendation: string;
  relatedReportType?: string;
  relatedSetting?: string;
  relatedChecklistItemId?: string;
}

export interface CampaignGapsResponse {
  campaignId: number;
  canonicalCampaignType: CampaignCanonicalTypeCode;
  gaps: CampaignGap[];
}

export interface GoogleAdsExportScriptMeta {
  fileName: string;
  displayName: string;
  version: string;
  downloadPath: string;
  installPath: string;
  googleAdsScriptsNewUrl: string;
  googleAdsScriptsHomeUrl: string;
  dateRangeDefault: string;
  reportsExported: string[];
  installSteps: string[];
  scriptText: string;
}

const API_BASE_URL =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.PROD ? '' : 'http://localhost:4000');

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${message || 'Unknown error'}`
    );
  }

  return (await response.json()) as T;
}

async function post<TRequest, TResponse>(
  path: string,
  body: TRequest,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${message || 'Unknown error'}`
    );
  }

  return (await response.json()) as TResponse;
}

async function patch<TRequest, TResponse>(
  path: string,
  body: TRequest,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${message || 'Unknown error'}`
    );
  }

  return (await response.json()) as TResponse;
}

async function del(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${message || 'Unknown error'}`
    );
  }
}

async function postFormData<TResponse>(
  path: string,
  formData: FormData,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    ...(init ?? {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${message || 'Unknown error'}`
    );
  }

  return (await response.json()) as TResponse;
}

export const apiClient = {
  getHealth: () => get<HealthResponse>('/health'),
  // Clients
  listClients: () => get<Client[]>('/api/clients'),
  createClient: (payload: { name: string }) =>
    post<{ name: string }, Client>('/api/clients', payload),
  updateClient: (id: number, payload: { name?: string }) =>
    patch<typeof payload, Client>(`/api/clients/${id}`, payload),
  deleteClient: (id: number) => del(`/api/clients/${id}`),
  getAdvisoryProfile: (clientId: number) =>
    get<AdvisoryProfile>(`/api/clients/${clientId}/advisory-profile`),
  patchAdvisoryProfile: (clientId: number, payload: PatchAdvisoryProfilePayload) =>
    patch<PatchAdvisoryProfilePayload, AdvisoryProfile>(
      `/api/clients/${clientId}/advisory-profile`,
      payload
    ),
  analyzeLandingPage: (url: string) =>
    post<{ url: string }, LandingPageAnalysisResult>('/api/landing-page/analyze', {
      url,
    }),

  // Campaigns
  listCampaigns: () => get<Campaign[]>('/api/campaigns'),
  listCampaignsForClient: (clientId: number) =>
    get<Campaign[]>(`/api/clients/${clientId}/campaigns`),
  createCampaign: (payload: {
    clientId: number;
    name: string;
    type: string;
    status?: string;
    monthlyBudget?: number;
    targetCpa?: number;
    product?: string;
    productUrl?: string;
  }) => post<typeof payload, Campaign>('/api/campaigns', payload),
  getCampaignById: (id: number) => get<Campaign>(`/api/campaigns/${id}`),
  updateCampaign: (
    id: number,
    payload: Partial<
      Pick<
        Campaign,
        | 'name'
        | 'type'
        | 'status'
        | 'monthlyBudget'
        | 'targetCpa'
        | 'product'
        | 'productUrl'
      >
    >
  ) => patch<typeof payload, Campaign>(`/api/campaigns/${id}`, payload),
  deleteCampaign: (id: number) => del(`/api/campaigns/${id}`),

  // Reports
  uploadCampaignReport: (campaignId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return postFormData<UploadedReport>(`/api/campaigns/${campaignId}/reports`, formData);
  },
  listCampaignReports: (campaignId: number) =>
    get<UploadedReport[]>(`/api/campaigns/${campaignId}/reports`),
  getCampaignReportStatus: (campaignId: number) =>
    get<CampaignReportStatus>(`/api/campaigns/${campaignId}/reports/status`),
  parseReport: (reportId: number) =>
    post<undefined, { reportId: number; parsedRowCount: number; status: string }>(
      `/api/reports/${reportId}/parse`,
      // eslint-disable-next-line unicorn/no-useless-undefined
      undefined as unknown as undefined
    ),
  listSearchTermRows: (reportId: number) =>
    get<SearchTermReportRow[]>(`/api/reports/${reportId}/rows`),

  getActiveReports: (campaignId: number) =>
    get<ActiveReportSummary>(`/api/campaigns/${campaignId}/reports/active`),

  // Data Window
  getCampaignDataWindow: (campaignId: number) =>
    get<DataWindow>(`/api/campaigns/${campaignId}/data-window`),

  // Analysis
  getAnalysisReadiness: (campaignId: number) =>
    get<AnalysisReadiness>(`/api/campaigns/${campaignId}/analysis-readiness`),
  analyzeCampaign: (campaignId: number) =>
    post<Record<string, never>, AnalyzeCampaignResponse>(
      `/api/campaigns/${campaignId}/analyze`,
      {}
    ),

  // Next Best Action
  getNextBestAction: (campaignId: number) =>
    get<NextBestActionResult>(
      `/api/campaigns/${campaignId}/next-best-action`
    ),

  getDecisionSummary: (campaignId: number) =>
    get<CampaignDecisionSummary>(
      `/api/campaigns/${campaignId}/decision-summary`
    ),

  getCampaignPlaybook: (campaignId: number) =>
    get<CampaignPlaybook>(`/api/campaigns/${campaignId}/playbook`),

  // Analysis History
  listCampaignAnalyses: (campaignId: number) =>
    get<SavedAnalysis[]>(`/api/campaigns/${campaignId}/analyses`),
  getCampaignAnalysis: (campaignId: number, analysisId: number) =>
    get<SavedAnalysis>(`/api/campaigns/${campaignId}/analyses/${analysisId}`),

  // Action Plan
  listCampaignActions: (campaignId: number) =>
    get<ActionPlanItem[]>(`/api/campaigns/${campaignId}/actions`),
  createCampaignAction: (campaignId: number, payload: CreateActionInput) =>
    post<CreateActionInput, ActionPlanItem>(
      `/api/campaigns/${campaignId}/actions`,
      payload
    ),
  updateCampaignAction: (
    campaignId: number,
    actionId: number,
    payload: PatchActionInput
  ) =>
    patch<PatchActionInput, ActionPlanItem>(
      `/api/campaigns/${campaignId}/actions/${actionId}`,
      payload
    ),

  // Placements
  listCampaignPlacements: (campaignId: number) =>
    get<PlacementListEntry[]>(`/api/campaigns/${campaignId}/placements`),
  listCampaignBlacklist: (campaignId: number) =>
    get<PlacementListEntry[]>(`/api/campaigns/${campaignId}/placements/blacklist`),
  listCampaignWhitelist: (campaignId: number) =>
    get<PlacementListEntry[]>(`/api/campaigns/${campaignId}/placements/whitelist`),
  createCampaignPlacement: (campaignId: number, payload: CreatePlacementInput) =>
    post<CreatePlacementInput, PlacementListEntry>(
      `/api/campaigns/${campaignId}/placements`,
      payload
    ),
  updateCampaignPlacement: (
    campaignId: number,
    placementId: number,
    payload: PatchPlacementInput
  ) =>
    patch<PatchPlacementInput, PlacementListEntry>(
      `/api/campaigns/${campaignId}/placements/${placementId}`,
      payload
    ),

  // Placement Execution
  createPlacementsFromAnalysis: (
    campaignId: number,
    payload: { analysisId: number; type: 'blacklist' | 'whitelist' }
  ) =>
    post<typeof payload, FromAnalysisResult>(
      `/api/campaigns/${campaignId}/placements/from-analysis`,
      payload
    ),
  executeCampaignAction: (campaignId: number, actionId: number) =>
    post<Record<string, never>, ExecuteActionResult>(
      `/api/campaigns/${campaignId}/actions/${actionId}/execute`,
      {}
    ),

  // Action Impact
  getActionImpact: (campaignId: number, actionId: number) =>
    get<ActionImpactSummary>(`/api/campaigns/${campaignId}/actions/${actionId}/impact`),
  captureActionImpact: (campaignId: number, actionId: number) =>
    post<Record<string, never>, ActionImpactSummary>(
      `/api/campaigns/${campaignId}/actions/${actionId}/capture-impact`,
      {}
    ),

  // Controls to wire:
  // Goals listing & creation
  listCampaignGoals: (campaignId: number) =>
    get<CampaignGoal[]>(`/api/campaigns/${campaignId}/goals`),
  createCampaignGoal: (
    campaignId: number,
    payload: {
      name: string;
      metric: string;
      description?: string | null;
      targetValue?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) =>
    post<typeof payload, CampaignGoal>(`/api/campaigns/${campaignId}/goals`, payload),
  // Goals
  patchGoal: (
    campaignId: number,
    goalId: number,
    payload: {
      name?: string;
      metric?: string;
      description?: string | null;
      targetValue?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) =>
    patch<typeof payload, unknown>(
      `/api/campaigns/${campaignId}/goals/${goalId}`,
      payload
    ),
  deleteGoal: (campaignId: number, goalId: number) =>
    del(`/api/campaigns/${campaignId}/goals/${goalId}`),

  // Notes
  patchNote: (
    campaignId: number,
    noteId: number,
    payload: { content?: string; author?: string | null; pinned?: boolean | null }
  ) =>
    patch<typeof payload, unknown>(
      `/api/campaigns/${campaignId}/notes/${noteId}`,
      payload
    ),
  deleteNote: (campaignId: number, noteId: number) =>
    del(`/api/campaigns/${campaignId}/notes/${noteId}`),
  listCampaignNotes: (campaignId: number) =>
    get<CampaignNote[]>(`/api/campaigns/${campaignId}/notes`),
  createCampaignNote: (
    campaignId: number,
    payload: { content: string; author?: string | null; pinned?: boolean | null }
  ) => post<typeof payload, CampaignNote>(`/api/campaigns/${campaignId}/notes`, payload),

  // Actions
  deleteAction: (campaignId: number, actionId: number) =>
    del(`/api/campaigns/${campaignId}/actions/${actionId}`),

  // Placements
  deletePlacement: (campaignId: number, placementId: number) =>
    del(`/api/campaigns/${campaignId}/placements/${placementId}`),

  // Reports
  deleteReport: (campaignId: number, reportId: number) =>
    del(`/api/campaigns/${campaignId}/reports/${reportId}`),
  reparseReport: (reportId: number) =>
    post<Record<string, never>, { reportId: number; parsedRowCount: number; status: string }>(
      `/api/reports/${reportId}/reparse`,
      {}
    ),

  // Analyses
  deleteAnalysis: (campaignId: number, analysisId: number) =>
    del(`/api/campaigns/${campaignId}/analyses/${analysisId}`),

  // Smart report intake
  inspectReportIntake: async (file: File, opts?: { clientId?: number }) => {
    const formData = new FormData();
    formData.append('file', file);
    const query =
      opts?.clientId && Number.isFinite(opts.clientId)
        ? `?clientId=${encodeURIComponent(String(opts.clientId))}`
        : '';
    return postFormData<ReportInspectionResult>(
      `/api/report-intake/inspect${query}`,
      formData
    );
  },
  attachInspectedReport: (payload: {
    stagingId: string;
    fileName?: string;
    mappings: { campaignId: number }[];
  }) => post<typeof payload, ReportAttachResponse>(`/api/report-intake/attach`, payload),
  /** Client-scoped multi-campaign import (Smart Upload v2). */
  importReportForClient: (
    clientId: number,
    payload: {
      stagingId: string;
      fileName?: string;
      reportType?: string | null;
      mappings: {
        detectedCampaignName: string;
        existingCampaignId?: number;
        createNewCampaign?: boolean;
        campaignType?: string;
        skip?: boolean;
      }[];
    }
  ) =>
    post<typeof payload & { clientId: number }, SmartImportResponse>(
      `/api/report-intake/attach`,
      { clientId, ...payload }
    ),
  /** Alias for {@link importReportForClient} — clearer in client-import contexts. */
  clientImportReport: (
    clientId: number,
    payload: {
      stagingId: string;
      fileName?: string;
      reportType?: string | null;
      mappings: {
        detectedCampaignName: string;
        existingCampaignId?: number;
        createNewCampaign?: boolean;
        campaignType?: string;
        skip?: boolean;
      }[];
    }
  ) =>
    post<typeof payload & { clientId: number }, SmartImportResponse>(
      `/api/report-intake/attach`,
      { clientId, ...payload }
    ),

  // Campaign checklist & progress
  getCampaignChecklist: (campaignId: number) =>
    get<CampaignChecklistResponse>(`/api/campaigns/${campaignId}/checklist`),
  patchCampaignChecklistItem: (
    campaignId: number,
    itemId: string,
    payload: { status: 'pending' | 'done' | 'skipped' }
  ) =>
    patch<typeof payload, CampaignChecklistItem>(
      `/api/campaigns/${campaignId}/checklist/${encodeURIComponent(itemId)}`,
      payload
    ),

  // Campaign gaps / auto detection
  getCampaignGaps: (campaignId: number) =>
    get<CampaignGapsResponse>(`/api/campaigns/${campaignId}/gaps`),

  getGoogleAdsExportScript: () =>
    get<GoogleAdsExportScriptMeta>('/api/integrations/google-ads-export-script'),

  // Campaign types & type-specific settings (Phase 34B)
  listCampaignTypes: () =>
    get<{ types: CampaignTypeSummary[] }>('/api/campaign-types'),
  getCampaignType: (typeCode: string) =>
    get<{ type: CampaignTypeFull }>(
      `/api/campaign-types/${encodeURIComponent(typeCode)}`
    ),
  getCampaignSettings: (campaignId: number) =>
    get<CampaignSettingsResponse>(`/api/campaigns/${campaignId}/settings`),
  patchCampaignSettings: (
    campaignId: number,
    payload: {
      settings: Record<string, unknown>;
      settingsSchemaVersion?: number;
    }
  ) =>
    patch<typeof payload, CampaignSettingsResponse>(
      `/api/campaigns/${campaignId}/settings`,
      payload
    ),
};

