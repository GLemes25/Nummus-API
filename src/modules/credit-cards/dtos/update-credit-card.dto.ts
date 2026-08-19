import { z } from "zod";
import { createCreditCardSchema } from "./create-credit-card.dto.js";

export const updateCreditCardSchema = createCreditCardSchema.partial();

export type UpdateCreditCardDto = z.infer<typeof updateCreditCardSchema>;
