import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateRecurringTransactionUseCase } from "../../../src/modules/recurring-transactions/use-cases/create-recurring-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryRecurringTransactionRepository } from "../../repositories/in-memory-recurring-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeRecurringTransaction } from "../../factories/recurring-transaction.factory.js";

describe("makeCreateRecurringTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let recurringTransactionRepo: ReturnType<typeof makeInMemoryRecurringTransactionRepository>;
  let createRecurringTransaction: ReturnType<typeof makeCreateRecurringTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    recurringTransactionRepo = makeInMemoryRecurringTransactionRepository();
    createRecurringTransaction = makeCreateRecurringTransactionUseCase(
      recurringTransactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any
    );
  });

  it("should create the master recurring transaction and generate 12 monthly occurrences", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    const recurringTransaction = await createRecurringTransaction(
      makeFakeRecurringTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        frequency: "MONTHLY",
        startDate: new Date(2025, 0, 10),
      })
    );

    // Assert
    expect(recurringTransactionRepo.items).toHaveLength(1);
    expect(recurringTransaction.walletId).toBe(wallet.id);
    expect(recurringTransactionRepo.transactions).toHaveLength(12);
    expect(recurringTransactionRepo.transactions.every((t) => t.status === "PENDING")).toBe(true);
    expect(
      recurringTransactionRepo.transactions.every(
        (t) => t.recurringTransactionId === recurringTransaction.id
      )
    ).toBe(true);
  });

  it("should generate one occurrence per day for a DAILY recurring transaction", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    await createRecurringTransaction(
      makeFakeRecurringTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        frequency: "DAILY",
        startDate: new Date(2025, 0, 1),
      })
    );

    // Assert — 12 months starting Jan 1, 2025 (not a leap year) = 365 days
    expect(recurringTransactionRepo.transactions).toHaveLength(365);
  });

  it("should throw when the wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act & Assert
    await expect(
      createRecurringTransaction(
        makeFakeRecurringTransaction({
          userId,
          walletId: faker.string.uuid(),
          categoryId: category.id,
        })
      )
    ).rejects.toMatchObject({
      code: "WALLET_NOT_FOUND",
      message: "Carteira não encontrada",
    });

    expect(recurringTransactionRepo.items).toHaveLength(0);
  });

  it("should throw when the category does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));

    // Act & Assert
    await expect(
      createRecurringTransaction(
        makeFakeRecurringTransaction({
          userId,
          walletId: wallet.id,
          categoryId: faker.string.uuid(),
        })
      )
    ).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      message: "Categoria não encontrada",
    });

    expect(recurringTransactionRepo.items).toHaveLength(0);
  });
});
