import { prisma } from "../../../shared/lib/prisma.js";
import { makeAppError } from "../../../shared/errors/make-app-error.js";

type CreateTransferInput = {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  description: string | null;
  categoryId: string | null;
  userId: string;
};

type UpdateTransferInput = {
  transferId: string;
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  userId: string;
};

export const transferRepository = {
  create: async (data: CreateTransferInput) => {
    return prisma.$transaction(async (tx) => {
      const sourceWallet = await tx.wallet.findFirst({
        where: { id: data.sourceWalletId, userId: data.userId, deletedAt: null },
      });
      if (!sourceWallet) {
        throw makeAppError({
          code: "SOURCE_WALLET_NOT_FOUND",
          message: "Carteira de origem não encontrada",
          statusCode: 404,
        });
      }

      const destinationWallet = await tx.wallet.findFirst({
        where: { id: data.destinationWalletId, userId: data.userId, deletedAt: null },
      });
      if (!destinationWallet) {
        throw makeAppError({
          code: "DESTINATION_WALLET_NOT_FOUND",
          message: "Carteira de destino não encontrada",
          statusCode: 404,
        });
      }

      const outTransaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "EXPENSE",
          paymentMethod: "TRANSFER",
          status: "COMPLETED",
          date: data.date,
          description: data.description ?? "Transfer out",
          walletId: data.sourceWalletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      await tx.wallet.update({
        where: { id: data.sourceWalletId },
        data: { balance: { decrement: data.amount } },
      });

      const inTransaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "INCOME",
          paymentMethod: "TRANSFER",
          status: "COMPLETED",
          date: data.date,
          description: data.description ?? "Transfer in",
          walletId: data.destinationWalletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      await tx.wallet.update({
        where: { id: data.destinationWalletId },
        data: { balance: { increment: data.amount } },
      });

      return tx.transfer.create({
        data: {
          outTransactionId: outTransaction.id,
          inTransactionId: inTransaction.id,
          userId: data.userId,
          description: data.description ?? null,
        },
      });
    });
  },

  findByTransactionId: async (transactionId: string, userId: string) => {
    return prisma.transfer.findFirst({
      where: {
        userId,
        deletedAt: null,
        OR: [{ outTransactionId: transactionId }, { inTransactionId: transactionId }],
      },
      include: {
        outTransaction: true,
        inTransaction: true,
      },
    });
  },

  update: async (data: UpdateTransferInput) => {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id: data.transferId, userId: data.userId, deletedAt: null },
        include: {
          outTransaction: true,
          inTransaction: true,
        },
      });
      if (!transfer) {
        throw makeAppError({
          code: "TRANSFER_NOT_FOUND",
          message: "Transferência não encontrada",
          statusCode: 404,
        });
      }

      const sourceWallet = await tx.wallet.findFirst({
        where: { id: data.sourceWalletId, userId: data.userId, deletedAt: null },
      });
      if (!sourceWallet) {
        throw makeAppError({
          code: "SOURCE_WALLET_NOT_FOUND",
          message: "Carteira de origem não encontrada",
          statusCode: 404,
        });
      }

      const destinationWallet = await tx.wallet.findFirst({
        where: { id: data.destinationWalletId, userId: data.userId, deletedAt: null },
      });
      if (!destinationWallet) {
        throw makeAppError({
          code: "DESTINATION_WALLET_NOT_FOUND",
          message: "Carteira de destino não encontrada",
          statusCode: 404,
        });
      }

      const oldOutWalletId = transfer.outTransaction.walletId;
      const oldOutAmount = transfer.outTransaction.amount;
      const oldInWalletId = transfer.inTransaction.walletId;
      const oldInAmount = transfer.inTransaction.amount;

      if (oldOutWalletId) {
        await tx.wallet.update({
          where: { id: oldOutWalletId },
          data: { balance: { increment: oldOutAmount } },
        });
      }

      if (oldInWalletId) {
        await tx.wallet.update({
          where: { id: oldInWalletId },
          data: { balance: { decrement: oldInAmount } },
        });
      }

      await tx.transaction.update({
        where: { id: transfer.outTransactionId },
        data: {
          walletId: data.sourceWalletId,
          amount: data.amount,
          date: data.date,
        },
      });

      await tx.transaction.update({
        where: { id: transfer.inTransactionId },
        data: {
          walletId: data.destinationWalletId,
          amount: data.amount,
          date: data.date,
        },
      });

      await tx.wallet.update({
        where: { id: data.sourceWalletId },
        data: { balance: { decrement: data.amount } },
      });

      await tx.wallet.update({
        where: { id: data.destinationWalletId },
        data: { balance: { increment: data.amount } },
      });

      return {
        id: transfer.id,
        sourceWalletId: data.sourceWalletId,
        destinationWalletId: data.destinationWalletId,
        amount: data.amount,
        date: data.date,
        description: transfer.description,
      };
    });
  },
};
