import { randomUUID } from "crypto";
import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetNetWorthUseCase } from "../../../src/modules/metrics/use-cases/get-net-worth.use-case.js";
import { makeInMemoryMetricsRepository } from "../../repositories/in-memory-metrics.repository.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeCreditCardInvoice } from "../../factories/credit-card-invoice.factory.js";

describe("makeGetNetWorthUseCase", () => {
  it("should return assets, liabilities and netWorth for a user with only wallets", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const repo = makeInMemoryMetricsRepository();
    repo.wallets.push({ userId, balance: 1500, deletedAt: null });
    const getNetWorth = makeGetNetWorthUseCase(repo as any);

    // Act
    const result = await getNetWorth(userId);

    // Assert
    expect(result).toEqual({ assets: 1500, liabilities: 0, netWorth: 1500 });
  });

  it("should subtract unpaid credit card invoices from assets to compute netWorth", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const repo = makeInMemoryMetricsRepository();
    const getNetWorth = makeGetNetWorthUseCase(repo as any);

    repo.wallets.push({ userId, balance: 2000, deletedAt: null });

    const creditCard = makeFakeCreditCard({ userId });
    const creditCardId = randomUUID();
    repo.creditCards.push({ id: creditCardId, userId: creditCard.userId, deletedAt: null });
    repo.creditCardInvoices.push({
      ...makeFakeCreditCardInvoice({ creditCardId, totalAmount: 450, paid: false }),
      deletedAt: null,
    });

    // Act
    const result = await getNetWorth(userId);

    // Assert
    expect(result).toEqual({ assets: 2000, liabilities: 450, netWorth: 1550 });
  });
});
