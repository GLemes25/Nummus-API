import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;

export const makeGetCreditCardsUseCase = (repository: CreditCardRepository) => {
  return async (userId: string) => {
    const creditCards = await repository.findAllByUserId(userId);

    return creditCards.map(({ invoices, ...creditCard }) => ({
      creditCard,
      currentInvoiceAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
    }));
  };
};
