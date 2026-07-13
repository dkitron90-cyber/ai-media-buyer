-- CreateTable
CREATE TABLE "KeywordReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "keywordText" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeywordReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeywordReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "device" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeviceReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "placement" TEXT NOT NULL,
    "displayName" TEXT,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlacementReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlacementReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeographicReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeographicReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeographicReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemographicsReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "demographicType" TEXT NOT NULL,
    "demographicValue" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemographicsReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DemographicsReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudienceReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "audienceName" TEXT NOT NULL,
    "audienceType" TEXT,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudienceReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AudienceReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdScheduleReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdScheduleReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdScheduleReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignAnalysis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "analysisType" TEXT NOT NULL DEFAULT 'full_diagnosis',
    "evidenceStrength" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignAnalysis_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "conversionValue" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "roas" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CampaignReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KeywordReportRow_uploadedReportId_idx" ON "KeywordReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "KeywordReportRow_campaignId_idx" ON "KeywordReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "DeviceReportRow_uploadedReportId_idx" ON "DeviceReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "DeviceReportRow_campaignId_idx" ON "DeviceReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "PlacementReportRow_uploadedReportId_idx" ON "PlacementReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "PlacementReportRow_campaignId_idx" ON "PlacementReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "GeographicReportRow_uploadedReportId_idx" ON "GeographicReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "GeographicReportRow_campaignId_idx" ON "GeographicReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "DemographicsReportRow_uploadedReportId_idx" ON "DemographicsReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "DemographicsReportRow_campaignId_idx" ON "DemographicsReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "AudienceReportRow_uploadedReportId_idx" ON "AudienceReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "AudienceReportRow_campaignId_idx" ON "AudienceReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "AdScheduleReportRow_uploadedReportId_idx" ON "AdScheduleReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "AdScheduleReportRow_campaignId_idx" ON "AdScheduleReportRow"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAnalysis_campaignId_idx" ON "CampaignAnalysis"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignReportRow_uploadedReportId_idx" ON "CampaignReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "CampaignReportRow_campaignId_idx" ON "CampaignReportRow"("campaignId");
