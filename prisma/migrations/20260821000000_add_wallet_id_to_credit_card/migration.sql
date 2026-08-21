-- AlterTable
ALTER TABLE "credit_cards" ADD COLUMN     "walletId" TEXT;

-- CreateIndex
CREATE INDEX "credit_cards_walletId_idx" ON "credit_cards"("walletId");

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
