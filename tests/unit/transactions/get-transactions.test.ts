import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetTransactionsUseCase } from "../../../src/modules/transactions/use-cases/get-transactions.use-case.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";

describe("makeGetTransactionsUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let getTransactions: ReturnType<typeof makeGetTransactionsUseCase>;

  const makeCreditCardTx = (userId: string, creditCardId: string) =>
    transactionRepo.createWithInvoiceUpdate({
      amount: 100,
      type: "EXPENSE",
      date: new Date(),
      description: "test",
      creditCardId,
      categoryId: faker.string.uuid(),
      userId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);
    getTransactions = makeGetTransactionsUseCase(transactionRepo as any);
  });

  it("should return all transactions for the user", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const anotherUserId = faker.string.uuid();
    await makeCreditCardTx(userId, faker.string.uuid());
    await makeCreditCardTx(userId, faker.string.uuid());
    await makeCreditCardTx(anotherUserId, faker.string.uuid());

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20 });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(result.meta.totalCount).toBe(2);
  });

  it("should filter transactions by creditCardId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const firstCardId = faker.string.uuid();
    const secondCardId = faker.string.uuid();
    const firstTx = await makeCreditCardTx(userId, firstCardId);
    await makeCreditCardTx(userId, secondCardId);
    await makeCreditCardTx(userId, faker.string.uuid());

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: firstCardId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.meta.totalCount).toBe(1);
    expect(result.data[0]!.id).toBe(firstTx.id);
    expect(result.data[0]!.creditCardId).toBe(firstCardId);
  });

  it("should not return deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const cardId = faker.string.uuid();
    await makeCreditCardTx(userId, cardId);
    transactionRepo.items[0]!.deletedAt = new Date();

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: cardId });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.meta.totalCount).toBe(0);
  });

  it("should filter transactions by walletId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const targetWalletId = faker.string.uuid();
    const otherWalletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "target",
      walletId: targetWalletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 50,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "other",
      walletId: otherWalletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 50,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, walletId: targetWalletId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.walletId).toBe(targetWalletId);
  });

  it("should filter transactions by type", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 500,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "income",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 500,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "expense",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 400,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, type: "INCOME" });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.type).toBe("INCOME");
  });

  it("should filter transactions by categoryId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const targetCategoryId = faker.string.uuid();
    const otherCategoryId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "target category",
      walletId,
      categoryId: targetCategoryId,
      userId,
      newBalance: 900,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 50,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "other category",
      walletId,
      categoryId: otherCategoryId,
      userId,
      newBalance: 850,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, categoryId: targetCategoryId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.categoryId).toBe(targetCategoryId);
  });

  it("should filter transactions by date range", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    const inRange = new Date("2024-06-15T10:00:00Z");
    const outOfRange = new Date("2024-04-01T10:00:00Z");

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 200,
      type: "INCOME",
      paymentMethod: "CASH",
      date: inRange,
      description: "in range",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 300,
      type: "INCOME",
      paymentMethod: "CASH",
      date: outOfRange,
      description: "out of range",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 500,
    });

    // Act
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      startDate: new Date("2024-06-01T00:00:00Z"),
      endDate: new Date("2024-06-30T23:59:59Z"),
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("in range");
  });

  it("should not return a future installment (October) when filtering transactions by the September date range", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createManyWalletInstallments(
      [
        {
          amount: 100,
          type: "EXPENSE",
          paymentMethod: "CASH",
          date: new Date(2024, 8, 10), // September 10, 2024
          description: "Geladeira (1/2)",
          walletId,
          categoryId: faker.string.uuid(),
          userId,
          installmentId: faker.string.uuid(),
          installmentNumber: 1,
        },
        {
          amount: 100,
          type: "EXPENSE",
          paymentMethod: "CASH",
          date: new Date(2024, 9, 10), // October 10, 2024
          description: "Geladeira (2/2)",
          walletId,
          categoryId: faker.string.uuid(),
          userId,
          installmentId: faker.string.uuid(),
          installmentNumber: 2,
        },
      ],
      walletId,
      900
    );

    // Act — filter strictly within September
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      startDate: new Date(2024, 8, 1),
      endDate: new Date(2024, 8, 30, 23, 59, 59, 999),
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("Geladeira (1/2)");
    expect(result.meta.totalCount).toBe(1);
  });

  it("should paginate results and return the correct page slice", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    // Create 5 transactions
    for (let i = 0; i < 5; i++) {
      await transactionRepo.createWithBalanceUpdate({
        storedAmount: 10 * (i + 1),
        type: "EXPENSE",
        paymentMethod: "CASH",
        date: new Date(2024, 0, i + 1),
        description: `tx-${i + 1}`,
        walletId,
        categoryId: faker.string.uuid(),
        userId,
        newBalance: 1000 - 10 * (i + 1),
      });
    }

    // Act — page 2 with limit 2 should return items 3 and 4 (sorted desc by date)
    const result = await getTransactions({ userId, page: 2, limit: 2 });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(result.meta.totalCount).toBe(5);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.page).toBe(2);
  });

  it("should filter transactions by search text and type combined", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 35,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Uber to the airport",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 965,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 1500,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Uber driver payout",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 2465,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 20,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Grocery store",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 2445,
    });

    // Act
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      search: "uber",
      type: "EXPENSE",
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("Uber to the airport");
    expect(result.meta.totalCount).toBe(1);
  });

  it("should return empty data with totalCount 0 when no transactions match", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20 });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.meta.totalCount).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });
});
