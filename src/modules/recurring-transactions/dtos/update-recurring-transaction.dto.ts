import { z } from "zod";

import { recurringTransactionBaseSchema } from "./create-recurring-transaction.dto.js";

export const updateRecurringTransactionSchema = recurringTransactionBaseSchema.partial().extend({
  active: z.boolean().optional(),
});

export type UpdateRecurringTransactionDto = z.infer<typeof updateRecurringTransactionSchema>;
