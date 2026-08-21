import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateCreditCardUseCase } from "../../../src/modules/credit-cards/use-cases/create-credit-card.use-case.js";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("makeCreateCreditCardUseCase", () => {
  it("should create a credit card successfully", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = faker.string.uuid();
    const input = makeFakeCreditCard({ userId });

    // Act
    const card = await createCreditCard(input);

    // Assert
    expect(card.name).toBe(input.name);
    expect(card.limit).toBe(input.limit);
    expect(card.closingDay).toBe(input.closingDay);
    expect(card.dueDay).toBe(input.dueDay);
    expect(card.userId).toBe(userId);
    expect(repo.items).toHaveLength(1);
  });

  it("should create a store card without a linked wallet", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const input = makeFakeCreditCard();

    // Act
    const card = await createCreditCard(input);

    // Assert
    expect(card.walletId).toBeNull();
  });

  it("should create a credit card linked to an existing wallet owned by the same user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const input = makeFakeCreditCard({ userId, walletId: wallet.id });

    // Act
    const card = await createCreditCard(input);

    // Assert
    expect(card.walletId).toBe(wallet.id);
  });

  it("should throw WALLET_NOT_FOUND when the linked wallet does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = faker.string.uuid();
    const input = makeFakeCreditCard({ userId, walletId: "non-existent-wallet" });

    // Act & Assert
    await expect(createCreditCard(input)).rejects.toMatchObject({ code: "WALLET_NOT_FOUND" });
    expect(repo.items).toHaveLength(0);
  });

  it("should throw WALLET_ACCESS_DENIED when the wallet belongs to a different user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const wallet = await walletRepo.create(makeFakeWallet({ userId: "wallet-owner" }));
    const input = makeFakeCreditCard({ userId: "attacker-user", walletId: wallet.id });

    // Act & Assert
    await expect(createCreditCard(input)).rejects.toMatchObject({ code: "WALLET_ACCESS_DENIED" });
    expect(repo.items).toHaveLength(0);
  });

  it("should throw CREDIT_CARD_ALREADY_EXISTS when creating two cards with the same name for the same user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = faker.string.uuid();
    const input = makeFakeCreditCard({ userId, name: "My Visa" });

    await createCreditCard(input);

    // Act & Assert
    await expect(createCreditCard(input)).rejects.toMatchObject({
      code: "CREDIT_CARD_ALREADY_EXISTS",
      message: "Já existe um cartão de crédito com este nome",
      statusCode: 409,
    });
    expect(repo.items).toHaveLength(1);
  });

  it("should allow two different users to have credit cards with the same name", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any, walletRepo.findById);
    const cardName = "Shared Card Name";

    // Act
    await createCreditCard(makeFakeCreditCard({ userId: faker.string.uuid(), name: cardName }));
    await createCreditCard(makeFakeCreditCard({ userId: faker.string.uuid(), name: cardName }));

    // Assert
    expect(repo.items).toHaveLength(2);
  });
});
