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

export const makeInMemoryMetricsRepository = () => {
  const wallets: InMemoryMetricsWallet[] = [];
  const transactions: InMemoryMetricsTransaction[] = [];

  return {
    wallets,
    transactions,

    findTotalWalletBalance: async (userId: string) => {
      return wallets
        .filter((w) => w.userId === userId && w.deletedAt === null)
        .reduce((sum, w) => sum + w.balance, 0);
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
