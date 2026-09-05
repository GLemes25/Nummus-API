import { z } from "zod";

export const transferDetailsResponseSchema = z.object({
  id: z.string(),
  sourceWalletId: z.string(),
  destinationWalletId: z.string(),
  amount: z.number(),
  date: z.date(),
  description: z.string().nullable(),
});

export type TransferDetailsResponseDto = z.infer<typeof transferDetailsResponseSchema>;

export const updateTransferSchema = z.object({
  sourceWalletId: z
    .string({ error: "A carteira de origem é obrigatória" })
    .min(1, "A carteira de origem é obrigatória"),
  destinationWalletId: z
    .string({ error: "A carteira de destino é obrigatória" })
    .min(1, "A carteira de destino é obrigatória"),
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .positive("O valor deve ser maior que zero")
    .min(0.01, "O valor mínimo é 0,01"),
  date: z.coerce.date({ error: "A data informada é inválida" }),
});

export type UpdateTransferDto = z.infer<typeof updateTransferSchema>;
