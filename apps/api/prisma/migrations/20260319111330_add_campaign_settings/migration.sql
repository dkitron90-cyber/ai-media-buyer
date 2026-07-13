-- CreateTable
CREATE TABLE "CampaignSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "settingsSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignSettings_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSettings_campaignId_key" ON "CampaignSettings"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignSettings_campaignId_idx" ON "CampaignSettings"("campaignId");
