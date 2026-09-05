import type { RecurringTransaction, Transaction } from "@prisma/client";

import type { RecurringTransactionResponseDto } from "../../dtos/create-recurring-transaction.dto.js";
import type { RecurringTransactionOccurrenceResponseDto } from "../../dtos/update-recurring-transaction-occurrence.dto.js";

export const presentRecurringTransaction = (
  recurringTransaction: RecurringTransaction
): RecurringTransactionResponseDto => ({
  id: recurringTransaction.id,
  description: recurringTransaction.description,
  amount: Number(recurringTransaction.amount),
  type: recurringTransaction.type,
  paymentMethod: recurringTransaction.paymentMethod,
  frequency: recurringTransaction.frequency,
  nextExecutionDate: recurringTransaction.nextExecutionDate,
  active: recurringTransaction.active,
  walletId: recurringTransaction.walletId,
  categoryId: recurringTransaction.categoryId,
  userId: recurringTransaction.userId,
  createdAt: recurringTransaction.createdAt,
  updatedAt: recurringTransaction.updatedAt,
});

export const presentRecurringTransactionOccurrence = (
  transaction: Transaction
): RecurringTransactionOccurrenceResponseDto => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  paymentMethod: transaction.paymentMethod,
  status: transaction.status,
  date: transaction.date,
  description: transaction.description,
  walletId: transaction.walletId,
  categoryId: transaction.categoryId,
  recurringTransactionId: transaction.recurringTransactionId,
  userId: transaction.userId,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});
