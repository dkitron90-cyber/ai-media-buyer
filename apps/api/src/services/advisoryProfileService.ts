import { prisma } from '../db/prisma';
import type { LandingPageAnalysisResult } from './landingPageAnalyzerService';
import { Prisma } from '@prisma/client';

export type AdvisoryProfileDto = {
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
};

function toDto(row: {
  clientId: number;
  websiteUrl: string | null;
  industryVertical: string | null;
  conversionType: string | null;
  accountMaturity: string | null;
  approximateMonthlySpend: Prisma.Decimal | null;
  landingPageAnalysisJson: string | null;
  landingPageAnalyzedAt: Date | null;
  landingPageAnalyzedUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdvisoryProfileDto {
  let landingPageAnalysis: LandingPageAnalysisResult | null = null;
  if (row.landingPageAnalysisJson) {
    try {
      landingPageAnalysis = JSON.parse(
        row.landingPageAnalysisJson
      ) as LandingPageAnalysisResult;
    } catch {
      landingPageAnalysis = null;
    }
  }
  return {
    clientId: row.clientId,
    websiteUrl: row.websiteUrl,
    industryVertical: row.industryVertical,
    conversionType: row.conversionType,
    accountMaturity: row.accountMaturity,
    approximateMonthlySpend:
      row.approximateMonthlySpend != null
        ? row.approximateMonthlySpend.toString()
        : null,
    landingPageAnalysis,
    landingPageAnalyzedAt: row.landingPageAnalyzedAt?.toISOString() ?? null,
    landingPageAnalyzedUrl: row.landingPageAnalyzedUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdvisoryProfileForClient(
  clientId: number
): Promise<AdvisoryProfileDto | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) return null;

  const row = await prisma.clientAdvisoryProfile.findUnique({
    where: { clientId },
  });
  if (!row) {
    return {
      clientId,
      websiteUrl: null,
      industryVertical: null,
      conversionType: null,
      accountMaturity: null,
      approximateMonthlySpend: null,
      landingPageAnalysis: null,
      landingPageAnalyzedAt: null,
      landingPageAnalyzedUrl: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }
  return toDto(row);
}

export type PatchAdvisoryProfileInput = {
  websiteUrl?: string | null;
  industryVertical?: string | null;
  conversionType?: string | null;
  accountMaturity?: string | null;
  approximateMonthlySpend?: number | null;
  landingPageAnalysis?: LandingPageAnalysisResult | null;
  landingPageAnalyzedUrl?: string | null;
};

export async function upsertAdvisoryProfile(
  clientId: number,
  patch: PatchAdvisoryProfileInput
): Promise<AdvisoryProfileDto | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) return null;

  const existing = await prisma.clientAdvisoryProfile.findUnique({
    where: { clientId },
  });

  const websiteUrl =
    patch.websiteUrl !== undefined ? patch.websiteUrl : existing?.websiteUrl ?? null;
  const industryVertical =
    patch.industryVertical !== undefined
      ? patch.industryVertical
      : existing?.industryVertical ?? null;
  const conversionType =
    patch.conversionType !== undefined
      ? patch.conversionType
      : existing?.conversionType ?? null;
  const accountMaturity =
    patch.accountMaturity !== undefined
      ? patch.accountMaturity
      : existing?.accountMaturity ?? null;

  let approximateMonthlySpend: Prisma.Decimal | null =
    existing?.approximateMonthlySpend ?? null;
  if (patch.approximateMonthlySpend !== undefined) {
    if (patch.approximateMonthlySpend == null) {
      approximateMonthlySpend = null;
    } else if (
      typeof patch.approximateMonthlySpend === 'number' &&
      Number.isFinite(patch.approximateMonthlySpend) &&
      patch.approximateMonthlySpend >= 0
    ) {
      approximateMonthlySpend = new Prisma.Decimal(patch.approximateMonthlySpend);
    }
  }

  let landingPageAnalysisJson = existing?.landingPageAnalysisJson ?? null;
  let landingPageAnalyzedAt = existing?.landingPageAnalyzedAt ?? null;
  let landingPageAnalyzedUrl = existing?.landingPageAnalyzedUrl ?? null;

  if (patch.landingPageAnalysis !== undefined) {
    if (patch.landingPageAnalysis == null) {
      landingPageAnalysisJson = null;
      landingPageAnalyzedAt = null;
      landingPageAnalyzedUrl = null;
    } else {
      landingPageAnalysisJson = JSON.stringify(patch.landingPageAnalysis);
      landingPageAnalyzedAt = new Date();
      landingPageAnalyzedUrl =
        patch.landingPageAnalyzedUrl ?? patch.landingPageAnalysis.url;
    }
  }

  const row = await prisma.clientAdvisoryProfile.upsert({
    where: { clientId },
    create: {
      clientId,
      websiteUrl,
      industryVertical,
      conversionType,
      accountMaturity,
      approximateMonthlySpend,
      landingPageAnalysisJson,
      landingPageAnalyzedAt,
      landingPageAnalyzedUrl,
    },
    update: {
      websiteUrl,
      industryVertical,
      conversionType,
      accountMaturity,
      approximateMonthlySpend,
      landingPageAnalysisJson,
      landingPageAnalyzedAt,
      landingPageAnalyzedUrl,
    },
  });

  return toDto(row);
}
