-- CreateTable
CREATE TABLE "ClientAdvisoryProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "websiteUrl" TEXT,
    "industryVertical" TEXT,
    "conversionType" TEXT,
    "accountMaturity" TEXT,
    "approximateMonthlySpend" REAL,
    "landingPageAnalysisJson" TEXT,
    "landingPageAnalyzedAt" DATETIME,
    "landingPageAnalyzedUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientAdvisoryProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAdvisoryProfile_clientId_key" ON "ClientAdvisoryProfile"("clientId");

-- CreateIndex
CREATE INDEX "ClientAdvisoryProfile_clientId_idx" ON "ClientAdvisoryProfile"("clientId");
