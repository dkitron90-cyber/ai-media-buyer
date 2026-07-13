-- CreateTable
CREATE TABLE "ActionImpactSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actionId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionImpactSnapshot_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionPlanItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActionImpactSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActionImpactSnapshot_campaignId_idx" ON "ActionImpactSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "ActionImpactSnapshot_actionId_idx" ON "ActionImpactSnapshot"("actionId");

-- CreateIndex
CREATE INDEX "ActionImpactSnapshot_actionId_snapshotType_idx" ON "ActionImpactSnapshot"("actionId", "snapshotType");
