import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeDeleteCategoryUseCase } from "../../../src/modules/categories/use-cases/delete-category.use-case.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeFakeCategory } from "../../factories/category.factory.js";

describe("makeDeleteCategoryUseCase", () => {
  it("should soft-delete a category so it is no longer findable", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const deleteCategory = makeDeleteCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const category = await repo.create(makeFakeCategory({ userId }));

    // Act
    await deleteCategory({ categoryId: category.id, userId });

    // Assert
    const found = await repo.findById(category.id);
    expect(found).toBeNull();
    expect(repo.items[0]!.deletedAt).not.toBeNull();
  });

  it("should throw CATEGORY_NOT_FOUND when the category does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const deleteCategory = makeDeleteCategoryUseCase(repo as any);

    // Act & Assert
    await expect(
      deleteCategory({ categoryId: faker.string.uuid(), userId: faker.string.uuid() })
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND", statusCode: 404 });
  });

  it("should throw CATEGORY_ACCESS_DENIED when the category belongs to another user", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const deleteCategory = makeDeleteCategoryUseCase(repo as any);
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const category = await repo.create(makeFakeCategory({ userId: ownerId }));

    // Act & Assert
    await expect(
      deleteCategory({ categoryId: category.id, userId: otherUserId })
    ).rejects.toMatchObject({ code: "CATEGORY_ACCESS_DENIED", statusCode: 403 });

    // Category must remain intact after the failed attempt
    const found = await repo.findById(category.id);
    expect(found).not.toBeNull();
  });

  it("should throw CATEGORY_SYSTEM_IMMUTABLE when trying to delete a system category", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const deleteCategory = makeDeleteCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const category = await repo.create(
      makeFakeCategory({ userId, isSystem: true, systemId: "CREDIT_CARD_PAYMENT" })
    );

    // Act & Assert
    await expect(
      deleteCategory({ categoryId: category.id, userId })
    ).rejects.toMatchObject({
      code: "CATEGORY_SYSTEM_IMMUTABLE",
      message: "Categorias do sistema não podem ser excluídas",
      statusCode: 403,
    });

    // Category must remain intact after the failed attempt
    const found = await repo.findById(category.id);
    expect(found).not.toBeNull();
  });
});
