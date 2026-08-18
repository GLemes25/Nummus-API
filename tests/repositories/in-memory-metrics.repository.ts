type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type WalletType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "CREDIT_CARD";

type InMemoryMetricsWallet = {
  userId: string;
  balance: number;
  deletedAt: Date | null;
  type?: WalletType;
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

    findAssetsAndLiabilities: async (userId: string) => {
      const active = wallets.filter((w) => w.userId === userId && w.deletedAt === null);

      const assets = active
        .filter((w) => (w.type ?? "CHECKING") !== "CREDIT_CARD")
        .reduce((sum, w) => sum + w.balance, 0);

      const liabilities = active
        .filter((w) => w.type === "CREDIT_CARD")
        .reduce((sum, w) => sum + Math.abs(w.balance), 0);

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
