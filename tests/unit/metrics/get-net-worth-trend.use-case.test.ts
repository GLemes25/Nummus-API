import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetNetWorthTrendUseCase } from "../../../src/modules/metrics/use-cases/get-net-worth-trend.use-case.js";
import { makeInMemoryMetricsRepository } from "../../repositories/in-memory-metrics.repository.js";

// Pins time to 2024-08-15 → 6-month window: Mar, Abr, Mai, Jun, Jul, Ago
const FIXED_NOW = new Date("2024-08-15T12:00:00.000Z");

const aug = (day: number) => new Date(`2024-08-${String(day).padStart(2, "0")}T10:00:00.000Z`);
const jul = (day: number) => new Date(`2024-07-${String(day).padStart(2, "0")}T10:00:00.000Z`);
const jun = (day: number) => new Date(`2024-06-${String(day).padStart(2, "0")}T10:00:00.000Z`);
const mar = (day: number) => new Date(`2024-03-${String(day).padStart(2, "0")}T10:00:00.000Z`);
const feb = (day: number) => new Date(`2024-02-${String(day).padStart(2, "0")}T10:00:00.000Z`);

describe("makeGetNetWorthTrendUseCase", () => {
  let repo: ReturnType<typeof makeInMemoryMetricsRepository>;
  let getNetWorthTrend: (userId: string) => Promise<Array<{ month: string; balance: number }>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    repo = makeInMemoryMetricsRepository();
    getNetWorthTrend = makeGetNetWorthTrendUseCase(repo as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return exactly 6 items with correct Portuguese month labels in chronological order", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 0, deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.month)).toEqual(["Mar", "Abr", "Mai", "Jun", "Jul", "Ago"]);
  });

  it("should apply reverse calculation: subtracts each month's net flow going back in time", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });

    // August: net flow = +200 (300 income - 100 expense)
    repo.transactions.push({ userId, walletId: "w1", amount: 300, type: "INCOME", date: aug(5), deletedAt: null });
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "EXPENSE", date: aug(10), deletedAt: null });

    // July: net flow = +300 (400 income - 100 expense)
    repo.transactions.push({ userId, walletId: "w1", amount: 400, type: "INCOME", date: jul(15), deletedAt: null });
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "EXPENSE", date: jul(20), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert
    // Ago: 1000 (current balance)
    // Jul: 1000 - 200 = 800
    // Jun: 800 - 300 = 500
    // Mai: 500, Abr: 500, Mar: 500 (no transactions)
    expect(result[5]).toEqual({ month: "Ago", balance: 1000 });
    expect(result[4]).toEqual({ month: "Jul", balance: 800 });
    expect(result[3]).toEqual({ month: "Jun", balance: 500 });
    expect(result[2]).toEqual({ month: "Mai", balance: 500 });
    expect(result[1]).toEqual({ month: "Abr", balance: 500 });
    expect(result[0]).toEqual({ month: "Mar", balance: 500 });
  });

  it("should return the same balance for all months when there are no transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 5000, deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert
    expect(result.every((r) => r.balance === 5000)).toBe(true);
  });

  it("should aggregate balances across multiple wallets", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 600, deletedAt: null });
    repo.wallets.push({ userId, balance: 400, deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert
    expect(result[5]!.balance).toBe(1000);
    expect(result.every((r) => r.balance === 1000)).toBe(true);
  });

  it("should correctly reverse a BALANCE_ADJUSTMENT by subtracting its stored delta", async () => {
    // Arrange — stored amount for BALANCE_ADJUSTMENT is the delta (newBalance - oldBalance)
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });

    // Delta of +200 means balance increased by 200 in August
    repo.transactions.push({ userId, walletId: "w1", amount: 200, type: "BALANCE_ADJUSTMENT", date: aug(8), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert
    expect(result[5]!.balance).toBe(1000); // Ago: current
    expect(result[4]!.balance).toBe(800);  // Jul: 1000 - 200
  });

  it("should exclude credit card transactions (walletId null) from the trend calculation", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });

    // Credit card expense: walletId is null — must not affect the trend
    repo.transactions.push({ userId, walletId: null, amount: 500, type: "EXPENSE", date: aug(10), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert — no wallet balance change, all months should be 1000
    expect(result.every((r) => r.balance === 1000)).toBe(true);
  });

  it("should exclude soft-deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });

    // Deleted income — must not be counted
    repo.transactions.push({ userId, walletId: "w1", amount: 500, type: "INCOME", date: aug(5), deletedAt: new Date() });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert — deleted tx doesn't affect calculation
    expect(result.every((r) => r.balance === 1000)).toBe(true);
  });

  it("should exclude soft-deleted wallets from the total balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });
    repo.wallets.push({ userId, balance: 500, deletedAt: new Date() }); // deleted

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert — only the active wallet counts
    expect(result[5]!.balance).toBe(1000);
  });

  it("should not include transactions from other users", async () => {
    // Arrange
    const userA = faker.string.uuid();
    const userB = faker.string.uuid();
    repo.wallets.push({ userId: userA, balance: 1000, deletedAt: null });
    repo.wallets.push({ userId: userB, balance: 2000, deletedAt: null });

    // User B has a large August income
    repo.transactions.push({ userId: userB, walletId: "w2", amount: 500, type: "INCOME", date: aug(10), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userA);

    // Assert — User A's trend is unaffected by User B's data
    expect(result[5]!.balance).toBe(1000);
    expect(result.every((r) => r.balance === 1000)).toBe(true);
  });

  it("should not include transactions older than 6 months", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 1000, deletedAt: null });

    // February is outside the 6-month window (window starts March 1)
    repo.transactions.push({ userId, walletId: "w1", amount: 300, type: "INCOME", date: feb(20), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert — February income doesn't affect any month
    expect(result.every((r) => r.balance === 1000)).toBe(true);
  });

  it("should handle transactions spread across all 6 months", async () => {
    // Arrange
    const userId = faker.string.uuid();
    repo.wallets.push({ userId, balance: 600, deletedAt: null });

    // Each month adds net +100 income
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "INCOME", date: aug(1), deletedAt: null });
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "INCOME", date: jul(1), deletedAt: null });
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "INCOME", date: jun(1), deletedAt: null });
    repo.transactions.push({ userId, walletId: "w1", amount: 100, type: "INCOME", date: mar(1), deletedAt: null });

    // Act
    const result = await getNetWorthTrend(userId);

    // Assert reverse calculation step by step:
    // Ago: 600
    // Jul: 600 - 100 = 500
    // Jun: 500 - 100 = 400
    // Mai: 400 - 100 = 300 (Jun flow subtracted to get Mai)

    // Wait - re-check the logic: at i=3 (Jun), we assign result[3]=balanceAtJun,
    // then subtract Jun's flow to get the balance going into Jun (end of Mai).
    // Ago=600, Jul=500, Jun=400, Mai=300, Abr=300 (no May tx), Mar=200 (Abr has no tx, Mar has 100)

    // Actually:
    // i=5 (Ago): result[5]=600, subtract aug flow(100) → running=500
    // i=4 (Jul): result[4]=500, subtract jul flow(100) → running=400
    // i=3 (Jun): result[3]=400, subtract jun flow(100) → running=300
    // i=2 (Mai): result[2]=300, subtract mai flow(0) → running=300
    // i=1 (Abr): result[1]=300, subtract abr flow(0) → running=300
    // i=0 (Mar): result[0]=300 — but Mar has 100 income, however i=0 doesn't subtract!
    // The Mar flow is NOT subtracted because there's no month before Mar in our window.
    expect(result[5]).toEqual({ month: "Ago", balance: 600 });
    expect(result[4]).toEqual({ month: "Jul", balance: 500 });
    expect(result[3]).toEqual({ month: "Jun", balance: 400 });
    expect(result[2]).toEqual({ month: "Mai", balance: 300 });
    expect(result[1]).toEqual({ month: "Abr", balance: 300 });
    expect(result[0]).toEqual({ month: "Mar", balance: 300 });
  });
});
