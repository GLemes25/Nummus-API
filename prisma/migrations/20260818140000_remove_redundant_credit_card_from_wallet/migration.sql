-- AlterEnum
BEGIN;
CREATE TYPE "WalletType_new" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT');
ALTER TABLE "public"."wallets" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "wallets" ALTER COLUMN "type" TYPE "WalletType_new" USING ("type"::text::"WalletType_new");
ALTER TYPE "WalletType" RENAME TO "WalletType_old";
ALTER TYPE "WalletType_new" RENAME TO "WalletType";
DROP TYPE "public"."WalletType_old";
ALTER TABLE "wallets" ALTER COLUMN "type" SET DEFAULT 'CHECKING';
COMMIT;

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "closingDay",
DROP COLUMN "creditLimit",
DROP COLUMN "dueDay";
