import { randomUUID } from "crypto";

type InMemoryTag = {
  id: string;
  name: string;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
};

export const makeInMemoryTagRepository = () => {
  const items: InMemoryTag[] = [];

  return {
    items,

    findByNameAndUser: async (userId: string, name: string) => {
      return (
        items.find((t) => t.userId === userId && t.name === name && t.deletedAt === null) ?? null
      );
    },

    create: async (data: { name: string; userId: string }) => {
      const tag: InMemoryTag = {
        id: randomUUID(),
        name: data.name,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
      };
      items.push(tag);
      return tag;
    },
  };
};
