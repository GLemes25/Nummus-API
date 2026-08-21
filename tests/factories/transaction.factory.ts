import { faker } from "@faker-js/faker";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "TRANSFER" | "DEBIT" | "CREDIT";

type TransactionInput = {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status?: "PENDING" | "COMPLETED" | "CANCELLED" | undefined;
  date: Date;
  description: string;
  walletId?: string | undefined;
  creditCardId?: string | undefined;
  categoryId: string;
  userId: string;
};

export const makeFakeTransaction = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  amount: faker.number.float({ min: 1, max: 5000, fractionDigits: 2 }),
  type: "EXPENSE",
  paymentMethod: "CASH",
  date: faker.date.recent(),
  description: faker.finance.transactionDescription(),
  walletId: faker.string.uuid(),
  categoryId: faker.string.uuid(),
  userId: faker.string.uuid(),
  ...overrides,
});
