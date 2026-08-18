import { faker } from "@faker-js/faker";

type CreditCardInvoiceInput = {
  creditCardId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  dueDate: Date;
  totalAmount: number;
  paid: boolean;
};

export const makeFakeCreditCardInvoice = (
  overrides: Partial<CreditCardInvoiceInput> = {},
): CreditCardInvoiceInput => ({
  creditCardId: faker.string.uuid(),
  periodStartDate: faker.date.recent(),
  periodEndDate: faker.date.soon(),
  dueDate: faker.date.soon(),
  totalAmount: faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }),
  paid: false,
  ...overrides,
});
