type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";

type InMemoryMetricsWallet = {
  userId: string;
  balance: number;
  deletedAt: Date | null;
};

type InMemoryMetricsTransaction = {
  userId: string;
  walletId: string | null;
  amount: number;
  type: TransactionType;
  date: Date;
  deletedAt: Date | null;
};

type InMemoryMetricsCreditCard = {
  id: string;
  userId: string;
  deletedAt: Date | null;
};

type InMemoryMetricsCreditCardInvoice = {
  creditCardId: string;
  totalAmount: number;
  paid: boolean;
  deletedAt: Date | null;
};

export const makeInMemoryMetricsRepository = () => {
  const wallets: InMemoryMetricsWallet[] = [];
  const transactions: InMemoryMetricsTransaction[] = [];
  const creditCards: InMemoryMetricsCreditCard[] = [];
  const creditCardInvoices: InMemoryMetricsCreditCardInvoice[] = [];

  return {
    wallets,
    transactions,
    creditCards,
    creditCardInvoices,

    findAssetsAndLiabilities: async (userId: string) => {
      const assets = wallets
        .filter((w) => w.userId === userId && w.deletedAt === null)
        .reduce((sum, w) => sum + w.balance, 0);

      const userCreditCardIds = new Set(
        creditCards.filter((c) => c.userId === userId && c.deletedAt === null).map((c) => c.id),
      );

      const liabilities = creditCardInvoices
        .filter((i) => userCreditCardIds.has(i.creditCardId) && !i.paid && i.deletedAt === null)
        .reduce((sum, i) => sum + i.totalAmount, 0);

      return { assets, liabilities };
    },

    findWalletTransactionsInRange: async (userId: string, from: Date, to: Date) => {
      return transactions
        .filter(
          (t) =>
            t.userId === userId &&
            t.deletedAt === null &&
            t.walletId !== null &&
            t.date >= from &&
            t.date <= to,
        )
        .map((t) => ({ amount: t.amount, type: t.type, date: t.date }));
    },
  };
};
