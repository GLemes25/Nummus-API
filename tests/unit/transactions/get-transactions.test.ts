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
    expect(result.data[0].id).toBe(firstTx.id);
    expect(result.data[0].creditCardId).toBe(firstCardId);
  });

  it("should not return deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const cardId = faker.string.uuid();
    await makeCreditCardTx(userId, cardId);
    transactionRepo.items[0].deletedAt = new Date();

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: cardId });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.meta.totalCount).toBe(0);
  });
});
