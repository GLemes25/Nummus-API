import type { Wallet } from "@prisma/client";

import type { WalletResponseDto } from "../../dtos/create-wallet.dto.js";

export const presentWallet = (wallet: Wallet): WalletResponseDto => ({
  id: wallet.id,
  name: wallet.name,
  type: wallet.type,
  currency: wallet.currency,
  initialBalance: Number(wallet.initialBalance),
  balance: Number(wallet.balance),
  creditLimit: wallet.creditLimit !== null ? Number(wallet.creditLimit) : null,
  closingDay: wallet.closingDay,
  dueDay: wallet.dueDay,
  isArchived: wallet.isArchived,
  userId: wallet.userId,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});
