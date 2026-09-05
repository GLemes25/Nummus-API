import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetTransferByTransactionUseCase } from "../../../src/modules/transfers/use-cases/get-transfer-by-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryTransferRepository } from "../../repositories/in-memory-transfer.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeTransfer } from "../../factories/transfer.factory.js";

describe("makeGetTransferByTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let transferRepo: ReturnType<typeof makeInMemoryTransferRepository>;
  let getTransferByTransaction: ReturnType<typeof makeGetTransferByTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    transferRepo = makeInMemoryTransferRepository(walletRepo.items);
    getTransferByTransaction = makeGetTransferByTransactionUseCase(transferRepo as any);
  });

  it("should return the transfer details when looking up by the out transaction id", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const transfer = await transferRepo.create(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 300 }),
    );

    // Act
    const result = await getTransferByTransaction(transfer.outTransactionId, userId);

    // Assert
    expect(result).toMatchObject({
      id: transfer.id,
      sourceWalletId: source.id,
      destinationWalletId: destination.id,
      amount: 300,
    });
  });

  it("should return the transfer details when looking up by the in transaction id", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const transfer = await transferRepo.create(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 150 }),
    );

    // Act
    const result = await getTransferByTransaction(transfer.inTransactionId, userId);

    // Assert
    expect(result).toMatchObject({
      id: transfer.id,
      sourceWalletId: source.id,
      destinationWalletId: destination.id,
      amount: 150,
    });
  });

  it("should throw TRANSFER_NOT_FOUND when no transfer matches the transaction id", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act & Assert
    await expect(getTransferByTransaction(faker.string.uuid(), userId)).rejects.toMatchObject({
      code: "TRANSFER_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw TRANSFER_NOT_FOUND when the transfer belongs to another user", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const source = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const destination = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 200 }));
    const transfer = await transferRepo.create(
      makeFakeTransfer({ userId, sourceWalletId: source.id, destinationWalletId: destination.id, amount: 100 }),
    );

    // Act & Assert
    await expect(getTransferByTransaction(transfer.outTransactionId, otherUserId)).rejects.toMatchObject({
      code: "TRANSFER_NOT_FOUND",
      statusCode: 404,
    });
  });
});
