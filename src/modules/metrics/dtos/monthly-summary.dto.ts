import { z } from "zod";

export const monthlySummaryQuerySchema = z
  .object({
    startDate: z.coerce.date({ error: "A data inicial é inválida" }),
    endDate: z.coerce.date({ error: "A data final é inválida" }),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "startDate deve ser menor ou igual a endDate",
    path: ["endDate"],
  });

export type MonthlySummaryQueryDto = z.infer<typeof monthlySummaryQuerySchema>;

export const monthlySummaryResponseSchema = z.object({
  totalIncome: z.number(),
  totalExpense: z.number(),
  balance: z.number(),
});

export type MonthlySummaryResponseDto = z.infer<typeof monthlySummaryResponseSchema>;
