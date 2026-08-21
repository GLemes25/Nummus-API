import { randomUUID } from "crypto";
import type { InMemoryWallet } from "./in-memory-wallet.repository.js";

type InMemoryCreditCard = {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  walletId: string | null;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type InMemoryCreditCardInvoice = {
  id: string;
  creditCardId: string;
  totalAmount: number;
  paid: boolean;
  deletedAt: Date | null;
};

type UpdateCreditCardData = {
  name?: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
  walletId?: string;
};

export const makeInMemoryCreditCardRepository = (wallets?: InMemoryWallet[]) => {
  const items: InMemoryCreditCard[] = [];
  const invoices: InMemoryCreditCardInvoice[] = [];

  return {
    items,
    invoices,

    findByNameAndUser: async (userId: string, name: string) => {
      return items.find((c) => c.userId === userId && c.name === name && c.deletedAt === null) ?? null;
    },

    findById: async (id: string) => {
      return items.find((c) => c.id === id && c.deletedAt === null) ?? null;
    },

    findAllByUserId: async (userId: string) => {
      return items
        .filter((c) => c.userId === userId && c.deletedAt === null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((c) => ({
          ...c,
          invoices: invoices.filter(
            (i) => i.creditCardId === c.id && !i.paid && i.deletedAt === null,
          ),
        }));
    },

    create: async (data: {
      name: string;
      limit: number;
      closingDay: number;
      dueDay: number;
      walletId?: string;
      userId: string;
    }) => {
      const card: InMemoryCreditCard = {
        id: randomUUID(),
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        walletId: data.walletId ?? null,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(card);
      return card;
    },

    update: async (id: string, data: UpdateCreditCardData) => {
      const card = items.find((c) => c.id === id && c.deletedAt === null);
      if (!card) return null;
      if (data.name !== undefined) card.name = data.name;
      if (data.limit !== undefined) card.limit = data.limit;
      if (data.closingDay !== undefined) card.closingDay = data.closingDay;
      if (data.dueDay !== undefined) card.dueDay = data.dueDay;
      if (data.walletId !== undefined) card.walletId = data.walletId;
      card.updatedAt = new Date();
      return card;
    },

    softDelete: async (id: string) => {
      const card = items.find((c) => c.id === id);
      if (card) card.deletedAt = new Date();
    },

    findOpenInvoicesByCard: async (creditCardId: string) => {
      return invoices.filter(
        (i) => i.creditCardId === creditCardId && !i.paid && i.deletedAt === null,
      );
    },

    payOpenInvoices: async (
      creditCardId: string,
      walletId: string,
      totalAmount: number,
      _userId: string,
    ) => {
      invoices
        .filter((i) => i.creditCardId === creditCardId && !i.paid && i.deletedAt === null)
        .forEach((i) => {
          i.paid = true;
        });

      if (wallets) {
        const wallet = wallets.find((w) => w.id === walletId);
        if (wallet) wallet.balance -= totalAmount;
      }
    },
  };
};
