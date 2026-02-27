-- AlterTable
ALTER TABLE "PilotResponse" ADD COLUMN     "decisionMinutes" DOUBLE PRECISION,
ADD COLUMN     "previousMethodMinutes" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
