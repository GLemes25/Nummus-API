import { describe, it, expect } from "vitest";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeUpdateCreditCardUseCase } from "../../../src/modules/credit-cards/use-cases/update-credit-card.use-case.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("update-credit-card use case", () => {
  it("should update a credit card name successfully", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const input = makeFakeCreditCard();
    const created = await repo.create(input);

    // Act
    const result = await updateCreditCard({
      creditCardId: created.id,
      userId: input.userId,
      data: { name: "Novo Nome" },
    });

    // Assert
    expect(result?.name).toBe("Novo Nome");
    expect(repo.items[0]!.name).toBe("Novo Nome");
  });

  it("should update multiple fields in a single call", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const input = makeFakeCreditCard();
    const created = await repo.create(input);

    // Act
    const result = await updateCreditCard({
      creditCardId: created.id,
      userId: input.userId,
      data: { limit: 5000, closingDay: 10, dueDay: 20 },
    });

    // Assert
    expect(result?.limit).toBe(5000);
    expect(result?.closingDay).toBe(10);
    expect(result?.dueDay).toBe(20);
  });

  it("should allow renaming a card to its own current name without error", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const input = makeFakeCreditCard({ name: "Nubank" });
    const created = await repo.create(input);

    // Act & Assert — renaming to the same name must not trigger ALREADY_EXISTS
    await expect(
      updateCreditCard({ creditCardId: created.id, userId: input.userId, data: { name: "Nubank" } }),
    ).resolves.toBeDefined();
  });

  it("should throw CREDIT_CARD_NOT_FOUND when card does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);

    // Act & Assert
    await expect(
      updateCreditCard({ creditCardId: "non-existent-id", userId: "user-1", data: { name: "Test" } }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_NOT_FOUND" });
  });

  it("should throw CREDIT_CARD_ACCESS_DENIED when user does not own the card", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const input = makeFakeCreditCard({ userId: "owner-user" });
    const created = await repo.create(input);

    // Act & Assert
    await expect(
      updateCreditCard({ creditCardId: created.id, userId: "attacker-user", data: { name: "Hack" } }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_ACCESS_DENIED" });
  });

  it("should throw CREDIT_CARD_ALREADY_EXISTS when renaming to a name already in use by the same user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = "user-1";
    await repo.create(makeFakeCreditCard({ userId, name: "Nubank" }));
    const second = await repo.create(makeFakeCreditCard({ userId, name: "Itaú" }));

    // Act & Assert
    await expect(
      updateCreditCard({ creditCardId: second.id, userId, data: { name: "Nubank" } }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_ALREADY_EXISTS" });
  });

  it("should allow two different users to have cards with the same name", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    await repo.create(makeFakeCreditCard({ userId: "user-A", name: "Nubank" }));
    const cardB = await repo.create(makeFakeCreditCard({ userId: "user-B", name: "Itaú" }));

    // Act & Assert — user-B renaming to "Nubank" must succeed
    await expect(
      updateCreditCard({ creditCardId: cardB.id, userId: "user-B", data: { name: "Nubank" } }),
    ).resolves.toBeDefined();
  });

  it("should link an existing store card to a wallet owned by the same user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const created = await repo.create(makeFakeCreditCard({ userId }));

    // Act
    const result = await updateCreditCard({
      creditCardId: created.id,
      userId,
      data: { walletId: wallet.id },
    });

    // Assert
    expect(result?.walletId).toBe(wallet.id);
  });

  it("should throw WALLET_NOT_FOUND when linking to a wallet that does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = "user-1";
    const created = await repo.create(makeFakeCreditCard({ userId }));

    // Act & Assert
    await expect(
      updateCreditCard({ creditCardId: created.id, userId, data: { walletId: "non-existent-wallet" } }),
    ).rejects.toMatchObject({ code: "WALLET_NOT_FOUND" });
  });

  it("should throw WALLET_ACCESS_DENIED when linking to a wallet owned by another user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const walletRepo = makeInMemoryWalletRepository();
    const updateCreditCard = makeUpdateCreditCardUseCase(repo as any, walletRepo.findById);
    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId: "wallet-owner" }));
    const created = await repo.create(makeFakeCreditCard({ userId }));

    // Act & Assert
    await expect(
      updateCreditCard({ creditCardId: created.id, userId, data: { walletId: wallet.id } }),
    ).rejects.toMatchObject({ code: "WALLET_ACCESS_DENIED" });
  });
});
