import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateRecurringTransactionUseCase } from "../../../src/modules/recurring-transactions/use-cases/create-recurring-transaction.use-case.js";
import { makeUpdateRecurringTransactionUseCase } from "../../../src/modules/recurring-transactions/use-cases/update-recurring-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryRecurringTransactionRepository } from "../../repositories/in-memory-recurring-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeRecurringTransaction } from "../../factories/recurring-transaction.factory.js";

describe("makeUpdateRecurringTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let recurringTransactionRepo: ReturnType<typeof makeInMemoryRecurringTransactionRepository>;
  let updateRecurringTransaction: ReturnType<typeof makeUpdateRecurringTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    recurringTransactionRepo = makeInMemoryRecurringTransactionRepository();

    updateRecurringTransaction = makeUpdateRecurringTransactionUseCase(
      recurringTransactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any
    );
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

  it("should update the master fields", async () => {
    // Arrange
    const { userId, recurringTransaction } = await createBaseRecurringTransaction();

    // Act
    const updated = await updateRecurringTransaction({
      recurringTransactionId: recurringTransaction.id,
      userId,
      data: { amount: 250, description: "Assinatura anual" },
    });

    // Assert
    expect(updated.amount).toBe(250);
    expect(updated.description).toBe("Assinatura anual");
  });

  it("should soft-delete future pending occurrences and regenerate them with the new values", async () => {
    // Arrange
    const { userId, recurringTransaction } = await createBaseRecurringTransaction();
    expect(recurringTransactionRepo.transactions).toHaveLength(12);
    const originalOccurrenceIds = recurringTransactionRepo.transactions.map((t) => t.id);

    // Act
    await updateRecurringTransaction({
      recurringTransactionId: recurringTransaction.id,
      userId,
      data: { amount: 999, startDate: new Date(2025, 0, 10) },
    });

    // Assert — the original occurrences are soft-deleted, replaced by new ones with the updated amount
    const deletedOriginal = recurringTransactionRepo.transactions.filter(
      (t) => originalOccurrenceIds.includes(t.id) && t.deletedAt !== null
    );
    expect(deletedOriginal).toHaveLength(12);

    const activeOccurrences = recurringTransactionRepo.transactions.filter((t) => t.deletedAt === null);
    expect(activeOccurrences).toHaveLength(12);
    expect(activeOccurrences.every((t) => t.amount === 999)).toBe(true);
  });

  it("should not touch already-realized (COMPLETED) occurrences", async () => {
    // Arrange
    const { userId, recurringTransaction } = await createBaseRecurringTransaction();
    const firstOccurrence = recurringTransactionRepo.transactions[0]!;
    firstOccurrence.status = "COMPLETED";

    // Act
    await updateRecurringTransaction({
      recurringTransactionId: recurringTransaction.id,
      userId,
      data: { amount: 999, startDate: new Date(2025, 0, 10) },
    });

    // Assert
    const untouched = recurringTransactionRepo.transactions.find((t) => t.id === firstOccurrence.id);
    expect(untouched?.deletedAt).toBeNull();
    expect(untouched?.amount).toBe(100);
  });

  it("should throw when the recurring transaction does not exist", async () => {
    // Act & Assert
    await expect(
      updateRecurringTransaction({
        recurringTransactionId: faker.string.uuid(),
        userId: faker.string.uuid(),
        data: { amount: 100 },
      })
    ).rejects.toMatchObject({
      code: "RECURRING_TRANSACTION_NOT_FOUND",
      message: "Transação recorrente não encontrada",
    });
  });

  it("should throw when the user does not own the recurring transaction", async () => {
    // Arrange
    const { recurringTransaction } = await createBaseRecurringTransaction();

    // Act & Assert
    await expect(
      updateRecurringTransaction({
        recurringTransactionId: recurringTransaction.id,
        userId: faker.string.uuid(),
        data: { amount: 100 },
      })
    ).rejects.toMatchObject({
      code: "RECURRING_TRANSACTION_ACCESS_DENIED",
      message: "Você não tem permissão para editar esta transação recorrente",
    });
  });
});
