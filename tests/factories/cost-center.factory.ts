import { faker } from "@faker-js/faker";

type CostCenterInput = {
  name: string;
  userId: string;
};

export const makeFakeCostCenter = (overrides: Partial<CostCenterInput> = {}): CostCenterInput => ({
  name: faker.commerce.department(),
  userId: faker.string.uuid(),
  ...overrides,
});
