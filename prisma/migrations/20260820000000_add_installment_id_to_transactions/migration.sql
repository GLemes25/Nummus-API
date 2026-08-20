-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "installmentId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_installmentId_idx" ON "transactions"("installmentId");
