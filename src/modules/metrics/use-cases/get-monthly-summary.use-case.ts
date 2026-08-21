import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

type GetMonthlySummaryInput = {
  userId: string;
  startDate: Date;
  endDate: Date;
};

export const makeGetMonthlySummaryUseCase = (repository: MetricsRepository) => {
  return async (input: GetMonthlySummaryInput) => {
    const transactions = await repository.findIncomeAndExpenseByPeriod(
      input.userId,
      input.startDate,
      input.endDate,
    );

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === "INCOME") {
        totalIncome += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        totalExpense += Number(tx.amount);
      }
    }

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;

    return {
      totalIncome,
      totalExpense,
      balance: Math.round((totalIncome - totalExpense) * 100) / 100,
    };
  };
};
