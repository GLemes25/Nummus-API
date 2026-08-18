-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT_CARD');

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "closingDay" INTEGER,
ADD COLUMN     "creditLimit" DECIMAL(12,2),
ADD COLUMN     "dueDay" INTEGER,
ADD COLUMN     "type" "WalletType" NOT NULL DEFAULT 'CHECKING';
