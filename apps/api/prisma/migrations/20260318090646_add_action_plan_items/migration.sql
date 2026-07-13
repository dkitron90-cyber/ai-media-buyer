-- CreateTable
CREATE TABLE "ActionPlanItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "analysisId" INTEGER,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "expectedImpact" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionPlanItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActionPlanItem_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CampaignAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActionPlanItem_campaignId_idx" ON "ActionPlanItem"("campaignId");

-- CreateIndex
CREATE INDEX "ActionPlanItem_analysisId_idx" ON "ActionPlanItem"("analysisId");
