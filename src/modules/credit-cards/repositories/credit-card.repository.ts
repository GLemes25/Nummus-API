import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";
import type { UpdateCreditCardDto } from "../dtos/update-credit-card.dto.js";

type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const creditCardRepository = {
  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.creditCard.findFirst({ where: { userId, name, deletedAt: null } });
  },

  findById: async (id: string) => {
    return prisma.creditCard.findFirst({ where: { id, deletedAt: null } });
  },

  findAllByUserId: async (userId: string) => {
    return prisma.creditCard.findMany({
      where: { userId, deletedAt: null },
      include: {
        invoices: {
          where: { paid: false, deletedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create: async (data: CreateCreditCardInput) => {
    return prisma.creditCard.create({
      data: {
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        userId: data.userId,
      },
    });
  },

  update: async (id: string, data: UpdateCreditCardDto) => {
    return prisma.creditCard.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.limit !== undefined ? { limit: data.limit } : {}),
        ...(data.closingDay !== undefined ? { closingDay: data.closingDay } : {}),
        ...(data.dueDay !== undefined ? { dueDay: data.dueDay } : {}),
      },
    });
  },

  softDelete: async (id: string) => {
    await prisma.creditCard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
