import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTagUseCase } from "../../../src/modules/tags/use-cases/create-tag.use-case.js";
import { makeInMemoryTagRepository } from "../../repositories/in-memory-tag.repository.js";
import { makeFakeTag } from "../../factories/tag.factory.js";

describe("makeCreateTagUseCase", () => {
  it("should create a tag successfully", async () => {
    // Arrange
    const repo = makeInMemoryTagRepository();
    const createTag = makeCreateTagUseCase(repo as any);
    const userId = faker.string.uuid();
    const input = makeFakeTag({ userId });

    // Act
    const tag = await createTag(input);

    // Assert
    expect(tag.name).toBe(input.name);
    expect(tag.userId).toBe(userId);
    expect(repo.items).toHaveLength(1);
  });

  it("should throw TAG_ALREADY_EXISTS when creating two tags with the same name for the same user", async () => {
    // Arrange
    const repo = makeInMemoryTagRepository();
    const createTag = makeCreateTagUseCase(repo as any);
    const userId = faker.string.uuid();
    const input = makeFakeTag({ userId, name: "urgent" });

    await createTag(input);

    // Act & Assert
    await expect(createTag(input)).rejects.toMatchObject({
      code: "TAG_ALREADY_EXISTS",
      message: "Já existe uma tag com este nome",
      statusCode: 409,
    });
    expect(repo.items).toHaveLength(1);
  });

  it("should allow two different users to have tags with the same name", async () => {
    // Arrange
    const repo = makeInMemoryTagRepository();
    const createTag = makeCreateTagUseCase(repo as any);
    const sharedName = "priority";

    // Act
    await createTag(makeFakeTag({ userId: faker.string.uuid(), name: sharedName }));
    await createTag(makeFakeTag({ userId: faker.string.uuid(), name: sharedName }));

    // Assert
    expect(repo.items).toHaveLength(2);
  });
});
