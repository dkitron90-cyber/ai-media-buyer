-- CreateTable
CREATE TABLE "SearchTermReportRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedReportId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "searchTerm" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" REAL NOT NULL DEFAULT 0,
    "ctr" REAL,
    "cpc" REAL,
    "cpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchTermReportRow_uploadedReportId_fkey" FOREIGN KEY ("uploadedReportId") REFERENCES "UploadedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SearchTermReportRow_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SearchTermReportRow_uploadedReportId_idx" ON "SearchTermReportRow"("uploadedReportId");

-- CreateIndex
CREATE INDEX "SearchTermReportRow_campaignId_idx" ON "SearchTermReportRow"("campaignId");
