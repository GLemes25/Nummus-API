import { faker } from "@faker-js/faker";

type TagInput = {
  name: string;
  userId: string;
};

export const makeFakeTag = (overrides: Partial<TagInput> = {}): TagInput => ({
  name: faker.word.sample(),
  userId: faker.string.uuid(),
  ...overrides,
});
