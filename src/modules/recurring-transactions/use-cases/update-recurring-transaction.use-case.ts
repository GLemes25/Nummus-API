import type { PaymentMethod } from "@prisma/client";

import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { recurringTransactionRepository } from "../repositories/recurring-transaction.repository.js";
import type { UpdateRecurringTransactionDto } from "../dtos/update-recurring-transaction.dto.js";
import { addMonthsToDate, generateOccurrenceDates } from "./generate-occurrence-dates.js";

type RecurringTransactionRepository = typeof recurringTransactionRepository;
type FindWallet = (id: string) => Promise<{ id: string } | null>;
type FindCategory = (id: string) => Promise<{ id: string } | null>;

type UpdateRecurringTransactionInput = {
  recurringTransactionId: string;
  userId: string;
  data: UpdateRecurringTransactionDto;
};

const OCCURRENCE_HORIZON_MONTHS = 12;

// Edita o registro Mestre e regenera todas as ocorrências futuras ainda não pagas
export const makeUpdateRecurringTransactionUseCase = (
  repository: RecurringTransactionRepository,
  findWallet: FindWallet,
  findCategory: FindCategory
) => {
  return async ({ recurringTransactionId, userId, data }: UpdateRecurringTransactionInput) => {
    const recurringTransaction = await repository.findById(recurringTransactionId);

    if (!recurringTransaction) {
      throw makeAppError({
        code: "RECURRING_TRANSACTION_NOT_FOUND",
        message: "Transação recorrente não encontrada",
        statusCode: 404,
      });
    }

    if (recurringTransaction.userId !== userId) {
      throw makeAppError({
        code: "RECURRING_TRANSACTION_ACCESS_DENIED",
        message: "Você não tem permissão para editar esta transação recorrente",
        statusCode: 403,
      });
    }

    const resultingWalletId = data.walletId ?? recurringTransaction.walletId;
    if (!resultingWalletId) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    if (data.walletId) {
      const wallet = await findWallet(data.walletId);
      if (!wallet) {
        throw makeAppError({
          code: "WALLET_NOT_FOUND",
          message: "Carteira não encontrada",
          statusCode: 404,
        });
      }
    }

    const resultingCategoryId = data.categoryId ?? recurringTransaction.categoryId;
    if (data.categoryId) {
      const category = await findCategory(data.categoryId);
      if (!category) {
        throw makeAppError({
          code: "CATEGORY_NOT_FOUND",
          message: "Categoria não encontrada",
          statusCode: 404,
        });
      }
    }

    const resultingFrequency = data.frequency ?? recurringTransaction.frequency;
    // A partir de quando as novas regras valem: se não informado, aplica imediatamente
    const cutoffDate = data.startDate ?? new Date();

    const occurrenceDates = generateOccurrenceDates(
      cutoffDate,
      resultingFrequency,
      OCCURRENCE_HORIZON_MONTHS
    );

    return repository.updateMasterAndRegenerate({
      recurringTransactionId,
      userId,
      cutoffDate,
      nextExecutionDate: addMonthsToDate(cutoffDate, OCCURRENCE_HORIZON_MONTHS),
      occurrenceDates,
      data: {
        description: data.description ?? recurringTransaction.description,
        amount: data.amount ?? Number(recurringTransaction.amount),
        type: data.type ?? recurringTransaction.type,
        // paymentMethod nunca é CREDIT nesta entidade — recorrência via cartão não é suportada nesta fase
        paymentMethod: (data.paymentMethod ?? recurringTransaction.paymentMethod) as Exclude<
          PaymentMethod,
          "CREDIT"
        >,
        frequency: resultingFrequency,
        active: data.active ?? recurringTransaction.active,
        walletId: resultingWalletId,
        categoryId: resultingCategoryId,
      },
    });
  };
};
