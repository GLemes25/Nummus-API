import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { transferRepository } from "../repositories/transfer.repository.js";

type TransferRepository = typeof transferRepository;

export const makeGetTransferByTransactionUseCase = (repository: TransferRepository) => {
  return async (transactionId: string, userId: string) => {
    const transfer = await repository.findByTransactionId(transactionId, userId);

    if (!transfer) {
      throw makeAppError({
        code: "TRANSFER_NOT_FOUND",
        message: "Transferência não encontrada",
        statusCode: 404,
      });
    }

    return {
      id: transfer.id,
      sourceWalletId: transfer.outTransaction.walletId,
      destinationWalletId: transfer.inTransaction.walletId,
      amount: transfer.outTransaction.amount,
      date: transfer.outTransaction.date,
      description: transfer.description,
    };
  };
};
