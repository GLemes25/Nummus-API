import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;
type WalletSnapshot = { balance: { toNumber: () => number }; userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;
type CategorySnapshot = { id: string };
type FindCategoryBySystemId = (
  userId: string,
  systemId: string,
) => Promise<CategorySnapshot | null>;
type CreateSystemCategory = (data: {
  userId: string;
  systemId: string;
  name: string;
  icon: string;
  color: string;
}) => Promise<CategorySnapshot>;

const CREDIT_CARD_PAYMENT_SYSTEM_ID = "CREDIT_CARD_PAYMENT";

type PayInvoiceInput = {
  creditCardId: string;
  walletId: string;
  userId: string;
};

export const makePayInvoiceUseCase = (
  repository: CreditCardRepository,
  findWallet: FindWallet,
  findCategoryBySystemId: FindCategoryBySystemId,
  createSystemCategory: CreateSystemCategory,
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

    const category =
      (await findCategoryBySystemId(userId, CREDIT_CARD_PAYMENT_SYSTEM_ID)) ??
      (await createSystemCategory({
        userId,
        systemId: CREDIT_CARD_PAYMENT_SYSTEM_ID,
        name: "Pagamento de Fatura",
        icon: "credit-card",
        color: "#64748B",
      }));

    await repository.payOpenInvoices(creditCardId, walletId, totalAmount, userId, category.id);
  };
};
