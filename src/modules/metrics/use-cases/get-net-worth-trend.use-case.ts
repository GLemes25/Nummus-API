import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const makeGetNetWorthTrendUseCase = (repository: MetricsRepository) => {
  return async (userId: string) => {
    const now = new Date();

    // Constrói array dos últimos 6 meses do mais antigo para o atual
    const months: Array<{ year: number; month: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const oldest = months[0]!;
    const rangeStart = new Date(oldest.year, oldest.month, 1);

    const [currentBalance, transactions] = await Promise.all([
      repository.findTotalWalletBalance(userId),
      repository.findWalletTransactionsInRange(userId, rangeStart, now),
    ]);

    // Agrupa fluxo líquido por mês
    const flowsByMonth = new Map<string, { income: number; expense: number; adjustment: number }>();

    for (const tx of transactions) {
      const key = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
      if (!flowsByMonth.has(key)) {
        flowsByMonth.set(key, { income: 0, expense: 0, adjustment: 0 });
      }
      const flows = flowsByMonth.get(key)!;
      if (tx.type === "INCOME") {
        flows.income += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        flows.expense += Number(tx.amount);
      } else {
        // BALANCE_ADJUSTMENT: amount armazenado é o delta (pode ser negativo)
        flows.adjustment += Number(tx.amount);
      }
    }

    // Cálculo reverso: parte do saldo atual e reconstrói meses anteriores
    const result: Array<{ month: string; balance: number }> = new Array(6);
    let runningBalance = currentBalance;

    for (let i = 5; i >= 0; i--) {
      const entry = months[i]!;
      const { year, month } = entry;

      result[i] = {
        month: MONTH_ABBR[month]!,
        balance: Math.round(runningBalance * 100) / 100,
      };

      if (i > 0) {
        const key = `${year}-${month}`;
        const flows = flowsByMonth.get(key) ?? { income: 0, expense: 0, adjustment: 0 };
        const netFlow = flows.income - flows.expense + flows.adjustment;
        runningBalance = runningBalance - netFlow;
      }
    }

    return result;
  };
};
