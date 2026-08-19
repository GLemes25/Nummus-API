-- AlterEnum: rename PaymentMethod values to shorter, domain-focused names
-- BANK_TRANSFER → TRANSFER, CREDIT_CARD → CREDIT, DEBIT_CARD → DEBIT
-- ALTER TYPE … RENAME VALUE is safe: updates the enum label in-place,
-- existing rows automatically reflect the new name via the pg_enum OID lookup.
ALTER TYPE "PaymentMethod" RENAME VALUE 'BANK_TRANSFER' TO 'TRANSFER';
ALTER TYPE "PaymentMethod" RENAME VALUE 'CREDIT_CARD' TO 'CREDIT';
ALTER TYPE "PaymentMethod" RENAME VALUE 'DEBIT_CARD' TO 'DEBIT';
