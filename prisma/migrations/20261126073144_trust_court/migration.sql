-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "paidAt" DATETIME;

-- CreateTable
CREATE TABLE "TrustHearing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "prosecution" TEXT NOT NULL,
    "defense" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "conditions" TEXT,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustHearing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
