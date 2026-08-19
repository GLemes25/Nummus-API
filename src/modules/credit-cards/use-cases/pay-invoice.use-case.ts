import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;
type WalletSnapshot = { balance: { toNumber: () => number }; userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;

type PayInvoiceInput = {
  creditCardId: string;
  walletId: string;
  userId: string;
};

export const makePayInvoiceUseCase = (
  repository: CreditCardRepository,
  findWallet: FindWallet,
) => {
  return async ({ creditCardId, walletId, userId }: PayInvoiceInput) => {
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
        message: "Você não tem permissão para pagar a fatura deste cartão",
        statusCode: 403,
      });
    }

    const wallet = await findWallet(walletId);

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
        message: "Você não tem permissão para usar esta carteira",
        statusCode: 403,
      });
    }

    const openInvoices = await repository.findOpenInvoicesByCard(creditCardId);

    if (openInvoices.length === 0) {
      throw makeAppError({
        code: "NO_OPEN_INVOICE",
        message: "Não há faturas em aberto para este cartão",
        statusCode: 400,
      });
    }

    const totalAmount = openInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    await repository.payOpenInvoices(creditCardId, walletId, totalAmount, userId);
  };
};
