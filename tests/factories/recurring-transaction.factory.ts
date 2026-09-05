import { faker } from "@faker-js/faker";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "TRANSFER" | "DEBIT";
type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

type RecurringTransactionInput = {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  startDate: Date;
  walletId: string;
  categoryId: string;
  active?: boolean;
  userId: string;
};

export const makeFakeRecurringTransaction = (
  overrides: Partial<RecurringTransactionInput> = {}
): RecurringTransactionInput => ({
  description: faker.finance.transactionDescription(),
  amount: faker.number.float({ min: 1, max: 5000, fractionDigits: 2 }),
  type: "EXPENSE",
  paymentMethod: "PIX",
  frequency: "MONTHLY",
  startDate: faker.date.soon(),
  walletId: faker.string.uuid(),
  categoryId: faker.string.uuid(),
  userId: faker.string.uuid(),
  ...overrides,
});
