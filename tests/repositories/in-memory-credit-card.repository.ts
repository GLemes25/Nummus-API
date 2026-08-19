import { randomUUID } from "crypto";

type InMemoryCreditCard = {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
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

export const makeInMemoryCreditCardRepository = () => {
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

    create: async (data: { name: string; limit: number; closingDay: number; dueDay: number; userId: string }) => {
      const card: InMemoryCreditCard = {
        id: randomUUID(),
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(card);
      return card;
    },
  };
};
