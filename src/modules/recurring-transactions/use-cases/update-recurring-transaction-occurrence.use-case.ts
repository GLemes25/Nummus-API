import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { recurringTransactionRepository } from "../repositories/recurring-transaction.repository.js";
import type { UpdateRecurringTransactionOccurrenceDto } from "../dtos/update-recurring-transaction-occurrence.dto.js";

type RecurringTransactionRepository = typeof recurringTransactionRepository;

type UpdateRecurringTransactionOccurrenceInput = {
  recurringTransactionId: string;
  transactionId: string;
  userId: string;
  data: UpdateRecurringTransactionOccurrenceDto;
};

// Edita apenas uma ocorrência já gerada: ela vira uma transação avulsa, sem vínculo com o Mestre
export const makeUpdateRecurringTransactionOccurrenceUseCase = (
  repository: RecurringTransactionRepository
) => {
  return async ({
    recurringTransactionId,
    transactionId,
    userId,
    data,
  }: UpdateRecurringTransactionOccurrenceInput) => {
    const occurrence = await repository.findOccurrenceById(transactionId);

    if (!occurrence || occurrence.recurringTransactionId !== recurringTransactionId) {
      throw makeAppError({
        code: "RECURRING_TRANSACTION_OCCURRENCE_NOT_FOUND",
        message: "Ocorrência da transação recorrente não encontrada",
        statusCode: 404,
      });
    }

    if (occurrence.userId !== userId) {
      throw makeAppError({
        code: "RECURRING_TRANSACTION_ACCESS_DENIED",
        message: "Você não tem permissão para editar esta ocorrência",
        statusCode: 403,
      });
    }

    return repository.unlinkOccurrence(transactionId, {
      amount: data.amount ?? Number(occurrence.amount),
      type: data.type ?? occurrence.type,
      paymentMethod: data.paymentMethod ?? occurrence.paymentMethod,
      date: data.date ?? occurrence.date,
      description: data.description ?? occurrence.description,
      walletId: data.walletId ?? occurrence.walletId,
      categoryId: data.categoryId ?? occurrence.categoryId,
    });
  };
};
