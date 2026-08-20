import { prisma } from "../../../shared/lib/prisma.js";

export const metricsRepository = {
  findAssetsAndLiabilities: async (userId: string) => {
    const [assetsResult, liabilitiesResult] = await Promise.all([
      prisma.wallet.aggregate({
        where: { userId, deletedAt: null },
        _sum: { balance: true },
      }),
      prisma.creditCardInvoice.aggregate({
        where: { paid: false, deletedAt: null, creditCard: { userId, deletedAt: null } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      assets: Number(assetsResult._sum.balance ?? 0),
      liabilities: Number(liabilitiesResult._sum.totalAmount ?? 0),
    };
  },

  findWalletTransactionsInRange: async (userId: string, from: Date, to: Date) => {
    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        walletId: { not: null },
        paymentMethod: { not: "TRANSFER" },
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
        paymentMethod: { not: "TRANSFER" },
        date: { gte: from, lte: to },
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
