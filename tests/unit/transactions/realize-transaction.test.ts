import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeRealizeTransactionUseCase } from "../../../src/modules/transactions/use-cases/realize-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeTransaction } from "../../factories/transaction.factory.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeRealizeTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let creditCards: Array<{ id: string; closingDay: number; dueDay: number; userId: string }>;
  let createTransaction: ReturnType<typeof makeCreateTransactionUseCase>;
  let realizeTransaction: ReturnType<typeof makeRealizeTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);
    creditCards = [];
    createTransaction = makeCreateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any,
      async (id) => creditCards.find((c) => c.id === id) ?? null
    );
    realizeTransaction = makeRealizeTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any
    );
  });

  it("should not touch the wallet balance when a transaction is created as PENDING", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
        status: "PENDING",
      })
    );

    // Assert
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(1000);
    expect(transactionRepo.items[0]?.status).toBe("PENDING");
  });

  it("should discount the wallet balance when realizing a pending EXPENSE", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
        status: "PENDING",
      })
    );

    // Act
    const realized = await realizeTransaction({ transactionId: transaction.id, userId });

    // Assert
    expect(realized?.status).toBe("COMPLETED");
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(700);
  });

  it("should increase the wallet balance when realizing a pending INCOME", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "INCOME",
        paymentMethod: "PIX",
        amount: 200,
        status: "PENDING",
      })
    );

    // Act
    const realized = await realizeTransaction({ transactionId: transaction.id, userId });

    // Assert
    expect(realized?.status).toBe("COMPLETED");
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(700);
  });

  it("should only change the status of a pending CREDIT transaction without touching any wallet", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { ...makeFakeCreditCard({ userId }), id: faker.string.uuid() };
    creditCards.push(creditCard);

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 300,
        status: "PENDING",
      })
    );

    // Act
    const realized = await realizeTransaction({ transactionId: transaction.id, userId });

    // Assert
    expect(realized?.status).toBe("COMPLETED");
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(1000);
  });

  it("should throw TRANSACTION_ALREADY_REALIZED when the transaction is already COMPLETED", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 100,
      })
    );

    // Act & Assert
    await expect(
      realizeTransaction({ transactionId: transaction.id, userId })
    ).rejects.toMatchObject({
      code: "TRANSACTION_ALREADY_REALIZED",
      statusCode: 409,
    });
  });

  it("should throw TRANSACTION_NOT_FOUND when the transaction does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act & Assert
    await expect(
      realizeTransaction({ transactionId: faker.string.uuid(), userId })
    ).rejects.toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw TRANSACTION_ACCESS_DENIED when realizing another user's transaction", async () => {
    // Arrange
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId: ownerId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId: ownerId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId: ownerId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 100,
        status: "PENDING",
      })
    );

    // Act & Assert
    await expect(
      realizeTransaction({ transactionId: transaction.id, userId: otherUserId })
    ).rejects.toMatchObject({
      code: "TRANSACTION_ACCESS_DENIED",
      statusCode: 403,
    });
  });
});
