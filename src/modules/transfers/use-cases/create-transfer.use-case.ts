import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { transferRepository } from "../repositories/transfer.repository.js";
import type { CreateTransferDto } from "../dtos/create-transfer.dto.js";

type TransferRepository = typeof transferRepository;

type CreateTransferInput = CreateTransferDto & { userId: string };

export const makeCreateTransferUseCase = (repository: TransferRepository) => {
  return async (data: CreateTransferInput) => {
    if (data.sourceWalletId === data.destinationWalletId) {
      throw makeAppError({
        code: "SAME_SOURCE_AND_DESTINATION_WALLET",
        message: "A carteira de origem e a carteira de destino não podem ser as mesmas",
      });
    }

    // Transferências entre carteiras próprias não afetam o fluxo de caixa por categoria e não necessitam de notas
    return repository.create({
      sourceWalletId: data.sourceWalletId,
      destinationWalletId: data.destinationWalletId,
      amount: data.amount,
      date: data.date,
      categoryId: null,
      description: null,
      userId: data.userId,
    });
  };
};
