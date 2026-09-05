import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { z } from "zod";

export const updateRecurringTransactionOccurrenceSchema = z.object({
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .positive("O valor deve ser maior que zero")
    .optional(),
  type: z
    .enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], { error: "O tipo da transação é inválido" })
    .optional(),
  paymentMethod: z
    .enum([PaymentMethod.CASH, PaymentMethod.PIX, PaymentMethod.TRANSFER, PaymentMethod.DEBIT], {
      error: "A forma de pagamento é inválida",
    })
    .optional(),
  date: z.coerce.date({ error: "A data informada é inválida" }).optional(),
  description: z.string().min(1, "A descrição é obrigatória").optional(),
  walletId: z.string().min(1, "O identificador da carteira é inválido").optional(),
  categoryId: z.string().min(1, "O identificador da categoria é inválido").optional(),
});

export type UpdateRecurringTransactionOccurrenceDto = z.infer<
  typeof updateRecurringTransactionOccurrenceSchema
>;

export const recurringTransactionOccurrenceResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(TransactionStatus),
  date: z.date(),
  description: z.string(),
  walletId: z.string().nullable(),
  categoryId: z.string().nullable(),
  recurringTransactionId: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecurringTransactionOccurrenceResponseDto = z.infer<
  typeof recurringTransactionOccurrenceResponseSchema
>;
