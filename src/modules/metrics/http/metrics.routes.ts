import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { expensesByCategoryQuerySchema, expensesByCategoryResponseSchema } from "../dtos/expenses-by-category.dto.js";
import { netWorthResponseSchema } from "../dtos/net-worth.dto.js";
import { netWorthTrendResponseSchema } from "../dtos/net-worth-trend.dto.js";
import { metricsRepository } from "../repositories/metrics.repository.js";
import { makeGetExpensesByCategoryUseCase } from "../use-cases/get-expenses-by-category.use-case.js";
import { makeGetNetWorthUseCase } from "../use-cases/get-net-worth.use-case.js";
import { makeGetNetWorthTrendUseCase } from "../use-cases/get-net-worth-trend.use-case.js";

export const metricsRoutes = async (app: FastifyInstance) => {
  const getNetWorth = makeGetNetWorthUseCase(metricsRepository);
  const getNetWorthTrend = makeGetNetWorthTrendUseCase(metricsRepository);
  const getExpensesByCategory = makeGetExpensesByCategoryUseCase(metricsRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/net-worth",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Metrics"],
      response: {
        200: netWorthResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const summary = await getNetWorth(request.userId);
      return reply.status(200).send(summary);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/net-worth-trend",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Metrics"],
      response: {
        200: netWorthTrendResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const trend = await getNetWorthTrend(request.userId);
      return reply.status(200).send(trend);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/expenses-by-category",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Metrics"],
      querystring: expensesByCategoryQuerySchema,
      response: {
        200: expensesByCategoryResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { month, year } = request.query;
      const result = await getExpensesByCategory({
        userId: request.userId,
        ...(month !== undefined ? { month } : {}),
        ...(year !== undefined ? { year } : {}),
      });
      return reply.status(200).send(result);
    },
  });
};
