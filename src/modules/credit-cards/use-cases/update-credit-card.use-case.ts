import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";
import type { UpdateCreditCardDto } from "../dtos/update-credit-card.dto.js";

type CreditCardRepository = typeof creditCardRepository;
type WalletSnapshot = { userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;

type UpdateCreditCardInput = {
  creditCardId: string;
  userId: string;
  data: UpdateCreditCardDto;
};

export const makeUpdateCreditCardUseCase = (
  repository: CreditCardRepository,
  findWallet: FindWallet,
) => {
  return async ({ creditCardId, userId, data }: UpdateCreditCardInput) => {
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
        message: "Você não tem permissão para editar este cartão de crédito",
        statusCode: 403,
      });
    }

    if (data.name !== undefined && data.name !== creditCard.name) {
      const existing = await repository.findByNameAndUser(userId, data.name);
      if (existing) {
        throw makeAppError({
          code: "CREDIT_CARD_ALREADY_EXISTS",
          message: "Já existe um cartão de crédito com este nome",
          statusCode: 409,
        });
      }
    }

    if (data.walletId !== undefined) {
      const wallet = await findWallet(data.walletId);

      if (!wallet) {
        throw makeAppError({
          code: "WALLET_NOT_FOUND",
          message: "Carteira não encontrada",
          statusCode: 404,
        });
      }

      if (wallet.userId !== userId) {
        throw makeAppError({
          code: "WALLET_ACCESS_DENIED",
          message: "Você não tem permissão para vincular esta carteira",
          statusCode: 403,
        });
      }
    }

    return repository.update(creditCardId, data);
  };
};
