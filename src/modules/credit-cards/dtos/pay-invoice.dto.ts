import { z } from "zod";

export const payInvoiceSchema = z.object({
  walletId: z
    .string({ error: "A carteira é obrigatória" })
    .min(1, "A carteira é obrigatória"),
});

export type PayInvoiceDto = z.infer<typeof payInvoiceSchema>;
