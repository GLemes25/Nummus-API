import { describe, it, expect } from "vitest";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeDeleteCreditCardUseCase } from "../../../src/modules/credit-cards/use-cases/delete-credit-card.use-case.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("delete-credit-card use case", () => {
  it("should soft-delete a credit card so it is no longer findable", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const deleteCreditCard = makeDeleteCreditCardUseCase(repo as any);
    const input = makeFakeCreditCard();
    const created = await repo.create(input);

    // Act
    await deleteCreditCard({ creditCardId: created.id, userId: input.userId });

    // Assert — card is hidden from queries but still present in raw items
    const found = await repo.findById(created.id);
    expect(found).toBeNull();
    expect(repo.items[0]!.deletedAt).not.toBeNull();
  });

  it("should not affect other cards when soft-deleting a specific card", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const deleteCreditCard = makeDeleteCreditCardUseCase(repo as any);
    const userId = "user-1";
    const cardA = await repo.create(makeFakeCreditCard({ userId }));
    const cardB = await repo.create(makeFakeCreditCard({ userId }));

    // Act
    await deleteCreditCard({ creditCardId: cardA.id, userId });

    // Assert — only card A is deleted
    const foundA = await repo.findById(cardA.id);
    const foundB = await repo.findById(cardB.id);
    expect(foundA).toBeNull();
    expect(foundB).not.toBeNull();
  });

  it("should throw CREDIT_CARD_NOT_FOUND when card does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const deleteCreditCard = makeDeleteCreditCardUseCase(repo as any);

    // Act & Assert
    await expect(
      deleteCreditCard({ creditCardId: "non-existent-id", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_NOT_FOUND" });
  });

  it("should throw CREDIT_CARD_ACCESS_DENIED when user does not own the card", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const deleteCreditCard = makeDeleteCreditCardUseCase(repo as any);
    const input = makeFakeCreditCard({ userId: "owner-user" });
    const created = await repo.create(input);

    // Act & Assert
    await expect(
      deleteCreditCard({ creditCardId: created.id, userId: "attacker-user" }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_ACCESS_DENIED" });

    // Card must remain intact after the failed attempt
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
  });
});
