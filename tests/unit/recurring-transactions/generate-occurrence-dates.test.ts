import { describe, it, expect } from "vitest";
import { generateOccurrenceDates } from "../../../src/modules/recurring-transactions/use-cases/generate-occurrence-dates.js";

describe("generateOccurrenceDates", () => {
  it("should generate 12 monthly occurrences over a 12-month horizon", () => {
    // Arrange
    const startDate = new Date(2025, 0, 15); // January 15, 2025

    // Act
    const dates = generateOccurrenceDates(startDate, "MONTHLY", 12);

    // Assert
    expect(dates).toHaveLength(12);
    expect(dates[0]).toEqual(startDate);
    expect(dates[1]!.getMonth()).toBe(1); // February
    expect(dates[11]!.getMonth()).toBe(11); // December
  });

  it("should generate a daily occurrence for every day within the horizon", () => {
    // Arrange
    const startDate = new Date(2025, 0, 1); // January 1, 2025 (31-day month)

    // Act
    const dates = generateOccurrenceDates(startDate, "DAILY", 1);

    // Assert
    expect(dates).toHaveLength(31);
    expect(dates[0]).toEqual(startDate);
    expect(dates[30]).toEqual(new Date(2025, 0, 31));
  });

  it("should generate a weekly occurrence every 7 days within the horizon", () => {
    // Arrange
    const startDate = new Date(2025, 0, 1); // January 1, 2025

    // Act
    const dates = generateOccurrenceDates(startDate, "WEEKLY", 1);

    // Assert
    expect(dates).toHaveLength(5);
    expect(dates[1]).toEqual(new Date(2025, 0, 8));
    expect(dates[4]).toEqual(new Date(2025, 0, 29));
  });

  it("should generate a single yearly occurrence within a 12-month horizon", () => {
    // Arrange
    const startDate = new Date(2025, 5, 10); // June 10, 2025

    // Act
    const dates = generateOccurrenceDates(startDate, "YEARLY", 12);

    // Assert
    expect(dates).toHaveLength(1);
    expect(dates[0]).toEqual(startDate);
  });

  it("should clamp month-end monthly occurrences instead of overflowing into the next month", () => {
    // Arrange
    const startDate = new Date(2025, 0, 31); // January 31, 2025

    // Act
    const dates = generateOccurrenceDates(startDate, "MONTHLY", 3);

    // Assert — February has no 31st day, so it should clamp to the last day of February
    expect(dates[1]!.getMonth()).toBe(1); // February
    expect(dates[1]!.getDate()).toBe(28);
  });
});
