import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateCostCenterUseCase } from "../../../src/modules/cost-centers/use-cases/create-cost-center.use-case.js";
import { makeInMemoryCostCenterRepository } from "../../repositories/in-memory-cost-center.repository.js";
import { makeFakeCostCenter } from "../../factories/cost-center.factory.js";

describe("makeCreateCostCenterUseCase", () => {
  it("should create a cost center successfully", async () => {
    // Arrange
    const repo = makeInMemoryCostCenterRepository();
    const createCostCenter = makeCreateCostCenterUseCase(repo as any);
    const userId = faker.string.uuid();
    const input = makeFakeCostCenter({ userId });

    // Act
    const costCenter = await createCostCenter(input);

    // Assert
    expect(costCenter.name).toBe(input.name);
    expect(costCenter.userId).toBe(userId);
    expect(repo.items).toHaveLength(1);
  });

  it("should throw COST_CENTER_ALREADY_EXISTS when creating two cost centers with the same name for the same user", async () => {
    // Arrange
    const repo = makeInMemoryCostCenterRepository();
    const createCostCenter = makeCreateCostCenterUseCase(repo as any);
    const userId = faker.string.uuid();
    const input = makeFakeCostCenter({ userId, name: "Marketing" });

    await createCostCenter(input);

    // Act & Assert
    await expect(createCostCenter(input)).rejects.toMatchObject({
      code: "COST_CENTER_ALREADY_EXISTS",
      message: "Já existe um centro de custo com este nome",
      statusCode: 409,
    });
    expect(repo.items).toHaveLength(1);
  });

  it("should allow two different users to have cost centers with the same name", async () => {
    // Arrange
    const repo = makeInMemoryCostCenterRepository();
    const createCostCenter = makeCreateCostCenterUseCase(repo as any);
    const sharedName = "Operations";

    // Act
    await createCostCenter(makeFakeCostCenter({ userId: faker.string.uuid(), name: sharedName }));
    await createCostCenter(makeFakeCostCenter({ userId: faker.string.uuid(), name: sharedName }));

    // Assert
    expect(repo.items).toHaveLength(2);
  });
});
