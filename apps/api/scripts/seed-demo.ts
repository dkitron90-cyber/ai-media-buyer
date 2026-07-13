/**
 * Seeds a polished demo dataset for live demos and Vercel deployment.
 * Run: npm run demo:seed (from apps/api)
 */
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { saveUploadedReport, autoParseReport } from '../src/services/reportService';
import { getUploadsDir, ensureUploadsDir } from '../src/lib/runtimePaths';

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
        ],
      },
      notes: {
        create: [
          {
            author: 'Demo',
            content:
              'Focus on brand vs non-brand separation. Upload fresh search terms weekly.',
            pinned: true,
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

  // Re-use search terms for PMax query insight when available
  await importReport(pmaxCampaign.id, {
    fileName: 'Search_terms_report.csv',
    sourcePath: fixture('search_terms_sample.csv'),
  });

  console.log('Demo seed complete.');
  console.log(`  Client: ${client.name} (#${client.id})`);
  console.log(`  Campaigns: ${searchCampaign.name}, ${displayCampaign.name}, ${pmaxCampaign.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
