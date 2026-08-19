import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeDeleteWalletUseCase } from "../../../src/modules/wallets/use-cases/delete-wallet.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("makeDeleteWalletUseCase", () => {
  it("should soft-delete a wallet and make it invisible to findById", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const deleteWallet = makeDeleteWalletUseCase(repo as any);
    const userId = faker.string.uuid();
    const wallet = await repo.create(makeFakeWallet({ userId }));

    // Act
    await deleteWallet({ walletId: wallet.id, userId });

    // Assert
    const rawItem = repo.items.find((w) => w.id === wallet.id);
    expect(rawItem?.deletedAt).not.toBeNull();

    const found = await repo.findById(wallet.id);
    expect(found).toBeNull();
  });

  it("should throw WALLET_NOT_FOUND when the wallet does not exist", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const deleteWallet = makeDeleteWalletUseCase(repo as any);

    // Act & Assert
    await expect(
      deleteWallet({ walletId: faker.string.uuid(), userId: faker.string.uuid() })
    ).rejects.toMatchObject({
      code: "WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw WALLET_ACCESS_DENIED when the wallet belongs to another user", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const deleteWallet = makeDeleteWalletUseCase(repo as any);
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const wallet = await repo.create(makeFakeWallet({ userId: ownerId }));

    // Act & Assert
    await expect(
      deleteWallet({ walletId: wallet.id, userId: otherUserId })
    ).rejects.toMatchObject({
      code: "WALLET_ACCESS_DENIED",
      statusCode: 403,
    });
  });

  it("should exclude the deleted wallet from the user's wallet listing", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const deleteWallet = makeDeleteWalletUseCase(repo as any);
    const userId = faker.string.uuid();
    const keeper = await repo.create(makeFakeWallet({ userId, name: "Keep" }));
    const toDelete = await repo.create(makeFakeWallet({ userId, name: "Delete" }));

    // Act
    await deleteWallet({ walletId: toDelete.id, userId });

    // Assert
    const remaining = await repo.findManyByUser(userId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(keeper.id);
  });
});
