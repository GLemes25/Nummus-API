import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

export const makeGetNetWorthUseCase = (repository: MetricsRepository) => {
  return async (userId: string) => {
    const { assets, liabilities } = await repository.findAssetsAndLiabilities(userId);

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
    };
  };
};
