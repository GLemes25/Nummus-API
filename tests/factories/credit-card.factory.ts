import { faker } from "@faker-js/faker";

type CreditCardInput = {
  name: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  walletId?: string;
  userId: string;
};

export const makeFakeCreditCard = (overrides: Partial<CreditCardInput> = {}): CreditCardInput => ({
  name: faker.finance.creditCardIssuer(),
  creditLimit: faker.number.float({ min: 500, max: 20000, fractionDigits: 2 }),
  closingDay: faker.number.int({ min: 1, max: 28 }),
  dueDay: faker.number.int({ min: 1, max: 28 }),
  userId: faker.string.uuid(),
  ...overrides,
});
