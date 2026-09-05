import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import {
  createRecurringTransactionSchema,
  recurringTransactionResponseSchema,
} from "../dtos/create-recurring-transaction.dto.js";
import { updateRecurringTransactionSchema } from "../dtos/update-recurring-transaction.dto.js";
import {
  updateRecurringTransactionOccurrenceSchema,
  recurringTransactionOccurrenceResponseSchema,
} from "../dtos/update-recurring-transaction-occurrence.dto.js";
import { recurringTransactionRepository } from "../repositories/recurring-transaction.repository.js";
import { makeCreateRecurringTransactionUseCase } from "../use-cases/create-recurring-transaction.use-case.js";
import { makeUpdateRecurringTransactionUseCase } from "../use-cases/update-recurring-transaction.use-case.js";
import { makeUpdateRecurringTransactionOccurrenceUseCase } from "../use-cases/update-recurring-transaction-occurrence.use-case.js";
import {
  presentRecurringTransaction,
  presentRecurringTransactionOccurrence,
} from "./presenters/recurring-transaction.presenter.js";

type FindWallet = (id: string) => Promise<{ id: string } | null>;
type FindCategory = (id: string) => Promise<{ id: string } | null>;

type RecurringTransactionRouteDeps = {
  findWallet: FindWallet;
  findCategory: FindCategory;
};

export const recurringTransactionRoutes =
  (deps: RecurringTransactionRouteDeps) => async (app: FastifyInstance) => {
    const createRecurringTransaction = makeCreateRecurringTransactionUseCase(
      recurringTransactionRepository,
      deps.findWallet,
      deps.findCategory
    );
    const updateRecurringTransaction = makeUpdateRecurringTransactionUseCase(
      recurringTransactionRepository,
      deps.findWallet,
      deps.findCategory
    );
    const updateRecurringTransactionOccurrence = makeUpdateRecurringTransactionOccurrenceUseCase(
      recurringTransactionRepository
    );

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Recurring Transactions"],
        body: createRecurringTransactionSchema,
        response: {
          201: recurringTransactionResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const recurringTransaction = await createRecurringTransaction({ ...request.body, userId });
        return reply.status(201).send(presentRecurringTransaction(recurringTransaction));
      },
    });

    // Edita o registro Mestre e regenera todas as ocorrências futuras ainda não pagas
    app.withTypeProvider<ZodTypeProvider>().route({
      method: "PATCH",
      url: "/:id",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Recurring Transactions"],
        params: z.object({ id: z.string() }),
        body: updateRecurringTransactionSchema,
        response: {
          200: recurringTransactionResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const recurringTransaction = await updateRecurringTransaction({
          recurringTransactionId: request.params.id,
          userId: request.userId,
          data: request.body,
        });
        return reply.status(200).send(presentRecurringTransaction(recurringTransaction));
      },
    });

    // Edita apenas uma ocorrência já gerada, desvinculando-a do Mestre
    app.withTypeProvider<ZodTypeProvider>().route({
      method: "PATCH",
      url: "/:id/occurrences/:transactionId",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Recurring Transactions"],
        params: z.object({ id: z.string(), transactionId: z.string() }),
        body: updateRecurringTransactionOccurrenceSchema,
        response: {
          200: recurringTransactionOccurrenceResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const occurrence = await updateRecurringTransactionOccurrence({
          recurringTransactionId: request.params.id,
          transactionId: request.params.transactionId,
          userId: request.userId,
          data: request.body,
        });
        return reply.status(200).send(presentRecurringTransactionOccurrence(occurrence));
      },
    });
  };
