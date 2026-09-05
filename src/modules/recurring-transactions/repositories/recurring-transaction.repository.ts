import type { PaymentMethod, RecurringFrequency, TransactionType } from "@prisma/client";

import { prisma } from "../../../shared/lib/prisma.js";

type CreateWithOccurrencesInput = {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
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
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
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

export const recurringTransactionRepository = {
  findById: async (id: string) => {
    return prisma.recurringTransaction.findFirst({ where: { id, deletedAt: null } });
  },

  createWithOccurrences: async (data: CreateWithOccurrencesInput) => {
    return prisma.$transaction(async (tx) => {
      const recurringTransaction = await tx.recurringTransaction.create({
        data: {
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
        },
      });

      if (data.occurrenceDates.length > 0) {
        await tx.transaction.createMany({
          data: data.occurrenceDates.map((date) => ({
            amount: data.amount,
            type: data.type,
            paymentMethod: data.paymentMethod,
            status: "PENDING" as const,
            date,
            description: data.description,
            walletId: data.walletId,
            categoryId: data.categoryId,
            userId: data.userId,
            recurringTransactionId: recurringTransaction.id,
          })),
        });
      }

      return recurringTransaction;
    });
  },

  updateMasterAndRegenerate: async (input: UpdateMasterAndRegenerateInput) => {
    const { recurringTransactionId, data, nextExecutionDate, cutoffDate, occurrenceDates, userId } = input;

    return prisma.$transaction(async (tx) => {
      const recurringTransaction = await tx.recurringTransaction.update({
        where: { id: recurringTransactionId },
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          paymentMethod: data.paymentMethod,
          frequency: data.frequency,
          active: data.active,
          walletId: data.walletId,
          categoryId: data.categoryId,
          nextExecutionDate,
        },
      });

      // Remove apenas as ocorrências futuras ainda não pagas — o histórico já efetivado é preservado
      await tx.transaction.updateMany({
        where: {
          recurringTransactionId,
          status: "PENDING",
          deletedAt: null,
          date: { gte: cutoffDate },
        },
        data: { deletedAt: new Date() },
      });

      if (occurrenceDates.length > 0) {
        await tx.transaction.createMany({
          data: occurrenceDates.map((date) => ({
            amount: data.amount,
            type: data.type,
            paymentMethod: data.paymentMethod,
            status: "PENDING" as const,
            date,
            description: data.description,
            walletId: data.walletId,
            categoryId: data.categoryId,
            userId,
            recurringTransactionId,
          })),
        });
      }

      return recurringTransaction;
    });
  },

  findOccurrenceById: async (transactionId: string) => {
    return prisma.transaction.findFirst({ where: { id: transactionId, deletedAt: null } });
  },

  unlinkOccurrence: async (transactionId: string, data: UnlinkOccurrenceData) => {
    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount: data.amount,
        type: data.type,
        paymentMethod: data.paymentMethod,
        date: data.date,
        description: data.description,
        walletId: data.walletId,
        categoryId: data.categoryId,
        recurringTransactionId: null,
      },
    });
  },
};
