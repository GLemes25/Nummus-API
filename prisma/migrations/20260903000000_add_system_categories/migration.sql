-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_systemId_key" ON "categories"("userId", "systemId");
