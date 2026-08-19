import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateCreditCardUseCase } from "../../../src/modules/credit-cards/use-cases/create-credit-card.use-case.js";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeCreateCreditCardUseCase", () => {
  it("should create a credit card successfully", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any);
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

  it("should throw CREDIT_CARD_ALREADY_EXISTS when creating two cards with the same name for the same user", async () => {
    // Arrange
    const repo = makeInMemoryCreditCardRepository();
    const createCreditCard = makeCreateCreditCardUseCase(repo as any);
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
    const createCreditCard = makeCreateCreditCardUseCase(repo as any);
    const cardName = "Shared Card Name";

    // Act
    await createCreditCard(makeFakeCreditCard({ userId: faker.string.uuid(), name: cardName }));
    await createCreditCard(makeFakeCreditCard({ userId: faker.string.uuid(), name: cardName }));

    // Assert
    expect(repo.items).toHaveLength(2);
  });
});
