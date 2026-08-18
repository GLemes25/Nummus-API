import { z } from "zod";

export const walletTypeSchema = z.enum(["CHECKING", "SAVINGS", "INVESTMENT", "CREDIT_CARD"], {
  error: "O tipo da carteira deve ser CHECKING, SAVINGS, INVESTMENT ou CREDIT_CARD",
});

export const createWalletSchema = z.object({
  name: z
    .string({ error: "O nome da carteira é obrigatório" })
    .min(1, "O nome da carteira é obrigatório"),
  type: walletTypeSchema.default("CHECKING"),
  currency: z.string({ error: "A moeda deve ser um texto válido" }).default("BRL"),
  initialBalance: z.number({ error: "O saldo inicial deve ser um número válido" }).default(0),
  creditLimit: z
    .number({ error: "O limite de crédito deve ser um número válido" })
    .positive("O limite de crédito deve ser maior que zero")
    .optional(),
  closingDay: z
    .number({ error: "O dia de fechamento deve ser um número válido" })
    .int("O dia de fechamento deve ser um número inteiro")
    .min(1, "O dia de fechamento deve estar entre 1 e 28")
    .max(28, "O dia de fechamento deve estar entre 1 e 28")
    .optional(),
  dueDay: z
    .number({ error: "O dia de vencimento deve ser um número válido" })
    .int("O dia de vencimento deve ser um número inteiro")
    .min(1, "O dia de vencimento deve estar entre 1 e 28")
    .max(28, "O dia de vencimento deve estar entre 1 e 28")
    .optional(),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;

export const getWalletsSchema = z.object({
  isArchived: z
    .enum(["true", "false"], { error: "O filtro isArchived deve ser 'true' ou 'false'" })
    .transform((v) => v === "true")
    .optional(),
});

export type GetWalletsDto = z.infer<typeof getWalletsSchema>;

export const walletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: walletTypeSchema,
  currency: z.string(),
  initialBalance: z.number(),
  balance: z.number(),
  creditLimit: z.number().nullable(),
  closingDay: z.number().nullable(),
  dueDay: z.number().nullable(),
  isArchived: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WalletResponseDto = z.infer<typeof walletResponseSchema>;
