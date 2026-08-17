import { z } from "zod";

export const expensesByCategoryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type ExpensesByCategoryQueryDto = z.infer<typeof expensesByCategoryQuerySchema>;

export const expensesByCategoryItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
  color: z.string(),
  icon: z.string(),
});

export const expensesByCategoryResponseSchema = z.array(expensesByCategoryItemSchema);

export type ExpensesByCategoryItem = z.infer<typeof expensesByCategoryItemSchema>;
export type ExpensesByCategoryResponseDto = z.infer<typeof expensesByCategoryResponseSchema>;
