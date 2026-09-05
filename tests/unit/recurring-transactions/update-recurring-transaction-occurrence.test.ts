import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateRecurringTransactionUseCase } from "../../../src/modules/recurring-transactions/use-cases/create-recurring-transaction.use-case.js";
import { makeUpdateRecurringTransactionOccurrenceUseCase } from "../../../src/modules/recurring-transactions/use-cases/update-recurring-transaction-occurrence.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryRecurringTransactionRepository } from "../../repositories/in-memory-recurring-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeRecurringTransaction } from "../../factories/recurring-transaction.factory.js";

describe("makeUpdateRecurringTransactionOccurrenceUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let recurringTransactionRepo: ReturnType<typeof makeInMemoryRecurringTransactionRepository>;
  let updateOccurrence: ReturnType<typeof makeUpdateRecurringTransactionOccurrenceUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    recurringTransactionRepo = makeInMemoryRecurringTransactionRepository();
    updateOccurrence = makeUpdateRecurringTransactionOccurrenceUseCase(recurringTransactionRepo as any);
  });

  const createBaseRecurringTransaction = async () => {
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const createRecurringTransaction = makeCreateRecurringTransactionUseCase(
      recurringTransactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any
    );

    const recurringTransaction = await createRecurringTransaction(
      makeFakeRecurringTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        frequency: "MONTHLY",
        amount: 100,
        startDate: new Date(2025, 0, 10),
      })
    );

    return { userId, wallet, category, recurringTransaction };
  };

  it("should update only the targeted occurrence and unlink it from the master", async () => {
    // Arrange
    const { userId, recurringTransaction } = await createBaseRecurringTransaction();
    const targetOccurrence = recurringTransactionRepo.transactions[3]!;
    const otherOccurrence = recurringTransactionRepo.transactions[4]!;

    // Act
    const updated = await updateOccurrence({
      recurringTransactionId: recurringTransaction.id,
      transactionId: targetOccurrence.id,
      userId,
      data: { amount: 777, description: "Ajuste pontual" },
    });

    // Assert
    expect(updated.amount).toBe(777);
    expect(updated.description).toBe("Ajuste pontual");
    expect(updated.recurringTransactionId).toBeNull();

    const untouched = recurringTransactionRepo.transactions.find((t) => t.id === otherOccurrence.id);
    expect(untouched?.amount).toBe(100);
    expect(untouched?.recurringTransactionId).toBe(recurringTransaction.id);
  });

  it("should throw when the occurrence does not belong to the given master", async () => {
    // Arrange
    const { userId, recurringTransaction } = await createBaseRecurringTransaction();

    // Act & Assert
    await expect(
      updateOccurrence({
        recurringTransactionId: recurringTransaction.id,
        transactionId: faker.string.uuid(),
        userId,
        data: { amount: 500 },
      })
    ).rejects.toMatchObject({
      code: "RECURRING_TRANSACTION_OCCURRENCE_NOT_FOUND",
    });
  });

  it("should throw when the user does not own the occurrence", async () => {
    // Arrange
    const { recurringTransaction } = await createBaseRecurringTransaction();
    const targetOccurrence = recurringTransactionRepo.transactions[0]!;

    // Act & Assert
    await expect(
      updateOccurrence({
        recurringTransactionId: recurringTransaction.id,
        transactionId: targetOccurrence.id,
        userId: faker.string.uuid(),
        data: { amount: 500 },
      })
    ).rejects.toMatchObject({
      code: "RECURRING_TRANSACTION_ACCESS_DENIED",
    });
  });
});
