import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createCreditCardSchema, creditCardResponseSchema } from "../dtos/create-credit-card.dto.js";
import { updateCreditCardSchema } from "../dtos/update-credit-card.dto.js";
import { creditCardRepository } from "../repositories/credit-card.repository.js";
import { makeCreateCreditCardUseCase } from "../use-cases/create-credit-card.use-case.js";
import { makeGetCreditCardsUseCase } from "../use-cases/get-credit-cards.use-case.js";
import { makeUpdateCreditCardUseCase } from "../use-cases/update-credit-card.use-case.js";
import { makeDeleteCreditCardUseCase } from "../use-cases/delete-credit-card.use-case.js";
import { presentCreditCard } from "./presenters/credit-card.presenter.js";

export const creditCardRoutes = async (app: FastifyInstance) => {
  const createCreditCard = makeCreateCreditCardUseCase(creditCardRepository);
  const getCreditCards = makeGetCreditCardsUseCase(creditCardRepository);
  const updateCreditCard = makeUpdateCreditCardUseCase(creditCardRepository);
  const deleteCreditCard = makeDeleteCreditCardUseCase(creditCardRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Credit Cards"],
      response: {
        200: z.array(creditCardResponseSchema),
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const creditCards = await getCreditCards(userId);
      return reply
        .status(200)
        .send(creditCards.map(({ creditCard, currentInvoiceAmount }) => presentCreditCard(creditCard, currentInvoiceAmount)));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Credit Cards"],
      body: createCreditCardSchema,
      response: {
        201: creditCardResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const creditCard = await createCreditCard({ ...request.body, userId });
      return reply.status(201).send(presentCreditCard(creditCard, 0));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:id",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Credit Cards"],
      params: z.object({ id: z.string() }),
      body: updateCreditCardSchema,
      response: {
        200: creditCardResponseSchema,
        403: appErrorResponseSchema,
        404: appErrorResponseSchema,
        409: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const creditCard = await updateCreditCard({
        creditCardId: request.params.id,
        userId,
        data: request.body,
      });
      return reply.status(200).send(presentCreditCard(creditCard, 0));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "DELETE",
    url: "/:id",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Credit Cards"],
      params: z.object({ id: z.string() }),
      response: {
        204: z.void(),
        403: appErrorResponseSchema,
        404: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      await deleteCreditCard({ creditCardId: request.params.id, userId: request.userId });
      return reply.status(204).send();
    },
  });
};
