import { faker } from "@faker-js/faker";

type WalletType = "CHECKING" | "SAVINGS" | "INVESTMENT";

type WalletInput = {
  name: string;
  type: WalletType;
  currency: string;
  initialBalance: number;
  userId: string;
};

export const makeFakeWallet = (overrides: Partial<WalletInput> = {}): WalletInput => ({
  name: faker.finance.accountName(),
  type: "CHECKING",
  currency: "BRL",
  initialBalance: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
  userId: faker.string.uuid(),
  ...overrides,
});
