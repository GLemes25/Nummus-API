import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { recurringTransactionRepository } from "../repositories/recurring-transaction.repository.js";
import type { CreateRecurringTransactionDto } from "../dtos/create-recurring-transaction.dto.js";
import { addMonthsToDate, generateOccurrenceDates } from "./generate-occurrence-dates.js";

type RecurringTransactionRepository = typeof recurringTransactionRepository;
type FindWallet = (id: string) => Promise<{ id: string } | null>;
type FindCategory = (id: string) => Promise<{ id: string } | null>;

type CreateRecurringTransactionInput = CreateRecurringTransactionDto & { userId: string };

const OCCURRENCE_HORIZON_MONTHS = 12;

export const makeCreateRecurringTransactionUseCase = (
  repository: RecurringTransactionRepository,
  findWallet: FindWallet,
  findCategory: FindCategory
) => {
  return async (data: CreateRecurringTransactionInput) => {
    const wallet = await findWallet(data.walletId);
    if (!wallet) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    const category = await findCategory(data.categoryId);
    if (!category) {
      throw makeAppError({
        code: "CATEGORY_NOT_FOUND",
        message: "Categoria não encontrada",
        statusCode: 404,
      });
    }

    const occurrenceDates = generateOccurrenceDates(
      data.startDate,
      data.frequency,
      OCCURRENCE_HORIZON_MONTHS
    );

    return repository.createWithOccurrences({
      description: data.description,
      amount: data.amount,
      type: data.type,
      paymentMethod: data.paymentMethod,
      frequency: data.frequency,
      nextExecutionDate: addMonthsToDate(data.startDate, OCCURRENCE_HORIZON_MONTHS),
      active: data.active ?? true,
      walletId: data.walletId,
      categoryId: data.categoryId,
      userId: data.userId,
      occurrenceDates,
    });
  };
};
