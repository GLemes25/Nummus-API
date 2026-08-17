import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { netWorthTrendResponseSchema } from "../dtos/net-worth-trend.dto.js";
import { metricsRepository } from "../repositories/metrics.repository.js";
import { makeGetNetWorthTrendUseCase } from "../use-cases/get-net-worth-trend.use-case.js";

export const metricsRoutes = async (app: FastifyInstance) => {
  const getNetWorthTrend = makeGetNetWorthTrendUseCase(metricsRepository);

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
};
