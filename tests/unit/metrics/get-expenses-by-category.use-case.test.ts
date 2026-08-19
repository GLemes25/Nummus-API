import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetExpensesByCategoryUseCase } from "../../../src/modules/metrics/use-cases/get-expenses-by-category.use-case.js";
import { makeInMemoryMetricsRepository } from "../../repositories/in-memory-metrics.repository.js";

// Pins time to August 2024 so month/year defaults are predictable
const FIXED_NOW = new Date("2024-08-15T12:00:00.000Z");

const aug = (day: number) => new Date(2024, 7, day, 10);  // month index 7 = August
const jul = (day: number) => new Date(2024, 6, day, 10);  // month index 6 = July

describe("makeGetExpensesByCategoryUseCase", () => {
  let repo: ReturnType<typeof makeInMemoryMetricsRepository>;
  let getExpensesByCategory: ReturnType<typeof makeGetExpensesByCategoryUseCase>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    repo = makeInMemoryMetricsRepository();
    getExpensesByCategory = makeGetExpensesByCategoryUseCase(repo as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return an empty array when there are no expenses in the period", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toEqual([]);
  });

  it("should group expenses by category and sum the amounts", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const foodCategory = { name: "Food", color: "#ff0000", icon: "utensils" };

    repo.transactions.push(
      { userId, walletId: null, amount: 100, type: "EXPENSE", date: aug(5), deletedAt: null, categoryId: "cat-food", category: foodCategory },
      { userId, walletId: null, amount: 50, type: "EXPENSE", date: aug(10), deletedAt: null, categoryId: "cat-food", category: foodCategory },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Food");
    expect(result[0]!.amount).toBe(150);
  });

  it("should group expenses without a category under 'Sem categoria'", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: null, amount: 75, type: "EXPENSE", date: aug(3), deletedAt: null, categoryId: null, category: null },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Sem categoria");
    expect(result[0]!.color).toBe("#9ca3af");
    expect(result[0]!.icon).toBe("help-circle");
    expect(result[0]!.amount).toBe(75);
  });

  it("should not include transactions outside the requested month", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = { name: "Transport", color: "#0000ff", icon: "car" };

    // August expense (in range)
    repo.transactions.push(
      { userId, walletId: null, amount: 200, type: "EXPENSE", date: aug(15), deletedAt: null, categoryId: "cat-transport", category },
    );
    // July expense (out of range)
    repo.transactions.push(
      { userId, walletId: null, amount: 999, type: "EXPENSE", date: jul(20), deletedAt: null, categoryId: "cat-transport", category },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.amount).toBe(200);
  });

  it("should not include INCOME transactions, only EXPENSE", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: "w1", amount: 1000, type: "INCOME", date: aug(1), deletedAt: null, categoryId: "cat-salary", category: { name: "Salary", color: "#00ff00", icon: "dollar" } },
      { userId, walletId: null, amount: 50, type: "EXPENSE", date: aug(5), deletedAt: null, categoryId: "cat-food", category: { name: "Food", color: "#ff0000", icon: "utensils" } },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Food");
  });

  it("should not include soft-deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();

    repo.transactions.push(
      { userId, walletId: null, amount: 300, type: "EXPENSE", date: aug(10), deletedAt: new Date(), categoryId: "cat-food", category: { name: "Food", color: "#ff0000", icon: "utensils" } },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should not include expenses from another user", async () => {
    // Arrange
    const userA = faker.string.uuid();
    const userB = faker.string.uuid();
    const category = { name: "Food", color: "#ff0000", icon: "utensils" };

    repo.transactions.push(
      { userId: userA, walletId: null, amount: 100, type: "EXPENSE", date: aug(5), deletedAt: null, categoryId: "cat-food", category },
      { userId: userB, walletId: null, amount: 500, type: "EXPENSE", date: aug(5), deletedAt: null, categoryId: "cat-food", category },
    );

    // Act
    const result = await getExpensesByCategory({ userId: userA, month: 8, year: 2024 });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.amount).toBe(100);
  });

  it("should round the grouped amount to 2 decimal places", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = { name: "Food", color: "#ff0000", icon: "utensils" };

    repo.transactions.push(
      { userId, walletId: null, amount: 10.005, type: "EXPENSE", date: aug(1), deletedAt: null, categoryId: "cat-food", category },
      { userId, walletId: null, amount: 20.005, type: "EXPENSE", date: aug(2), deletedAt: null, categoryId: "cat-food", category },
    );

    // Act
    const result = await getExpensesByCategory({ userId, month: 8, year: 2024 });

    // Assert
    expect(result[0]!.amount).toBe(Math.round((10.005 + 20.005) * 100) / 100);
  });

  it("should use current month and year when month and year are not provided", async () => {
    // Arrange — system time is fixed to August 2024
    const userId = faker.string.uuid();
    const category = { name: "Food", color: "#ff0000", icon: "utensils" };

    repo.transactions.push(
      { userId, walletId: null, amount: 80, type: "EXPENSE", date: aug(10), deletedAt: null, categoryId: "cat-food", category },
    );

    // Act — no month/year provided, defaults to current month (August 2024)
    const result = await getExpensesByCategory({ userId });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.amount).toBe(80);
  });
});
