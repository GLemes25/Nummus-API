import { prisma } from "../../../shared/lib/prisma.js";

export const metricsRepository = {
  findAssetsAndLiabilities: async (userId: string) => {
    const [assetsResult, liabilitiesResult] = await Promise.all([
      prisma.wallet.aggregate({
        where: { userId, deletedAt: null, type: { in: ["CHECKING", "SAVINGS", "INVESTMENT"] } },
        _sum: { balance: true },
      }),
      prisma.wallet.aggregate({
        where: { userId, deletedAt: null, type: "CREDIT_CARD" },
        _sum: { balance: true },
      }),
    ]);

    return {
      assets: Number(assetsResult._sum.balance ?? 0),
      liabilities: Math.abs(Number(liabilitiesResult._sum.balance ?? 0)),
    };
  },

  findWalletTransactionsInRange: async (userId: string, from: Date, to: Date) => {
    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        walletId: { not: null },
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
    });
  },

  findExpensesByPeriod: async (userId: string, from: Date, to: Date) => {
    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: "EXPENSE",
        date: { gte: from, lt: to },
      },
      select: {
        amount: true,
        categoryId: true,
        category: {
          select: { name: true, color: true, icon: true },
        },
      },
    });
  },
};
