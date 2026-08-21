import { z } from "zod";

export const createCreditCardSchema = z.object({
  name: z
    .string({ error: "O nome do cartão de crédito é obrigatório" })
    .min(1, "O nome do cartão de crédito é obrigatório"),
  limit: z
    .number({ error: "O limite deve ser um número válido" })
    .positive("O limite deve ser maior que zero"),
  closingDay: z
    .number({ error: "O dia de fechamento deve ser um número válido" })
    .int("O dia de fechamento deve ser um número inteiro")
    .min(1, "O dia de fechamento deve estar entre 1 e 28")
    .max(28, "O dia de fechamento deve estar entre 1 e 28"),
  dueDay: z
    .number({ error: "O dia de vencimento deve ser um número válido" })
    .int("O dia de vencimento deve ser um número inteiro")
    .min(1, "O dia de vencimento deve estar entre 1 e 28")
    .max(28, "O dia de vencimento deve estar entre 1 e 28"),
  walletId: z
    .string({ error: "O ID da carteira deve ser um texto válido" })
    .uuid("O ID da carteira deve ser um UUID válido")
    .optional(),
});

export type CreateCreditCardDto = z.infer<typeof createCreditCardSchema>;

export const creditCardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  limit: z.number(),
  closingDay: z.number(),
  dueDay: z.number(),
  walletId: z.string().nullable(),
  currentInvoiceAmount: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreditCardResponseDto = z.infer<typeof creditCardResponseSchema>;
