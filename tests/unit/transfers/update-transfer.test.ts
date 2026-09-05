import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeUpdateTransferUseCase } from "../../../src/modules/transfers/use-cases/update-transfer.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryTransferRepository } from "../../repositories/in-memory-transfer.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeTransfer, makeFakeUpdateTransfer } from "../../factories/transfer.factory.js";

describe("makeUpdateTransferUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let transferRepo: ReturnType<typeof makeInMemoryTransferRepository>;
  let updateTransfer: ReturnType<typeof makeUpdateTransferUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    transferRepo = makeInMemoryTransferRepository(walletRepo.items);
    updateTransfer = makeUpdateTransferUseCase(transferRepo as any);
  });

  it("should throw SAME_SOURCE_AND_DESTINATION_WALLET when both wallet IDs are identical", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const sameWalletId = faker.string.uuid();

    // Act & Assert
    await expect(
      updateTransfer(
        makeFakeUpdateTransfer({ userId, sourceWalletId: sameWalletId, destinationWalletId: sameWalletId }),
      ),
    ).rejects.toMatchObject({
      code: "SAME_SOURCE_AND_DESTINATION_WALLET",
    });
  });

  it("should revert the old balances and apply the new balances when wallets change", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const oldSource = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const oldDestination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const newDestination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 50 }));

    const transfer = await transferRepo.create(
      makeFakeTransfer({
        userId,
        sourceWalletId: oldSource.id,
        destinationWalletId: oldDestination.id,
        amount: 300,
      }),
    );
    // oldSource: 700, oldDestination: 500 after creation

    // Act
    const result = await updateTransfer(
      makeFakeUpdateTransfer({
        transferId: transfer.id,
        userId,
        sourceWalletId: oldSource.id,
        destinationWalletId: newDestination.id,
        amount: 100,
      }),
    );

    // Assert
    const oldSourceItem = walletRepo.items.find((w) => w.id === oldSource.id);
    const oldDestinationItem = walletRepo.items.find((w) => w.id === oldDestination.id);
    const newDestinationItem = walletRepo.items.find((w) => w.id === newDestination.id);

    // old source reverted (+300) then debited again for new amount (-100) => 1000 - 100 = 900
    expect(oldSourceItem?.balance).toBe(900);
    // old destination reverted (-300) => back to 200
    expect(oldDestinationItem?.balance).toBe(200);
    // new destination credited with new amount => 50 + 100 = 150
    expect(newDestinationItem?.balance).toBe(150);

    expect(result).toMatchObject({
      id: transfer.id,
      sourceWalletId: oldSource.id,
      destinationWalletId: newDestination.id,
      amount: 100,
    });
  });

  it("should throw TRANSFER_NOT_FOUND when the transfer does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 100 }));

    // Act & Assert
    await expect(
      updateTransfer(
        makeFakeUpdateTransfer({
          transferId: faker.string.uuid(),
          userId,
          sourceWalletId: source.id,
          destinationWalletId: destination.id,
        }),
      ),
    ).rejects.toMatchObject({
      code: "TRANSFER_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw SOURCE_WALLET_NOT_FOUND when the new source wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const transfer = await transferRepo.create(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 100 }),
    );

    // Act & Assert
    await expect(
      updateTransfer(
        makeFakeUpdateTransfer({
          transferId: transfer.id,
          userId,
          sourceWalletId: faker.string.uuid(),
          destinationWalletId: destination.id,
        }),
      ),
    ).rejects.toMatchObject({
      code: "SOURCE_WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw DESTINATION_WALLET_NOT_FOUND when the new destination wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const transfer = await transferRepo.create(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 100 }),
    );

    // Act & Assert
    await expect(
      updateTransfer(
        makeFakeUpdateTransfer({
          transferId: transfer.id,
          userId,
          sourceWalletId: source.id,
          destinationWalletId: faker.string.uuid(),
        }),
      ),
    ).rejects.toMatchObject({
      code: "DESTINATION_WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });
});
