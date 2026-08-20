import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

const UNCATEGORIZED = {
  name: "Sem categoria",
  color: "#9ca3af",
  icon: "help-circle",
};

type GetExpensesByCategoryInput = {
  userId: string;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
};

export const makeGetExpensesByCategoryUseCase = (repository: MetricsRepository) => {
  return async (input: GetExpensesByCategoryInput) => {
    let from: Date;
    let to: Date;

    if (input.startDate && input.endDate) {
      from = input.startDate;
      to = input.endDate;
    } else {
      const now = new Date();
      const month = input.month ?? now.getMonth() + 1;
      const year = input.year ?? now.getFullYear();

      from = new Date(year, month - 1, 1);
      to = new Date(year, month, 0, 23, 59, 59, 999); // último instante do mês (inclusivo)
    }

    const transactions = await repository.findExpensesByPeriod(input.userId, from, to);

    const grouped = new Map<
      string | null,
      { amount: number; name: string; color: string; icon: string }
    >();

    for (const tx of transactions) {
      const key = tx.categoryId ?? null;
      const meta = tx.category ?? UNCATEGORIZED;
      const existing = grouped.get(key);

      if (existing) {
        existing.amount += Number(tx.amount);
      } else {
        grouped.set(key, {
          amount: Number(tx.amount),
          name: meta.name,
          color: meta.color,
          icon: meta.icon,
        });
      }
    }

    const result = Array.from(grouped.values()).map((item) => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
    }));

    return result;
  };
};
