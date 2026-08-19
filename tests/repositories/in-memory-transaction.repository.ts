import { randomUUID } from "crypto";
import type { InMemoryWallet } from "./in-memory-wallet.repository.ts";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "TRANSFER" | "DEBIT" | "CREDIT";

export type InMemoryTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  walletId: string | null;
  creditCardId: string | null;
  invoiceId: string | null;
  categoryId: string | null;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithBalanceData = {
  storedAmount: number;
  type: TransactionType;
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
  date: Date;
  description: string;
  walletId: string;
  categoryId: string;
  userId: string;
  newBalance: number;
};

type UpdateTransactionData = {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
  walletId: string | null;
  categoryId: string;
};

type WalletBalanceUpdate = {
  walletId: string;
  newBalance: number;
};

type FindManyPaginatedInput = {
  userId: string;
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
  walletId?: string;
  categoryId?: string;
  creditCardId?: string;
  type?: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
};

export type InMemoryCreditCardInvoice = {
  id: string;
  creditCardId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  dueDate: Date;
  totalAmount: number;
  paid: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithInvoiceData = {
  amount: number;
  type: TransactionType;
  date: Date;
  description: string;
  creditCardId: string;
  categoryId: string | null;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export const makeInMemoryTransactionRepository = (
  wallets: InMemoryWallet[],
  invoices: InMemoryCreditCardInvoice[] = []
) => {
  const items: InMemoryTransaction[] = [];

  return {
    items,
    invoices,

    findById: async (id: string) => {
      return items.find((t) => t.id === id) ?? null;
    },

    createWithBalanceUpdate: async (data: CreateWithBalanceData) => {
      const transaction: InMemoryTransaction = {
        id: randomUUID(),
        amount: data.storedAmount,
        type: data.type,
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        date: data.date,
        description: data.description,
        walletId: data.walletId,
        creditCardId: null,
        invoiceId: null,
        categoryId: data.categoryId,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(transaction);

      const wallet = wallets.find((w) => w.id === data.walletId);
      if (wallet) wallet.balance = data.newBalance;

      return transaction;
    },

    updateWithBalanceUpdate: async (
      transactionId: string,
      data: UpdateTransactionData,
      walletUpdates: WalletBalanceUpdate[]
    ) => {
      const transaction = items.find((t) => t.id === transactionId);
      if (!transaction) return null;

      Object.assign(transaction, data, { updatedAt: new Date() });

      for (const walletUpdate of walletUpdates) {
        const wallet = wallets.find((w) => w.id === walletUpdate.walletId);
        if (wallet) wallet.balance = walletUpdate.newBalance;
      }

      return transaction;
    },

    softDeleteWithReversal: async (transactionId: string) => {
      const transaction = items.find((t) => t.id === transactionId);

      // Guarda atômica: se já não existir ou já estiver deletada, não reverte o saldo de novo.
      if (!transaction || transaction.deletedAt !== null) return;

      transaction.deletedAt = new Date();

      if (transaction.walletId && (transaction.type === "INCOME" || transaction.type === "EXPENSE")) {
        const wallet = wallets.find((w) => w.id === transaction.walletId);
        if (wallet) {
          const delta = transaction.type === "INCOME" ? -transaction.amount : transaction.amount;
          wallet.balance += delta;
        }
      }
    },

    findManyPaginated: async (filters: FindManyPaginatedInput) => {
      const { userId, page, limit, startDate, endDate, walletId, categoryId, creditCardId, type } = filters;
      const skip = (page - 1) * limit;

      let filtered = items.filter((t) => {
        if (t.userId !== userId) return false;
        if (t.deletedAt !== null) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (walletId && t.walletId !== walletId) return false;
        if (categoryId && t.categoryId !== categoryId) return false;
        if (creditCardId && t.creditCardId !== creditCardId) return false;
        if (type && t.type !== type) return false;
        return true;
      });

      filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

      const totalCount = filtered.length;
      const data = filtered.slice(skip, skip + limit).map((t) => ({
        ...t,
        category: null,
        wallet: null,
      }));

      return { data, totalCount };
    },

    createWithInvoiceUpdate: async (data: CreateWithInvoiceData) => {
      let invoice = invoices.find(
        (i) =>
          i.creditCardId === data.creditCardId &&
          i.deletedAt === null &&
          i.periodStartDate <= data.date &&
          i.periodEndDate >= data.date
      );

      if (!invoice) {
        invoice = {
          id: randomUUID(),
          creditCardId: data.creditCardId,
          periodStartDate: data.periodStart,
          periodEndDate: data.periodEnd,
          dueDate: data.dueDate,
          totalAmount: 0,
          paid: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        invoices.push(invoice);
      }

      invoice.totalAmount += data.amount;
      invoice.updatedAt = new Date();

      const transaction: InMemoryTransaction = {
        id: randomUUID(),
        amount: data.amount,
        type: data.type,
        paymentMethod: "CREDIT",
        status: "COMPLETED",
        date: data.date,
        description: data.description,
        walletId: null,
        creditCardId: data.creditCardId,
        invoiceId: invoice.id,
        categoryId: data.categoryId,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(transaction);

      return transaction;
    },
  };
};
