import { faker } from "@faker-js/faker";

type TransferInput = {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  description?: string;
  categoryId: string;
  userId: string;
};

export const makeFakeTransfer = (overrides: Partial<TransferInput> = {}): TransferInput => ({
  sourceWalletId: faker.string.uuid(),
  destinationWalletId: faker.string.uuid(),
  amount: faker.number.float({ min: 1, max: 5000, fractionDigits: 2 }),
  date: faker.date.recent(),
  categoryId: faker.string.uuid(),
  userId: faker.string.uuid(),
  ...overrides,
});
