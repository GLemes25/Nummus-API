import { z } from "zod";

export const netWorthTrendItemSchema = z.object({
  month: z.string(),
  balance: z.number(),
});

export const netWorthTrendResponseSchema = z.array(netWorthTrendItemSchema);

export type NetWorthTrendItem = z.infer<typeof netWorthTrendItemSchema>;
export type NetWorthTrendResponseDto = z.infer<typeof netWorthTrendResponseSchema>;
