import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createTransferSchema, transferResponseSchema } from "../dtos/create-transfer.dto.js";
import { transferDetailsResponseSchema, updateTransferSchema } from "../dtos/transfer-details.dto.js";
import { transferRepository } from "../repositories/transfer.repository.js";
import { makeCreateTransferUseCase } from "../use-cases/create-transfer.use-case.js";
import { makeGetTransferByTransactionUseCase } from "../use-cases/get-transfer-by-transaction.use-case.js";
import { makeUpdateTransferUseCase } from "../use-cases/update-transfer.use-case.js";
import { presentTransfer, presentTransferDetails } from "./presenters/transfer.presenter.js";

export const transferRoutes = async (app: FastifyInstance) => {
  const createTransfer = makeCreateTransferUseCase(transferRepository);
  const getTransferByTransaction = makeGetTransferByTransactionUseCase(transferRepository);
  const updateTransfer = makeUpdateTransferUseCase(transferRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Transfers"],
      body: createTransferSchema,
      response: {
        201: transferResponseSchema,
        400: appErrorResponseSchema,
        404: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const transfer = await createTransfer({ ...request.body, userId });
      return reply.status(201).send(presentTransfer(transfer));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/by-transaction/:transactionId",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Transfers"],
      params: z.object({ transactionId: z.string() }),
      response: {
        200: transferDetailsResponseSchema,
        404: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const transfer = await getTransferByTransaction(request.params.transactionId, userId);
      return reply.status(200).send(presentTransferDetails(transfer));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:id",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Transfers"],
      params: z.object({ id: z.string() }),
      body: updateTransferSchema,
      response: {
        200: transferDetailsResponseSchema,
        400: appErrorResponseSchema,
        404: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const transfer = await updateTransfer({
        ...request.body,
        transferId: request.params.id,
        userId,
      });
      return reply.status(200).send(presentTransferDetails(transfer));
    },
  });
};
