import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetMonthlySummaryUseCase } from "../../../src/modules/metrics/use-cases/get-monthly-summary.use-case.js";
import { makeInMemoryMetricsRepository } from "../../repositories/in-memory-metrics.repository.js";

const aug = (day: number) => new Date(2024, 7, day, 10); // month index 7 = August
const jul = (day: number) => new Date(2024, 6, day, 10); // month index 6 = July

const AUGUST_RANGE = { startDate: aug(1), endDate: new Date(2024, 7, 31, 23, 59, 59, 999) };

describe("makeGetMonthlySummaryUseCase", () => {
  let repo: ReturnType<typeof makeInMemoryMetricsRepository>;
  let getMonthlySummary: ReturnType<typeof makeGetMonthlySummaryUseCase>;

  beforeEach(() => {
    repo = makeInMemoryMetricsRepository();
    getMonthlySummary = makeGetMonthlySummaryUseCase(repo as any);
  });

  it("should return zeroed totals when there are no transactions in the period", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result).toEqual({ totalIncome: 0, totalExpense: 0, balance: 0 });
  });

  it("should sum income and expense separately and compute the balance", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(1), deletedAt: null },
      { userId, walletId: "w1", amount: 500, type: "INCOME", paymentMethod: "CASH", date: aug(10), deletedAt: null },
      { userId, walletId: "w1", amount: 300, type: "EXPENSE", paymentMethod: "CASH", date: aug(5), deletedAt: null },
      { userId, walletId: "w1", amount: 200, type: "EXPENSE", paymentMethod: "DEBIT", date: aug(15), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result).toEqual({ totalIncome: 1500, totalExpense: 500, balance: 1000 });
  });

  it("should exclude TRANSFER transactions (invoice payments and inter-wallet transfers) from the totals", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(1), deletedAt: null },
      { userId, walletId: "w1", amount: 300, type: "EXPENSE", paymentMethod: "CASH", date: aug(5), deletedAt: null },
      // Invoice payment via TRANSFER (must NOT be counted)
      { userId, walletId: "w1", amount: 500, type: "EXPENSE", paymentMethod: "TRANSFER", date: aug(10), deletedAt: null },
      // Inter-wallet transfer via TRANSFER (must NOT be counted)
      { userId, walletId: "w1", amount: 400, type: "INCOME", paymentMethod: "TRANSFER", date: aug(12), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result).toEqual({ totalIncome: 1000, totalExpense: 300, balance: 700 });
  });

  it("should exclude BALANCE_ADJUSTMENT transactions from the totals", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(1), deletedAt: null },
      { userId, walletId: "w1", amount: 999, type: "BALANCE_ADJUSTMENT" as any, paymentMethod: "CASH", date: aug(3), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result).toEqual({ totalIncome: 1000, totalExpense: 0, balance: 1000 });
  });

  it("should not include transactions outside the requested period", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(15), deletedAt: null },
      { userId, walletId: "w1", amount: 5000, type: "INCOME", paymentMethod: "PIX", date: jul(20), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result.totalIncome).toBe(1000);
  });

  it("should not include soft-deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(5), deletedAt: new Date() },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result).toEqual({ totalIncome: 0, totalExpense: 0, balance: 0 });
  });

  it("should not include transactions from another user", async () => {
    // Arrange
    const userA = faker.string.uuid();
    const userB = faker.string.uuid();

    repo.transactions.push(
      { userId: userA, walletId: "w1", amount: 1000, type: "INCOME", paymentMethod: "PIX", date: aug(5), deletedAt: null },
      { userId: userB, walletId: "w2", amount: 5000, type: "INCOME", paymentMethod: "PIX", date: aug(5), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId: userA, ...AUGUST_RANGE });

    // Assert
    expect(result.totalIncome).toBe(1000);
  });

  it("should round the totals and balance to 2 decimal places", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 10.005, type: "INCOME", paymentMethod: "PIX", date: aug(1), deletedAt: null },
      { userId, walletId: "w1", amount: 20.005, type: "INCOME", paymentMethod: "PIX", date: aug(2), deletedAt: null },
    );

    // Act
    const result = await getMonthlySummary({ userId, ...AUGUST_RANGE });

    // Assert
    expect(result.totalIncome).toBe(Math.round((10.005 + 20.005) * 100) / 100);
  });
});
