import { randomUUID } from "crypto";
import { makeAppError } from "../../src/shared/errors/make-app-error.js";
import type { InMemoryWallet } from "./in-memory-wallet.repository.ts";

type InMemoryTransfer = {
  id: string;
  outTransactionId: string;
  inTransactionId: string;
  userId: string;
  description: string | null;
  createdAt: Date;
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
        userId: data.userId,
        description: data.description ?? null,
        createdAt: new Date(),
      };
      items.push(transfer);
      return transfer;
    },
  };
};
