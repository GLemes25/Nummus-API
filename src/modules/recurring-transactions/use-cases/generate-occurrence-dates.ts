import type { RecurringFrequency } from "@prisma/client";

// Aplica N passos da frequência a partir da data-base, sem herdar imprecisões de somas sucessivas
// (ex: MONTHLY a partir de 31/Jan não deve "vazar" para Março ao pular Fevereiro)
const addInterval = (baseDate: Date, frequency: RecurringFrequency, steps: number): Date => {
  const result = new Date(baseDate);

  switch (frequency) {
    case "DAILY":
      result.setDate(result.getDate() + steps);
      return result;
    case "WEEKLY":
      result.setDate(result.getDate() + steps * 7);
      return result;
    case "MONTHLY": {
      const originalDay = baseDate.getDate();
      result.setMonth(result.getMonth() + steps);
      if (result.getDate() !== originalDay) {
        result.setDate(0); // último dia do mês correto
      }
      return result;
    }
    case "YEARLY":
      result.setFullYear(result.getFullYear() + steps);
      return result;
  }
};

export const addMonthsToDate = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Gera as datas de ocorrência de uma transação recorrente dentro de uma janela (padrão: 12 meses)
export const generateOccurrenceDates = (
  startDate: Date,
  frequency: RecurringFrequency,
  horizonMonths = 12
): Date[] => {
  const horizonDate = addMonthsToDate(startDate, horizonMonths);

  const dates: Date[] = [];
  let step = 0;
  let current = new Date(startDate);

  while (current < horizonDate) {
    dates.push(current);
    step += 1;
    current = addInterval(startDate, frequency, step);
  }

  return dates;
};
