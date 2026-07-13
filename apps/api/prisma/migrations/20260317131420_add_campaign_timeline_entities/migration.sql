/*
  Warnings:

  - Added the required column `title` to the `CampaignEvent` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CampaignEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CampaignEvent" ("campaignId", "createdAt", "id", "metadataJson", "occurredAt", "type") SELECT "campaignId", "createdAt", "id", "metadataJson", "occurredAt", "type" FROM "CampaignEvent";
DROP TABLE "CampaignEvent";
ALTER TABLE "new_CampaignEvent" RENAME TO "CampaignEvent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
