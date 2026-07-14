/**
 * Seeds a polished demo dataset for live demos and Vercel deployment.
 * Includes analyses, actions, impact snapshots, placements, goals, notes, and events
 * so the UI showcases campaign intelligence without requiring a live OpenAI call.
 *
 * Run: npm run demo:seed (from apps/api)
 * Prefer: DATABASE_URL=file:./demo.db (path relative to prisma/schema.prisma)
 */
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { saveUploadedReport, autoParseReport } from '../src/services/reportService';
import { getUploadsDir, ensureUploadsDir } from '../src/lib/runtimePaths';
import type { CampaignDiagnosis } from '../src/ai/openaiProvider';

const prisma = new PrismaClient();

const fixture = (name: string) =>
  path.join(__dirname, '..', 'src', '__fixtures__', name);

interface SeedReportSpec {
  fileName: string;
  sourcePath: string;
}

const copyToUploads = async (spec: SeedReportSpec): Promise<string> => {
  await ensureUploadsDir();
  const uploadsDir = getUploadsDir();
  const destName = `demo-${Date.now()}-${spec.fileName}`;
  const destPath = path.join(uploadsDir, destName);
  await fs.copyFile(spec.sourcePath, destPath);
  return destPath;
};

const importReport = async (
  campaignId: number,
  spec: SeedReportSpec
): Promise<void> => {
  const filePath = await copyToUploads(spec);
  const report = await saveUploadedReport({
    campaignId,
    fileName: spec.fileName,
    filePath,
  });
  const result = await autoParseReport(report.id, report.reportType);
  if (!result.success) {
    throw new Error(
      `Demo seed failed parsing ${spec.fileName}: ${result.error ?? 'unknown error'}`
    );
  }
};

const clearDatabase = async (): Promise<void> => {
  await prisma.actionImpactSnapshot.deleteMany();
  await prisma.actionPlanItem.deleteMany();
  await prisma.campaignAnalysis.deleteMany();
  await prisma.campaignAdvisorChatMessage.deleteMany();
  await prisma.placementListEntry.deleteMany();
  await prisma.searchTermReportRow.deleteMany();
  await prisma.keywordReportRow.deleteMany();
  await prisma.deviceReportRow.deleteMany();
  await prisma.placementReportRow.deleteMany();
  await prisma.geographicReportRow.deleteMany();
  await prisma.demographicsReportRow.deleteMany();
  await prisma.audienceReportRow.deleteMany();
  await prisma.adScheduleReportRow.deleteMany();
  await prisma.campaignReportRow.deleteMany();
  await prisma.uploadedReport.deleteMany();
  await prisma.campaignSettings.deleteMany();
  await prisma.campaignGoal.deleteMany();
  await prisma.campaignEvent.deleteMany();
  await prisma.campaignNote.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.clientAdvisoryProfile.deleteMany();
  await prisma.client.deleteMany();
};

const searchDiagnosis: CampaignDiagnosis = {
  executiveSummary:
    'Brand Search is converting near target CPA ($45), but non-brand queries are absorbing ~$420/mo in wasted spend. Negative-keyword cleanup on cheap/generic footwear terms is the highest-ROI move this week.',
  evidenceStrength: 'directional',
  primaryIssue: 'Non-brand query waste diluting brand efficiency',
  focusArea: 'Search query control',
  estimatedWastedSpend: 420,
  estimatedUpside: 180,
  decisionConfidence: 'medium',
  whatIsHappening: [
    'Brand exact/phrase terms deliver CPA within 10% of the $45 target.',
    'Generic terms ("cheap running shoes", "discount sneakers") drive clicks with near-zero conversions.',
    'Search terms report coverage is fresh; keyword coverage supports directional decisions.',
  ],
  whyItIsHappening: [
    'Broad match / close variants are expanding beyond brand intent.',
    'Negative keyword lists have not been refreshed in the last 14 days.',
    'Budget is shared across brand and exploration queries without clear separation.',
  ],
  risks: [
    'Continued spend on non-converting generics raises blended CPA above target.',
    'Over-aggressive negatives could cut discovery if applied without review.',
  ],
  opportunities: [
    'Ship a focused negative list this week and re-check CPA in 7 days.',
    'Separate brand vs non-brand campaigns once waste is under control.',
  ],
  prioritizedActions: [
    {
      type: 'exclude',
      title: 'Add negatives: cheap, discount, fake, wholesale',
      rationale:
        'These search themes show cost with no conversions in the uploaded search terms export.',
      priority: 'high',
      confidence: 'high',
    },
    {
      type: 'restructure',
      title: 'Split brand exact from broad exploration',
      rationale:
        'Isolating brand exact protects CPA while exploration gets a capped budget.',
      priority: 'medium',
      confidence: 'medium',
    },
    {
      type: 'scale',
      title: 'Increase bids on converting brand terms',
      rationale:
        'Winning brand queries are under-delivering impression share relative to ROAS.',
      priority: 'medium',
      confidence: 'medium',
    },
  ],
  missingData: [
    'Device report would confirm mobile waste share.',
    'Geographic report would surface state-level CPA outliers.',
  ],
  exclusions: ['cheap running shoes', 'discount sneakers', 'fake nike'],
  scaleTargets: ['[demo brand] running shoes', 'demo brand official'],
};

const displayDiagnosis: CampaignDiagnosis = {
  executiveSummary:
    'Display remarketing is pacing under the $60 CPA target, but mobile-game and parkingsphere placements are burning budget. Blacklist the worst 4 placements and protect high-intent product pages on the whitelist.',
  evidenceStrength: 'directional',
  primaryIssue: 'Toxic placements draining remarketing budget',
  focusArea: 'Placement hygiene',
  estimatedWastedSpend: 310,
  estimatedUpside: 140,
  decisionConfidence: 'medium',
  whatIsHappening: [
    'A small set of app/game placements account for disproportionate spend.',
    'Product-category sites convert closer to target CPA.',
    'No formal blacklist/whitelist history existed before this week.',
  ],
  whyItIsHappening: [
    'Automatic placements expanded into low-intent inventory.',
    'Exclusion lists were not maintained after creative refresh.',
  ],
  risks: [
    'Leaving game placements active keeps CPA elevated.',
    'Over-blacklisting can starve reach if applied blindly.',
  ],
  opportunities: [
    'Codify AI-suggested blacklists into persistent placement memory.',
    'Whitelist brand-safe retail/editorial inventory.',
  ],
  prioritizedActions: [
    {
      type: 'exclude',
      title: 'Blacklist game and parkingsphere placements',
      rationale: 'High cost, zero conversions in the placement export.',
      priority: 'high',
      confidence: 'high',
    },
    {
      type: 'scale',
      title: 'Whitelist converting product pages',
      rationale: 'Protect inventory that already converts near target.',
      priority: 'medium',
      confidence: 'medium',
    },
  ],
  missingData: ['Audience report for RLSA segments', 'Device report'],
  exclusions: ['mobilegame.example', 'parkingsphere.net'],
  scaleTargets: ['runnersworld.com/reviews', 'shop.demo-brand.com'],
};

const pmaxDiagnosis: CampaignDiagnosis = {
  executiveSummary:
    'PMax is below ROAS/CPA expectation because asset-group signals and campaign-level reporting are thin. Upload a CAMPAIGN report and tighten audience signals before scaling budget.',
  evidenceStrength: 'weak',
  primaryIssue: 'Insufficient campaign-level coverage for confident PMax optimization',
  focusArea: 'Asset signals and reporting coverage',
  estimatedWastedSpend: 200,
  estimatedUpside: 400,
  decisionConfidence: 'low',
  whatIsHappening: [
    'Only search-terms and keyword-shaped rows are available — not full PMax levers.',
    'Conversion volume is low relative to spend.',
  ],
  whyItIsHappening: [
    'Important report types (CAMPAIGN, DEVICE, AUDIENCE, GEOGRAPHIC) are missing.',
    'Audience signals may be under-specified in asset groups.',
  ],
  risks: [
    'Scaling budget without CAMPAIGN report increases blind spend.',
  ],
  opportunities: [
    'Upload CAMPAIGN + DEVICE reports, then re-run analysis.',
    'Refresh asset group signals with customer lists and search themes.',
  ],
  prioritizedActions: [
    {
      type: 'hold',
      title: 'Hold budget until CAMPAIGN report is uploaded',
      rationale: 'Without campaign-level efficiency, bid/target changes are guesswork.',
      priority: 'high',
      confidence: 'high',
    },
    {
      type: 'test',
      title: 'Add high-intent audience signals to asset groups',
      rationale: 'Signals guide learning when query-level control is limited.',
      priority: 'medium',
      confidence: 'medium',
    },
  ],
  missingData: ['CAMPAIGN', 'DEVICE', 'AUDIENCE', 'GEOGRAPHIC'],
  exclusions: [],
  scaleTargets: [],
};

async function seedAnalysisWithActions(
  campaignId: number,
  diagnosis: CampaignDiagnosis,
  actionSpecs: Array<{
    actionType: string;
    title: string;
    rationale: string;
    priority: string;
    confidence: string;
    status: string;
    expectedImpact?: string;
    completedAt?: Date;
    withImpact?: boolean;
  }>
): Promise<number> {
  const analysis = await prisma.campaignAnalysis.create({
    data: {
      campaignId,
      analysisType: 'full_diagnosis',
      evidenceStrength: diagnosis.evidenceStrength,
      executiveSummary: diagnosis.executiveSummary,
      modelName: 'demo-seed',
      outputJson: JSON.stringify(diagnosis),
    },
  });

  for (const spec of actionSpecs) {
    const action = await prisma.actionPlanItem.create({
      data: {
        campaignId,
        analysisId: analysis.id,
        actionType: spec.actionType,
        title: spec.title,
        rationale: spec.rationale,
        priority: spec.priority,
        confidence: spec.confidence,
        status: spec.status,
        expectedImpact: spec.expectedImpact ?? null,
        completedAt: spec.completedAt ?? null,
      },
    });

    if (spec.withImpact) {
      await prisma.actionImpactSnapshot.create({
        data: {
          actionId: action.id,
          campaignId,
          snapshotType: 'before',
          metricsJson: JSON.stringify({
            cost: 890,
            conversions: 14,
            cpa: 63.6,
            clicks: 420,
          }),
        },
      });
      await prisma.actionImpactSnapshot.create({
        data: {
          actionId: action.id,
          campaignId,
          snapshotType: 'after',
          metricsJson: JSON.stringify({
            cost: 720,
            conversions: 16,
            cpa: 45.0,
            clicks: 380,
          }),
        },
      });
    }
  }

  return analysis.id;
}

async function main() {
  await clearDatabase();

  const client = await prisma.client.create({
    data: {
      name: 'Demo Brand Co.',
      advisoryProfile: {
        create: {
          websiteUrl: 'https://example.com',
          industryVertical: 'E-commerce / Footwear',
          conversionType: 'Purchase',
          accountMaturity: 'Growing',
          approximateMonthlySpend: 12000,
        },
      },
    },
  });

  const searchCampaign = await prisma.campaign.create({
    data: {
      clientId: client.id,
      name: 'Brand Search US',
      type: 'SEARCH',
      status: 'ACTIVE',
      monthlyBudget: 5000,
      targetCpa: 45,
      product: 'Running shoes',
      goals: {
        create: [
          {
            name: 'Lead CPA target',
            metric: 'CPA',
            targetValue: '45',
            isActive: true,
          },
          {
            name: 'Monthly conversions',
            metric: 'CONVERSIONS',
            targetValue: '120',
            isActive: true,
          },
        ],
      },
      notes: {
        create: [
          {
            author: 'Senior buyer',
            content:
              'Protect brand CPA. Ship negatives weekly and keep brand exact separated from broad.',
            pinned: true,
          },
          {
            author: 'Demo',
            content: 'Last creative refresh: new RS-Pro landing page (Jun 28).',
            pinned: false,
          },
        ],
      },
      events: {
        create: [
          {
            type: 'OPTIMIZATION',
            title: 'Negative keyword pack shipped',
            description: 'Excluded cheap / discount / wholesale footwear themes.',
            occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            type: 'BUDGET_CHANGED',
            title: 'Budget raised to $5,000',
            description: 'Increased after brand CPA stabilized under $48.',
            occurredAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const displayCampaign = await prisma.campaign.create({
    data: {
      clientId: client.id,
      name: 'Display Remarketing',
      type: 'DISPLAY',
      status: 'ACTIVE',
      monthlyBudget: 3000,
      targetCpa: 60,
      product: 'Running shoes — cart abandoners',
      goals: {
        create: [
          {
            name: 'Remarketing CPA',
            metric: 'CPA',
            targetValue: '60',
            isActive: true,
          },
        ],
      },
      notes: {
        create: [
          {
            author: 'Senior buyer',
            content:
              'Placement hygiene first. Keep games/apps off; whitelist editorial + product pages.',
            pinned: true,
          },
        ],
      },
      events: {
        create: [
          {
            type: 'OPTIMIZATION',
            title: 'Initial placement blacklist applied',
            description: 'Blocked known low-intent game inventory.',
            occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const pmaxCampaign = await prisma.campaign.create({
    data: {
      clientId: client.id,
      name: 'PMax - Shoes',
      type: 'PERFORMANCE_MAX',
      status: 'ACTIVE',
      monthlyBudget: 8000,
      targetCpa: 38,
      product: 'Full shoe catalog',
      goals: {
        create: [
          {
            name: 'PMax target CPA',
            metric: 'CPA',
            targetValue: '38',
            isActive: true,
          },
        ],
      },
      notes: {
        create: [
          {
            author: 'Senior buyer',
            content:
              'Do not scale until CAMPAIGN + DEVICE reports are in. Prefer signals and asset coverage over micro-edits.',
            pinned: true,
          },
        ],
      },
      events: {
        create: [
          {
            type: 'NOTE',
            title: 'Asset groups reviewed',
            description: 'Lifestyle + product feed asset groups audited; signals still thin.',
            occurredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  await importReport(searchCampaign.id, {
    fileName: 'Search_terms_report.csv',
    sourcePath: fixture('search_terms_sample.csv'),
  });
  await importReport(searchCampaign.id, {
    fileName: 'Keywords_report.csv',
    sourcePath: fixture('keywords_sample.csv'),
  });

  await importReport(displayCampaign.id, {
    fileName: 'Placement_report.csv',
    sourcePath: fixture('placement_sample.csv'),
  });

  await importReport(pmaxCampaign.id, {
    fileName: 'Keywords_report.csv',
    sourcePath: fixture('keywords_sample.csv'),
  });
  await importReport(pmaxCampaign.id, {
    fileName: 'Search_terms_report.csv',
    sourcePath: fixture('search_terms_sample.csv'),
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const searchAnalysisId = await seedAnalysisWithActions(searchCampaign.id, searchDiagnosis, [
    {
      actionType: 'exclude',
      title: 'Add negatives: cheap, discount, fake, wholesale',
      rationale:
        'Non-brand queries show spend without conversions in the search terms export.',
      priority: 'high',
      confidence: 'high',
      status: 'approved',
      expectedImpact: 'Recover ~$400/mo wasted spend',
    },
    {
      actionType: 'exclude',
      title: 'Exclude "free shipping code" query cluster',
      rationale: 'Promo-hunter intent; CPA well above target.',
      priority: 'high',
      confidence: 'high',
      status: 'done',
      expectedImpact: 'CPA down toward $45',
      completedAt: weekAgo,
      withImpact: true,
    },
    {
      actionType: 'restructure',
      title: 'Split brand exact from broad exploration',
      rationale: 'Protects brand CPA while capping exploration spend.',
      priority: 'medium',
      confidence: 'medium',
      status: 'draft',
      expectedImpact: 'Clearer brand vs discovery reporting',
    },
    {
      actionType: 'scale',
      title: 'Increase bids on converting brand terms',
      rationale: 'Winning brand queries have room to capture more impression share.',
      priority: 'medium',
      confidence: 'medium',
      status: 'draft',
    },
  ]);

  const displayAnalysisId = await seedAnalysisWithActions(
    displayCampaign.id,
    displayDiagnosis,
    [
      {
        actionType: 'exclude',
        title: 'Blacklist game and parkingsphere placements',
        rationale: 'High cost, zero conversions from automatic placements.',
        priority: 'high',
        confidence: 'high',
        status: 'approved',
        expectedImpact: 'Cut ~$300/mo toxic spend',
      },
      {
        actionType: 'scale',
        title: 'Whitelist converting product pages',
        rationale: 'Protect inventory already converting near target CPA.',
        priority: 'medium',
        confidence: 'medium',
        status: 'done',
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        expectedImpact: 'Stabilize remarketing CPA',
      },
      {
        actionType: 'hold',
        title: 'Hold display budget until blacklist ships',
        rationale: 'Avoid scaling into known waste inventory.',
        priority: 'medium',
        confidence: 'high',
        status: 'draft',
      },
    ]
  );

  await seedAnalysisWithActions(pmaxCampaign.id, pmaxDiagnosis, [
    {
      actionType: 'hold',
      title: 'Hold budget until CAMPAIGN report is uploaded',
      rationale: 'Missing campaign-level efficiency data for PMax.',
      priority: 'high',
      confidence: 'high',
      status: 'approved',
      expectedImpact: 'Prevent blind budget scale',
    },
    {
      actionType: 'test',
      title: 'Add high-intent audience signals to asset groups',
      rationale: 'Customer lists + search themes improve learning quality.',
      priority: 'medium',
      confidence: 'medium',
      status: 'draft',
    },
  ]);

  await prisma.placementListEntry.createMany({
    data: [
      {
        campaignId: displayCampaign.id,
        listType: 'blacklist',
        placement: 'mobilegame.example/play',
        displayName: 'Mobile Game Network',
        source: 'ai',
        reason: 'High spend, 0 conversions — suggested from latest analysis',
        status: 'active',
        analysisId: displayAnalysisId,
      },
      {
        campaignId: displayCampaign.id,
        listType: 'blacklist',
        placement: 'parkingsphere.net',
        displayName: 'Parking Sphere',
        source: 'ai',
        reason: 'Parked domain / low commercial intent',
        status: 'active',
        analysisId: displayAnalysisId,
      },
      {
        campaignId: displayCampaign.id,
        listType: 'blacklist',
        placement: 'kids-puzzle-app.io',
        displayName: 'Kids Puzzle App',
        source: 'manual',
        reason: 'Brand safety — child inventory',
        status: 'active',
      },
      {
        campaignId: displayCampaign.id,
        listType: 'whitelist',
        placement: 'runnersworld.com',
        displayName: 'Runner’s World',
        source: 'manual',
        reason: 'Editorial affinity + historical CPA near target',
        status: 'active',
      },
      {
        campaignId: displayCampaign.id,
        listType: 'whitelist',
        placement: 'shop.demo-brand.com/running',
        displayName: 'Demo Brand — Running PLP',
        source: 'ai',
        reason: 'Strong remarketing conversion rate',
        status: 'active',
        analysisId: displayAnalysisId,
      },
    ],
  });

  // Tie search analysis id into a note for traceability (optional)
  void searchAnalysisId;

  console.log('Demo seed complete.');
  console.log(`  Client: ${client.name} (#${client.id})`);
  console.log(
    `  Campaigns: ${searchCampaign.name}, ${displayCampaign.name}, ${pmaxCampaign.name}`
  );
  console.log('  Seeded: analyses, actions, impacts, placements, goals, notes, events');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
