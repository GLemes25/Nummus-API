import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

import { transactionBaseSchema } from "./create-transaction.dto.js";

const updateTransactionBaseSchema = transactionBaseSchema.partial();

export const updateTransactionSchema = updateTransactionBaseSchema.superRefine((data, ctx) => {
  if (data.paymentMethod === undefined) return;

  if (data.paymentMethod === PaymentMethod.CREDIT) {
    if (data.walletId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["walletId"],
        message: "Uma transação de cartão de crédito não pode estar vinculada a uma carteira",
      });
    }
    if (data.creditCardId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditCardId"],
        message: "O cartão de crédito é obrigatório quando a forma de pagamento é CREDIT",
      });
    }
  } else {
    if (data.creditCardId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditCardId"],
        message: "Uma transação de carteira não pode estar vinculada a um cartão de crédito",
      });
    }
    if (data.walletId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["walletId"],
        message: "A carteira é obrigatória para formas de pagamento que não sejam cartão de crédito",
      });
    }
  }
});

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
