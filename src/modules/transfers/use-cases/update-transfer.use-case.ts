import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { transferRepository } from "../repositories/transfer.repository.js";
import type { UpdateTransferDto } from "../dtos/transfer-details.dto.js";

type TransferRepository = typeof transferRepository;

type UpdateTransferInput = UpdateTransferDto & { transferId: string; userId: string };

export const makeUpdateTransferUseCase = (repository: TransferRepository) => {
  return async (data: UpdateTransferInput) => {
    if (data.sourceWalletId === data.destinationWalletId) {
      throw makeAppError({
        code: "SAME_SOURCE_AND_DESTINATION_WALLET",
        message: "A carteira de origem e a carteira de destino não podem ser as mesmas",
      });
    }

    return repository.update({
      transferId: data.transferId,
      sourceWalletId: data.sourceWalletId,
      destinationWalletId: data.destinationWalletId,
      amount: data.amount,
      date: data.date,
      userId: data.userId,
    });
  };
};
