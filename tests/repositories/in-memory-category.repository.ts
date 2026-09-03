import { randomUUID } from "crypto";

type InMemoryCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  isSystem: boolean;
  systemId: string | null;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const makeInMemoryCategoryRepository = () => {
  const items: InMemoryCategory[] = [];

  return {
    items,

    create: async (data: {
      name: string;
      color: string;
      icon: string;
      parentId?: string;
      userId: string;
      isSystem?: boolean;
      systemId?: string;
    }) => {
      const category: InMemoryCategory = {
        id: randomUUID(),
        name: data.name,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId ?? null,
        isSystem: data.isSystem ?? false,
        systemId: data.systemId ?? null,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(category);
      return category;
    },

    findByNameAndParent: async (userId: string, name: string, parentId: string | undefined) => {
      return (
        items.find(
          (c) =>
            c.userId === userId &&
            c.name === name &&
            c.parentId === (parentId ?? null) &&
            c.deletedAt === null
        ) ?? null
      );
    },

    findById: async (id: string) => {
      return items.find((c) => c.id === id && c.deletedAt === null) ?? null;
    },

    findBySystemId: async (userId: string, systemId: string) => {
      return (
        items.find((c) => c.userId === userId && c.systemId === systemId && c.deletedAt === null) ??
        null
      );
    },

    findManyByUser: async (userId: string) => {
      return items.filter((c) => c.userId === userId && c.deletedAt === null);
    },

    update: async (id: string, data: Partial<Pick<InMemoryCategory, "name" | "color" | "icon" | "parentId">>) => {
      const category = items.find((c) => c.id === id);
      if (!category) return null;
      Object.assign(category, data, { updatedAt: new Date() });
      return category;
    },

    softDelete: async (id: string) => {
      const category = items.find((c) => c.id === id);
      if (category) category.deletedAt = new Date();
    },

    createSystemCategory: async (data: {
      userId: string;
      systemId: string;
      name: string;
      icon: string;
      color: string;
    }) => {
      const category: InMemoryCategory = {
        id: randomUUID(),
        name: data.name,
        color: data.color,
        icon: data.icon,
        parentId: null,
        isSystem: true,
        systemId: data.systemId,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(category);
      return category;
    },
  };
};
