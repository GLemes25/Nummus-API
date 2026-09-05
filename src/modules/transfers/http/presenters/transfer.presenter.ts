import type { Prisma, Transfer } from "@prisma/client";

import type { TransferResponseDto } from "../../dtos/create-transfer.dto.js";
import type { TransferDetailsResponseDto } from "../../dtos/transfer-details.dto.js";

export const presentTransfer = (transfer: Transfer): TransferResponseDto => ({
  id: transfer.id,
  outTransactionId: transfer.outTransactionId,
  inTransactionId: transfer.inTransactionId,
  userId: transfer.userId,
  description: transfer.description,
  createdAt: transfer.createdAt,
});

type TransferDetails = {
  id: string;
  sourceWalletId: string | null;
  destinationWalletId: string | null;
  amount: Prisma.Decimal | number;
  date: Date;
  description: string | null;
};

export const presentTransferDetails = (transfer: TransferDetails): TransferDetailsResponseDto => ({
  id: transfer.id,
  sourceWalletId: transfer.sourceWalletId ?? "",
  destinationWalletId: transfer.destinationWalletId ?? "",
  amount: Number(transfer.amount),
  date: transfer.date,
  description: transfer.description,
});
