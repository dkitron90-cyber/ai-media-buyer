-- CreateTable
CREATE TABLE "PlacementListEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "listType" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "displayName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "analysisId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlacementListEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlacementListEntry_campaignId_idx" ON "PlacementListEntry"("campaignId");

-- CreateIndex
CREATE INDEX "PlacementListEntry_campaignId_listType_idx" ON "PlacementListEntry"("campaignId", "listType");
