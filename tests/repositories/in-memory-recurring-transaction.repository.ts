import { randomUUID } from "crypto";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "TRANSFER" | "DEBIT";
type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type InMemoryRecurringTransaction = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  nextExecutionDate: Date;
  active: boolean;
  walletId: string | null;
  categoryId: string;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InMemoryRecurringOccurrence = {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  walletId: string | null;
  categoryId: string | null;
  userId: string;
  recurringTransactionId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithOccurrencesInput = {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  nextExecutionDate: Date;
  active: boolean;
  walletId: string;
  categoryId: string;
  userId: string;
  occurrenceDates: Date[];
};

type MasterFields = {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  active: boolean;
  walletId: string;
  categoryId: string;
};

type UpdateMasterAndRegenerateInput = {
  recurringTransactionId: string;
  data: MasterFields;
  nextExecutionDate: Date;
  cutoffDate: Date;
  occurrenceDates: Date[];
  userId: string;
};

type UnlinkOccurrenceData = {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
  walletId: string | null;
  categoryId: string | null;
};

export const makeInMemoryRecurringTransactionRepository = () => {
  const items: InMemoryRecurringTransaction[] = [];
  const transactions: InMemoryRecurringOccurrence[] = [];

  return {
    items,
    transactions,

    findById: async (id: string) => {
      return items.find((r) => r.id === id && r.deletedAt === null) ?? null;
    },

    createWithOccurrences: async (data: CreateWithOccurrencesInput) => {
      const recurringTransaction: InMemoryRecurringTransaction = {
        id: randomUUID(),
        description: data.description,
        amount: data.amount,
        type: data.type,
        paymentMethod: data.paymentMethod,
        frequency: data.frequency,
        nextExecutionDate: data.nextExecutionDate,
        active: data.active,
        walletId: data.walletId,
        categoryId: data.categoryId,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(recurringTransaction);

      for (const date of data.occurrenceDates) {
        transactions.push({
          id: randomUUID(),
          amount: data.amount,
          type: data.type,
          paymentMethod: data.paymentMethod,
          status: "PENDING",
          date,
          description: data.description,
          walletId: data.walletId,
          categoryId: data.categoryId,
          userId: data.userId,
          recurringTransactionId: recurringTransaction.id,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return recurringTransaction;
    },

    updateMasterAndRegenerate: async (input: UpdateMasterAndRegenerateInput) => {
      const { recurringTransactionId, data, nextExecutionDate, cutoffDate, occurrenceDates, userId } = input;

      const recurringTransaction = items.find((r) => r.id === recurringTransactionId);
      if (!recurringTransaction) throw new Error("Recurring transaction not found");

      Object.assign(recurringTransaction, data, { nextExecutionDate, updatedAt: new Date() });

      for (const occurrence of transactions) {
        if (
          occurrence.recurringTransactionId === recurringTransactionId &&
          occurrence.status === "PENDING" &&
          occurrence.deletedAt === null &&
          occurrence.date >= cutoffDate
        ) {
          occurrence.deletedAt = new Date();
        }
      }

      for (const date of occurrenceDates) {
        transactions.push({
          id: randomUUID(),
          amount: data.amount,
          type: data.type,
          paymentMethod: data.paymentMethod,
          status: "PENDING",
          date,
          description: data.description,
          walletId: data.walletId,
          categoryId: data.categoryId,
          userId,
          recurringTransactionId,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return recurringTransaction;
    },

    findOccurrenceById: async (transactionId: string) => {
      return transactions.find((t) => t.id === transactionId && t.deletedAt === null) ?? null;
    },

    unlinkOccurrence: async (transactionId: string, data: UnlinkOccurrenceData) => {
      const occurrence = transactions.find((t) => t.id === transactionId);
      if (!occurrence) return null;
      Object.assign(occurrence, data, { recurringTransactionId: null, updatedAt: new Date() });
      return occurrence;
    },
  };
};
