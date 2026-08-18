import { z } from "zod";

export const netWorthResponseSchema = z.object({
  assets: z.number(),
  liabilities: z.number(),
  netWorth: z.number(),
});

export type NetWorthResponseDto = z.infer<typeof netWorthResponseSchema>;
