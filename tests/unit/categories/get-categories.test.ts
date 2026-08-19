import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetCategoriesUseCase } from "../../../src/modules/categories/use-cases/get-categories.use-case.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeFakeCategory } from "../../factories/category.factory.js";

describe("makeGetCategoriesUseCase", () => {
  it("should return all active categories for the user", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const getCategories = makeGetCategoriesUseCase(repo as any);
    const userId = faker.string.uuid();
    await repo.create(makeFakeCategory({ userId, name: "Food" }));
    await repo.create(makeFakeCategory({ userId, name: "Transport" }));

    // Act
    const result = await getCategories({ userId });

    // Assert
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(expect.arrayContaining(["Food", "Transport"]));
  });

  it("should return an empty array when the user has no categories", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const getCategories = makeGetCategoriesUseCase(repo as any);

    // Act
    const result = await getCategories({ userId: faker.string.uuid() });

    // Assert
    expect(result).toEqual([]);
  });

  it("should not return categories belonging to another user", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const getCategories = makeGetCategoriesUseCase(repo as any);
    const userA = faker.string.uuid();
    const userB = faker.string.uuid();
    await repo.create(makeFakeCategory({ userId: userA, name: "A Category" }));
    await repo.create(makeFakeCategory({ userId: userB, name: "B Category" }));

    // Act
    const result = await getCategories({ userId: userA });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("A Category");
  });

  it("should not return soft-deleted categories", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const getCategories = makeGetCategoriesUseCase(repo as any);
    const userId = faker.string.uuid();
    await repo.create(makeFakeCategory({ userId, name: "Active" }));
    await repo.create(makeFakeCategory({ userId, name: "Deleted" }));

    // Simulate soft-delete of second category
    repo.items[1]!.deletedAt = new Date();

    // Act
    const result = await getCategories({ userId });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Active");
  });
});
