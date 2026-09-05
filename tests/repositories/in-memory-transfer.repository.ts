import { randomUUID } from "crypto";
import { makeAppError } from "../../src/shared/errors/make-app-error.js";
import type { InMemoryWallet } from "./in-memory-wallet.repository.ts";

type InMemoryTransferTransaction = {
  walletId: string;
  amount: number;
  date: Date;
  description: string;
};

type InMemoryTransfer = {
  id: string;
  outTransactionId: string;
  inTransactionId: string;
  outTransaction: InMemoryTransferTransaction;
  inTransaction: InMemoryTransferTransaction;
  userId: string;
  description: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

type CreateTransferData = {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  description?: string;
  categoryId: string;
  userId: string;
};

type UpdateTransferData = {
  transferId: string;
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  userId: string;
};

export const makeInMemoryTransferRepository = (wallets: InMemoryWallet[]) => {
  const items: InMemoryTransfer[] = [];

  return {
    items,

    create: async (data: CreateTransferData) => {
      const sourceWallet = wallets.find(
        (w) => w.id === data.sourceWalletId && w.userId === data.userId && w.deletedAt === null,
      );
      if (!sourceWallet) {
        throw makeAppError({
          code: "SOURCE_WALLET_NOT_FOUND",
          message: "Carteira de origem não encontrada",
          statusCode: 404,
        });
      }

      const destinationWallet = wallets.find(
        (w) => w.id === data.destinationWalletId && w.userId === data.userId && w.deletedAt === null,
      );
      if (!destinationWallet) {
        throw makeAppError({
          code: "DESTINATION_WALLET_NOT_FOUND",
          message: "Carteira de destino não encontrada",
          statusCode: 404,
        });
      }

      sourceWallet.balance -= data.amount;
      destinationWallet.balance += data.amount;

      const transfer: InMemoryTransfer = {
        id: randomUUID(),
        outTransactionId: randomUUID(),
        inTransactionId: randomUUID(),
        outTransaction: {
          walletId: data.sourceWalletId,
          amount: data.amount,
          date: data.date,
          description: data.description ?? "Transfer out",
        },
        inTransaction: {
          walletId: data.destinationWalletId,
          amount: data.amount,
          date: data.date,
          description: data.description ?? "Transfer in",
        },
        userId: data.userId,
        description: data.description ?? null,
        createdAt: new Date(),
        deletedAt: null,
      };
      items.push(transfer);
      return transfer;
    },

    findByTransactionId: async (transactionId: string, userId: string) => {
      const transfer = items.find(
        (t) =>
          (t.outTransactionId === transactionId || t.inTransactionId === transactionId) &&
          t.userId === userId &&
          t.deletedAt === null,
      );
      return transfer ?? null;
    },

    update: async (data: UpdateTransferData) => {
      const transfer = items.find(
        (t) => t.id === data.transferId && t.userId === data.userId && t.deletedAt === null,
      );
      if (!transfer) {
        throw makeAppError({
          code: "TRANSFER_NOT_FOUND",
          message: "Transferência não encontrada",
          statusCode: 404,
        });
      }

      const sourceWallet = wallets.find(
        (w) => w.id === data.sourceWalletId && w.userId === data.userId && w.deletedAt === null,
      );
      if (!sourceWallet) {
        throw makeAppError({
          code: "SOURCE_WALLET_NOT_FOUND",
          message: "Carteira de origem não encontrada",
          statusCode: 404,
        });
      }

      const destinationWallet = wallets.find(
        (w) => w.id === data.destinationWalletId && w.userId === data.userId && w.deletedAt === null,
      );
      if (!destinationWallet) {
        throw makeAppError({
          code: "DESTINATION_WALLET_NOT_FOUND",
          message: "Carteira de destino não encontrada",
          statusCode: 404,
        });
      }

      const oldOutWallet = wallets.find((w) => w.id === transfer.outTransaction.walletId);
      if (oldOutWallet) {
        oldOutWallet.balance += transfer.outTransaction.amount;
      }

      const oldInWallet = wallets.find((w) => w.id === transfer.inTransaction.walletId);
      if (oldInWallet) {
        oldInWallet.balance -= transfer.inTransaction.amount;
      }

      transfer.outTransaction = {
        walletId: data.sourceWalletId,
        amount: data.amount,
        date: data.date,
        description: transfer.outTransaction.description,
      };
      transfer.inTransaction = {
        walletId: data.destinationWalletId,
        amount: data.amount,
        date: data.date,
        description: transfer.inTransaction.description,
      };

      sourceWallet.balance -= data.amount;
      destinationWallet.balance += data.amount;

      return {
        id: transfer.id,
        sourceWalletId: data.sourceWalletId,
        destinationWalletId: data.destinationWalletId,
        amount: data.amount,
        date: data.date,
        description: transfer.description,
      };
    },
  };
};
