import { prisma } from "../../../shared/lib/prisma.js";

export const metricsRepository = {
  findTotalWalletBalance: async (userId: string) => {
    const result = await prisma.wallet.aggregate({
      where: { userId, deletedAt: null },
      _sum: { balance: true },
    });
    return Number(result._sum.balance ?? 0);
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
