/*
  Warnings:

  - Added the required column `filePath` to the `UploadedReport` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UploadedReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "reportType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadStatus" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "fileSizeBytes" INTEGER,
    "checksum" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UploadedReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UploadedReport" ("campaignId", "checksum", "createdAt", "errorMessage", "fileName", "filePath", "fileSizeBytes", "id", "processedAt", "reportType", "updatedAt", "uploadStatus", "uploadedAt") SELECT "campaignId", "checksum", "createdAt", "errorMessage", "fileName", ('uploads/legacy-' || "id" || '-' || "fileName"), "fileSizeBytes", "id", "processedAt", "reportType", "updatedAt", "uploadStatus", "uploadedAt" FROM "UploadedReport";
DROP TABLE "UploadedReport";
ALTER TABLE "new_UploadedReport" RENAME TO "UploadedReport";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
