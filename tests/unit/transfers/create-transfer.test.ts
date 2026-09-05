import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransferUseCase } from "../../../src/modules/transfers/use-cases/create-transfer.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryTransferRepository } from "../../repositories/in-memory-transfer.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeTransfer } from "../../factories/transfer.factory.js";

describe("makeCreateTransferUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let transferRepo: ReturnType<typeof makeInMemoryTransferRepository>;
  let createTransfer: ReturnType<typeof makeCreateTransferUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    transferRepo = makeInMemoryTransferRepository(walletRepo.items);
    createTransfer = makeCreateTransferUseCase(transferRepo as any);
  });

  it("should throw SAME_SOURCE_AND_DESTINATION_WALLET when both wallet IDs are identical", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const sameWalletId = faker.string.uuid();

    // Act & Assert
    await expect(
      createTransfer(
        makeFakeTransfer({ userId, sourceWalletId: sameWalletId, destinationWalletId: sameWalletId })
      )
    ).rejects.toMatchObject({
      code: "SAME_SOURCE_AND_DESTINATION_WALLET",
    });
  });

  it("should deduct from the source wallet and add to the destination wallet on success", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));

    // Act
    const transfer = await createTransfer(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 300 })
    );

    // Assert
    const sourceItem = walletRepo.items.find((w) => w.id === source.id);
    const destinationItem = walletRepo.items.find((w) => w.id === destination.id);

    expect(sourceItem?.balance).toBe(700);
    expect(destinationItem?.balance).toBe(500);
    expect(transfer.userId).toBe(userId);
    expect(transferRepo.items).toHaveLength(1);
  });

  it("should throw SOURCE_WALLET_NOT_FOUND when the source wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act & Assert
    await expect(
      createTransfer(
        makeFakeTransfer({
          userId,
          sourceWalletId: faker.string.uuid(),
          destinationWalletId: destination.id,
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "SOURCE_WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw DESTINATION_WALLET_NOT_FOUND when the destination wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));

    // Act & Assert
    await expect(
      createTransfer(
        makeFakeTransfer({
          userId,
          sourceWalletId: source.id,
          destinationWalletId: faker.string.uuid(),
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "DESTINATION_WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should nullify category and description for transfers regardless of input", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 100 }));

    // Act
    const transfer = await createTransfer(
      makeFakeTransfer({
        userId,
        sourceWalletId: source.id,
        destinationWalletId: destination.id,
        amount: 50,
        description: "Rent split",
      })
    );

    // Assert
    expect(transfer.description).toBeNull();
  });
});
