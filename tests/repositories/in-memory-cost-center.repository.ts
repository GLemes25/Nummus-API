import { randomUUID } from "crypto";

type InMemoryCostCenter = {
  id: string;
  name: string;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const makeInMemoryCostCenterRepository = () => {
  const items: InMemoryCostCenter[] = [];

  return {
    items,

    findByNameAndUser: async (userId: string, name: string) => {
      return (
        items.find((c) => c.userId === userId && c.name === name && c.deletedAt === null) ?? null
      );
    },

    create: async (data: { name: string; userId: string }) => {
      const costCenter: InMemoryCostCenter = {
        id: randomUUID(),
        name: data.name,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(costCenter);
      return costCenter;
    },
  };
};
