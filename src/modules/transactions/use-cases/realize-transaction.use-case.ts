import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { transactionRepository } from "../repositories/transaction.repository.js";

type TransactionRepository = typeof transactionRepository;
type WalletWithBalance = { balance: { toNumber: () => number } };
type FindWallet = (id: string) => Promise<WalletWithBalance | null>;

type RealizeTransactionInput = {
  transactionId: string;
  userId: string;
};

export const makeRealizeTransactionUseCase = (
  repository: TransactionRepository,
  findWallet: FindWallet
) => {
  return async ({ transactionId, userId }: RealizeTransactionInput) => {
    const transaction = await repository.findById(transactionId);

    if (!transaction || transaction.deletedAt !== null) {
      throw makeAppError({
        code: "TRANSACTION_NOT_FOUND",
        message: "Transação não encontrada",
        statusCode: 404,
      });
    }

    if (transaction.userId !== userId) {
      throw makeAppError({
        code: "TRANSACTION_ACCESS_DENIED",
        message: "Você não tem permissão para efetivar esta transação",
        statusCode: 403,
      });
    }

    if (transaction.status === "COMPLETED") {
      throw makeAppError({
        code: "TRANSACTION_ALREADY_REALIZED",
        message: "Esta transação já foi efetivada",
        statusCode: 409,
      });
    }

    if (transaction.paymentMethod === "CREDIT" || transaction.type === "BALANCE_ADJUSTMENT" || !transaction.walletId) {
      return repository.realize(transactionId);
    }

    const wallet = await findWallet(transaction.walletId);
    if (!wallet) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    const amount = Number(transaction.amount);
    const currentBalance = wallet.balance.toNumber();
    const newBalance = transaction.type === "INCOME" ? currentBalance + amount : currentBalance - amount;

    return repository.realizeWithBalanceUpdate(transactionId, transaction.walletId, newBalance);
  };
};
