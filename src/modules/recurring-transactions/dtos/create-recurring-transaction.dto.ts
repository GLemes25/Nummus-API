import { PaymentMethod, RecurringFrequency } from "@prisma/client";
import { z } from "zod";

export const recurringTransactionBaseSchema = z.object({
  description: z
    .string({ error: "A descrição é obrigatória" })
    .min(1, "A descrição é obrigatória"),
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .positive("O valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], {
    error: "O tipo da transação é inválido",
  }),
  // Recorrência via cartão de crédito não é suportada nesta fase
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.PIX, PaymentMethod.TRANSFER, PaymentMethod.DEBIT], {
    error: "A forma de pagamento é inválida",
  }),
  frequency: z.nativeEnum(RecurringFrequency, { error: "A frequência é inválida" }),
  // Na criação, marca a primeira ocorrência; na edição, marca a partir de quando as novas regras valem
  startDate: z.coerce.date({ error: "A data informada é inválida" }),
  walletId: z.string().min(1, "O identificador da carteira é inválido"),
  categoryId: z.string().min(1, "O identificador da categoria é inválido"),
});

export const createRecurringTransactionSchema = recurringTransactionBaseSchema.extend({
  active: z.boolean().default(true).optional(),
});

export type CreateRecurringTransactionDto = z.infer<typeof createRecurringTransactionSchema>;

export const recurringTransactionResponseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  frequency: z.nativeEnum(RecurringFrequency),
  nextExecutionDate: z.date(),
  active: z.boolean(),
  walletId: z.string().nullable(),
  categoryId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecurringTransactionResponseDto = z.infer<typeof recurringTransactionResponseSchema>;
