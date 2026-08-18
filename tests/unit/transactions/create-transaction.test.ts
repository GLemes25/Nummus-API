import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeTransaction } from "../../factories/transaction.factory.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeCreateTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let creditCards: Array<{ id: string; closingDay: number; dueDay: number; userId: string }>;
  let createTransaction: ReturnType<typeof makeCreateTransactionUseCase>;

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
  });

  it("should increase wallet balance when creating an INCOME transaction", async () => {
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
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 500,
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(1500);
    expect(transactionRepo.items).toHaveLength(1);
    expect(transactionRepo.items[0]?.type).toBe("INCOME");
  });

  it("should decrease wallet balance when creating an EXPENSE transaction", async () => {
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
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(700);
    expect(transactionRepo.items[0]?.type).toBe("EXPENSE");
  });

  it("should pin wallet balance to the exact amount for a BALANCE_ADJUSTMENT transaction", async () => {
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
        type: "BALANCE_ADJUSTMENT",
        paymentMethod: "CASH",
        amount: 250,
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(250);
  });

  it("should throw when the category does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: wallet.id,
          categoryId: faker.string.uuid(),
          type: "EXPENSE",
          paymentMethod: "CASH",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      message: "Categoria não encontrada",
    });
  });

  it("should throw when the wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: faker.string.uuid(),
          categoryId: category.id,
          type: "EXPENSE",
          paymentMethod: "CASH",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "WALLET_NOT_FOUND",
      message: "Carteira não encontrada",
    });
  });

  it("should link an EXPENSE transaction to the credit card's open invoice without touching any wallet balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { ...makeFakeCreditCard({ userId }), id: faker.string.uuid() };
    creditCards.push(creditCard);

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT_CARD",
        amount: 300,
      })
    );

    // Assert
    expect(transaction.creditCardId).toBe(creditCard.id);
    expect(transaction.walletId).toBeNull();
    expect(transaction.invoiceId).not.toBeNull();
    expect(transactionRepo.invoices).toHaveLength(1);
    expect(transactionRepo.invoices[0]?.totalAmount).toBe(300);

    const untouchedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(untouchedWallet?.balance).toBe(1000);
  });

  it("should reuse the same open invoice for two transactions in the same billing period", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { ...makeFakeCreditCard({ userId }), id: faker.string.uuid() };
    creditCards.push(creditCard);
    const sameDay = new Date();

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT_CARD",
        amount: 100,
        date: sameDay,
      })
    );
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT_CARD",
        amount: 50,
        date: sameDay,
      })
    );

    // Assert
    expect(transactionRepo.invoices).toHaveLength(1);
    expect(transactionRepo.invoices[0]?.totalAmount).toBe(150);
    expect(transactionRepo.items).toHaveLength(2);
    expect(transactionRepo.items[0]?.invoiceId).toBe(transactionRepo.items[1]?.invoiceId);
  });

  it("should throw when the credit card does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: undefined,
          creditCardId: faker.string.uuid(),
          categoryId: category.id,
          type: "EXPENSE",
          paymentMethod: "CREDIT_CARD",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "CREDIT_CARD_NOT_FOUND",
      message: "Cartão de crédito não encontrado",
    });
  });
});
