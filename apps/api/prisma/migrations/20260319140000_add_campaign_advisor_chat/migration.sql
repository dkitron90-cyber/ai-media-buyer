-- CreateTable
CREATE TABLE "CampaignAdvisorChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignAdvisorChatMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CampaignAdvisorChatMessage_campaignId_createdAt_idx" ON "CampaignAdvisorChatMessage"("campaignId", "createdAt");
