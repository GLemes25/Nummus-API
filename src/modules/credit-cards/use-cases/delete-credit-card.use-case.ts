import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;

type DeleteCreditCardInput = {
  creditCardId: string;
  userId: string;
};

export const makeDeleteCreditCardUseCase = (repository: CreditCardRepository) => {
  return async ({ creditCardId, userId }: DeleteCreditCardInput) => {
    const creditCard = await repository.findById(creditCardId);

    if (!creditCard) {
      throw makeAppError({
        code: "CREDIT_CARD_NOT_FOUND",
        message: "Cartão de crédito não encontrado",
        statusCode: 404,
      });
    }

    if (creditCard.userId !== userId) {
      throw makeAppError({
        code: "CREDIT_CARD_ACCESS_DENIED",
        message: "Você não tem permissão para excluir este cartão de crédito",
        statusCode: 403,
      });
    }

    await repository.softDelete(creditCardId);
  };
};
