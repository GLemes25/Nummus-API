import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";
import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";

type CreditCardRepository = typeof creditCardRepository;
type WalletSnapshot = { userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;
type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const makeCreateCreditCardUseCase = (
  repository: CreditCardRepository,
  findWallet: FindWallet,
) => {
  return async (data: CreateCreditCardInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);
    if (existing) {
      throw makeAppError({
        code: "CREDIT_CARD_ALREADY_EXISTS",
        message: "Já existe um cartão de crédito com este nome",
        statusCode: 409,
      });
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

      if (wallet.userId !== data.userId) {
        throw makeAppError({
          code: "WALLET_ACCESS_DENIED",
          message: "Você não tem permissão para vincular esta carteira",
          statusCode: 403,
        });
      }
    }

    return repository.create(data);
  };
};
