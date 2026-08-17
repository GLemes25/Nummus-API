import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

const UNCATEGORIZED = {
  name: "Sem categoria",
  color: "#9ca3af",
  icon: "help-circle",
};

export const makeGetExpensesByCategoryUseCase = (repository: MetricsRepository) => {
  return async (input: { userId: string; month?: number; year?: number }) => {
    const now = new Date();
    const month = input.month ?? now.getMonth() + 1;
    const year = input.year ?? now.getFullYear();

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1); // primeiro dia do mês seguinte (exclusivo)

    console.log('[DEBUG] Buscando despesas para:', { year, month, from, to });

    const transactions = await repository.findExpensesByPeriod(input.userId, from, to);

    console.log('[DEBUG] Transações encontradas no BD:', transactions.length);

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

    console.log('[DEBUG] Resultado do Agrupamento:', result);

    return result;
  };
};
