import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { walletRepository } from "../repositories/wallet.repository.js";

type WalletRepository = typeof walletRepository;

type DeleteWalletInput = {
  walletId: string;
  userId: string;
};

export const makeDeleteWalletUseCase = (repository: WalletRepository) => {
  return async ({ walletId, userId }: DeleteWalletInput) => {
    const wallet = await repository.findById(walletId);

    if (!wallet) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    if (wallet.userId !== userId) {
      throw makeAppError({
        code: "WALLET_ACCESS_DENIED",
        message: "Você não tem permissão para excluir esta carteira",
        statusCode: 403,
      });
    }

    await repository.softDelete(walletId);
  };
};
