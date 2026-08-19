import { fakerPT_BR as faker } from "@faker-js/faker";
import type {
  Category,
  CostCenter,
  CreditCard,
  Tag,
  Wallet,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import { prisma } from "../src/shared/lib/prisma.js";

const round2 = (value: number) => Math.round(value * 100) / 100;

const randomItem = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

type MonthRef = { year: number; month: number }; // month é 0-indexed (Date/UTC)

const monthKey = (ref: MonthRef) => `${ref.year}-${ref.month}`;

const buildMonthsRange = (): MonthRef[] => {
  const now = new Date();
  const months: MonthRef[] = [];
  for (let offset = 4; offset >= 0; offset--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }
  return months;
};

const randomDateInMonth = (ref: MonthRef) => {
  const now = new Date();
  const isCurrentMonth =
    ref.year === now.getUTCFullYear() && ref.month === now.getUTCMonth();
  const lastDay = isCurrentMonth
    ? now.getUTCDate()
    : new Date(Date.UTC(ref.year, ref.month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(ref.year, ref.month, randomInt(1, lastDay)));
};

const buildInvoicePeriod = (
  ref: MonthRef,
  closingDay: number,
  dueDay: number,
) => {
  const periodEndDate = new Date(Date.UTC(ref.year, ref.month, closingDay));
  const periodStartDate = new Date(
    Date.UTC(ref.year, ref.month - 1, closingDay + 1),
  );
  const dueDate =
    dueDay > closingDay
      ? new Date(Date.UTC(ref.year, ref.month, dueDay))
      : new Date(Date.UTC(ref.year, ref.month + 1, dueDay));

  return { periodStartDate, periodEndDate, dueDate };
};

const CATEGORY_TREE = [
  {
    name: "Moradia",
    color: "#F97316",
    icon: "home",
    children: ["Aluguel", "Condomínio", "Energia Elétrica", "Água"],
  },
  {
    name: "Alimentação",
    color: "#22C55E",
    icon: "utensils",
    children: ["Supermercado", "Restaurante", "Delivery"],
  },
  {
    name: "Transporte",
    color: "#3B82F6",
    icon: "car",
    children: ["Combustível", "Uber/99", "Transporte Público"],
  },
  {
    name: "Lazer",
    color: "#A855F7",
    icon: "smile",
    children: ["Cinema", "Streaming", "Viagem"],
  },
  {
    name: "Saúde",
    color: "#EF4444",
    icon: "heart",
    children: ["Farmácia", "Plano de Saúde", "Academia"],
  },
  {
    name: "Compras",
    color: "#EC4899",
    icon: "shopping-bag",
    children: ["Eletrônicos", "Vestuário"],
  },
  {
    name: "Renda",
    color: "#10B981",
    icon: "dollar-sign",
    children: ["Salário", "Freelance", "Rendimentos"],
  },
  {
    name: "Transferências",
    color: "#64748B",
    icon: "repeat",
    children: [] as string[],
  },
];

// Contas fixas mensais (uma ocorrência por mês, com faixa de valor realista)
const FIXED_MONTHLY_BILLS: {
  category: string;
  description: string;
  min: number;
  max: number;
}[] = [
  {
    category: "Aluguel",
    description: "Aluguel do apartamento",
    min: 1400,
    max: 2200,
  },
  {
    category: "Condomínio",
    description: "Taxa de condomínio",
    min: 350,
    max: 650,
  },
  {
    category: "Energia Elétrica",
    description: "Conta de luz - Enel",
    min: 150,
    max: 380,
  },
  {
    category: "Água",
    description: "Conta de água - Sabesp",
    min: 80,
    max: 180,
  },
  {
    category: "Plano de Saúde",
    description: "Mensalidade Unimed",
    min: 450,
    max: 750,
  },
];

const WALLET_EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  Supermercado: [
    "Compras no Carrefour",
    "Compras no Pão de Açúcar",
    "Compras no Extra",
  ],
  Restaurante: ["Almoço no restaurante", "Jantar em família"],
  Farmácia: ["Compra na Drogasil", "Compra na Drogaria São Paulo"],
  "Transporte Público": ["Recarga Bilhete Único"],
};

const CREDIT_CARD_EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  Delivery: ["iFood - Pizza", "iFood - Japonês", "Rappi - Lanche"],
  Combustível: ["Abastecimento Posto Shell", "Abastecimento Posto Ipiranga"],
  "Uber/99": ["Corrida de Uber", "Corrida 99"],
  Cinema: ["Ingresso Cinemark"],
  Viagem: ["Passagem aérea", "Hospedagem Airbnb"],
  Vestuário: ["Compras Renner", "Compras Zara"],
};

const INCOME_DESCRIPTIONS: Record<string, string[]> = {
  Salário: ["Salário mensal"],
  Freelance: [
    "Freela de desenvolvimento",
    "Consultoria pontual",
    "Projeto freelancer",
  ],
  Rendimentos: ["Rendimento poupança", "Dividendos recebidos"],
};

// ==========================================
// LIMPEZA TOTAL (ordem respeita FKs)
// ==========================================

const cleanDatabase = async () => {
  await prisma.attachment.deleteMany();
  await prisma.transactionTag.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investmentLog.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.netWorthSnapshot.deleteMany();
  await prisma.creditCardInvoice.deleteMany();
  await prisma.installmentPlan.deleteMany();
  await prisma.openFinanceConnection.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned all tables");
};

// ==========================================
// MAIN
// ==========================================

const main = async () => {
  await cleanDatabase();

  // ---------- Usuário ----------
  const user = await prisma.user.create({
    data: {
      name: "Usuário Dev Nummus",
      email: "admin@admin.com",
      emailVerified: true,
    },
  });
  await prisma.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword("adminadmin"),
    },
  });
  console.log(`✅ Created user ${user.email}`);

  // ---------- Categorias ----------
  const categoryByName = new Map<string, Category>();

  for (const node of CATEGORY_TREE) {
    const parent = await prisma.category.create({
      data: {
        name: node.name,
        color: node.color,
        icon: node.icon,
        userId: user.id,
      },
    });
    categoryByName.set(node.name, parent);

    for (const childName of node.children) {
      const child = await prisma.category.create({
        data: {
          name: childName,
          color: node.color,
          icon: node.icon,
          parentId: parent.id,
          userId: user.id,
        },
      });
      categoryByName.set(childName, child);
    }
  }
  console.log(`✅ Created ${categoryByName.size} categories`);

  // ---------- Tags ----------
  const tagNames = [
    "Viagem SP",
    "Reforma",
    "Trabalho",
    "Presente",
    "Emergência",
  ];
  const tags: Tag[] = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.create({ data: { name, userId: user.id } }),
    ),
  );
  console.log(`✅ Created ${tags.length} tags`);

  // ---------- Centros de Custo ----------
  const costCenterNames = ["Pessoal", "Empresa"];
  const costCenters: CostCenter[] = await Promise.all(
    costCenterNames.map((name) =>
      prisma.costCenter.create({ data: { name, userId: user.id } }),
    ),
  );
  console.log(`✅ Created ${costCenters.length} cost centers`);

  // ---------- Carteiras ----------
  const walletSeeds: { name: string; initialBalance: number }[] = [
    { name: "Conta Corrente Nubank", initialBalance: 5200 },
    { name: "Poupança Itaú", initialBalance: 18500 },
    { name: "Carteira Física", initialBalance: 1500 },
  ];
  const wallets: Wallet[] = await Promise.all(
    walletSeeds.map((walletSeed) =>
      prisma.wallet.create({
        data: {
          name: walletSeed.name,
          currency: "BRL",
          initialBalance: walletSeed.initialBalance,
          balance: walletSeed.initialBalance,
          userId: user.id,
        },
      }),
    ),
  );
  const walletBalanceDelta = new Map<string, number>(
    wallets.map((wallet) => [wallet.id, 0]),
  );
  const addWalletDelta = (walletId: string, delta: number) => {
    walletBalanceDelta.set(
      walletId,
      (walletBalanceDelta.get(walletId) ?? 0) + delta,
    );
  };
  console.log(`✅ Created ${wallets.length} wallets`);

  // ---------- Cartões de Crédito ----------
  const creditCards: CreditCard[] = await Promise.all([
    prisma.creditCard.create({
      data: {
        name: "Nubank Ultravioleta",
        limit: 50000,
        closingDay: 5,
        dueDay: 12,
        userId: user.id,
      },
    }),
    prisma.creditCard.create({
      data: {
        name: "XP Visa Infinite",
        limit: 30000,
        closingDay: 20,
        dueDay: 27,
        userId: user.id,
      },
    }),
  ]);
  console.log(`✅ Created ${creditCards.length} credit cards`);

  // ---------- Faturas (últimos 4 meses + mês atual) ----------
  const months = buildMonthsRange();
  const now = new Date();

  type InvoiceEntry = { id: string; total: number };
  const invoicesByCardAndMonth = new Map<string, InvoiceEntry>();

  for (const card of creditCards) {
    for (const ref of months) {
      const { periodStartDate, periodEndDate, dueDate } = buildInvoicePeriod(
        ref,
        card.closingDay,
        card.dueDay,
      );
      const invoice = await prisma.creditCardInvoice.create({
        data: {
          periodStartDate,
          periodEndDate,
          dueDate,
          totalAmount: 0,
          paid: periodEndDate < now,
          creditCardId: card.id,
        },
      });
      invoicesByCardAndMonth.set(`${card.id}:${monthKey(ref)}`, {
        id: invoice.id,
        total: 0,
      });
    }
  }
  console.log(`✅ Created ${invoicesByCardAndMonth.size} invoices`);

  const addInvoiceAmount = (cardId: string, ref: MonthRef, amount: number) => {
    const key = `${cardId}:${monthKey(ref)}`;
    const entry = invoicesByCardAndMonth.get(key);
    if (!entry) throw new Error(`Invoice not found for ${key}`);
    entry.total = round2(entry.total + amount);
    return entry.id;
  };

  let transactionCount = 0;

  const attachRandomTagsAndCostCenter = async (transactionId: string) => {
    if (Math.random() < 0.3) {
      await prisma.transactionTag.create({
        data: { transactionId, tagId: randomItem(tags).id },
      });
    }
  };

  const pickCostCenterId = () => {
    const roll = Math.random();
    if (roll < 0.5)
      return costCenters.find((costCenter) => costCenter.name === "Pessoal")!
        .id;
    if (roll < 0.8)
      return costCenters.find((costCenter) => costCenter.name === "Empresa")!
        .id;
    return null;
  };

  // ---------- Parcelamentos (Installment Plans) ----------
  const nubank = creditCards.find(
    (creditCard) => creditCard.name === "Nubank Ultravioleta",
  )!;
  const xpVisa = creditCards.find(
    (creditCard) => creditCard.name === "XP Visa Infinite",
  )!;
  const eletronicos = categoryByName.get("Eletrônicos")!;

  const installmentSeeds = [
    {
      description: "MacBook Pro 14",
      totalAmount: 15000,
      totalInstallments: 12,
      card: nubank,
      startInstallment: 5,
    },
    {
      description: "Geladeira Brastemp Frost Free",
      totalAmount: 6000,
      totalInstallments: 10,
      card: xpVisa,
      startInstallment: 3,
    },
    {
      description: "Smart TV 55 Polegadas",
      totalAmount: 4200,
      totalInstallments: 6,
      card: nubank,
      startInstallment: 1,
    },
  ];

  for (const seed of installmentSeeds) {
    const plan = await prisma.installmentPlan.create({
      data: {
        description: seed.description,
        totalAmount: seed.totalAmount,
        totalInstallments: seed.totalInstallments,
        userId: user.id,
      },
    });

    const installmentAmount = round2(seed.totalAmount / seed.totalInstallments);

    for (let i = 0; i < months.length; i++) {
      const ref = months[i]!;
      const installmentNumber = seed.startInstallment + i;
      if (installmentNumber > seed.totalInstallments) break;

      const invoiceId = addInvoiceAmount(seed.card.id, ref, installmentAmount);

      const transaction = await prisma.transaction.create({
        data: {
          amount: installmentAmount,
          type: "EXPENSE",
          paymentMethod: "CREDIT",
          date: randomDateInMonth(ref),
          description: `${seed.description} (${installmentNumber}/${seed.totalInstallments})`,
          creditCardId: seed.card.id,
          invoiceId,
          categoryId: eletronicos.id,
          installmentPlanId: plan.id,
          installmentNumber,
          userId: user.id,
        },
      });
      transactionCount++;
      await attachRandomTagsAndCostCenter(transaction.id);
    }
  }
  console.log(`✅ Created ${installmentSeeds.length} installment plans`);

  // ---------- Transações mensais (renda + despesas) ----------
  const walletExpenseCategoryNames = Object.keys(WALLET_EXPENSE_DESCRIPTIONS);
  const creditCardExpenseCategoryNames = Object.keys(
    CREDIT_CARD_EXPENSE_DESCRIPTIONS,
  );

  const checkingWallet = wallets.find(
    (wallet) => wallet.name === "Conta Corrente Nubank",
  )!;
  const savingsWallet = wallets.find(
    (wallet) => wallet.name === "Poupança Itaú",
  )!;
  const cashWallet = wallets.find(
    (wallet) => wallet.name === "Carteira Física",
  )!;

  const pickWalletForDayToDayExpense = () => {
    const roll = Math.random();
    if (roll < 0.55) return checkingWallet;
    if (roll < 0.85) return savingsWallet;
    return cashWallet;
  };

  for (const ref of months) {
    // Salário (renda fixa mensal)
    const salaryTx = await prisma.transaction.create({
      data: {
        amount: round2(
          faker.number.float({ min: 6000, max: 8500, fractionDigits: 2 }),
        ),
        type: "INCOME",
        paymentMethod: "TRANSFER",
        date: new Date(Date.UTC(ref.year, ref.month, 5)),
        description: randomItem(INCOME_DESCRIPTIONS["Salário"]!),
        walletId: wallets[0]!.id,
        categoryId: categoryByName.get("Salário")!.id,
        userId: user.id,
      },
    });
    addWalletDelta(wallets[0]!.id, Number(salaryTx.amount));
    transactionCount++;
    await attachRandomTagsAndCostCenter(salaryTx.id);

    // Freelance (renda variável, 1 a 2 por mês)
    const freelanceCount = randomInt(1, 2);
    for (let i = 0; i < freelanceCount; i++) {
      const wallet = randomItem([checkingWallet, savingsWallet]);
      const amount = round2(
        faker.number.float({ min: 500, max: 3000, fractionDigits: 2 }),
      );
      const tx = await prisma.transaction.create({
        data: {
          amount,
          type: "INCOME",
          paymentMethod: "PIX",
          date: randomDateInMonth(ref),
          description: randomItem(INCOME_DESCRIPTIONS["Freelance"]!),
          walletId: wallet.id,
          categoryId: categoryByName.get("Freelance")!.id,
          userId: user.id,
          costCenterId: pickCostCenterId(),
        },
      });
      addWalletDelta(wallet.id, amount);
      transactionCount++;
      await attachRandomTagsAndCostCenter(tx.id);
    }

    // Contas fixas mensais (uma vez por mês, sempre pela conta corrente)
    for (const bill of FIXED_MONTHLY_BILLS) {
      const amount = round2(
        faker.number.float({ min: bill.min, max: bill.max, fractionDigits: 2 }),
      );
      const tx = await prisma.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          paymentMethod: randomItem(["PIX", "TRANSFER"] as const),
          date: randomDateInMonth(ref),
          description: bill.description,
          walletId: checkingWallet.id,
          categoryId: categoryByName.get(bill.category)!.id,
          userId: user.id,
          costCenterId: pickCostCenterId(),
        },
      });
      addWalletDelta(checkingWallet.id, -amount);
      transactionCount++;
      await attachRandomTagsAndCostCenter(tx.id);
    }

    // Despesas do dia a dia via carteira (dinheiro/Pix/débito/transferência)
    for (let i = 0; i < 10; i++) {
      const categoryName = randomItem(walletExpenseCategoryNames);
      const wallet = pickWalletForDayToDayExpense();
      const paymentMethod =
        wallet.id === cashWallet.id
          ? "CASH"
          : randomItem(["CASH", "PIX", "DEBIT", "TRANSFER"] as const);
      const amount =
        wallet.id === cashWallet.id
          ? round2(faker.number.float({ min: 10, max: 80, fractionDigits: 2 }))
          : round2(
              faker.number.float({ min: 20, max: 350, fractionDigits: 2 }),
            );

      const tx = await prisma.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          paymentMethod,
          date: randomDateInMonth(ref),
          description: randomItem(WALLET_EXPENSE_DESCRIPTIONS[categoryName]!),
          walletId: wallet.id,
          categoryId: categoryByName.get(categoryName)!.id,
          userId: user.id,
          costCenterId: pickCostCenterId(),
        },
      });
      addWalletDelta(wallet.id, -amount);
      transactionCount++;
      await attachRandomTagsAndCostCenter(tx.id);
    }

    // Despesas via cartão de crédito
    for (let i = 0; i < 14; i++) {
      const categoryName = randomItem(creditCardExpenseCategoryNames);
      const card = randomItem(creditCards);
      const amount = round2(
        faker.number.float({ min: 15, max: 700, fractionDigits: 2 }),
      );
      const invoiceId = addInvoiceAmount(card.id, ref, amount);

      const tx = await prisma.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          paymentMethod: "CREDIT",
          date: randomDateInMonth(ref),
          description: randomItem(
            CREDIT_CARD_EXPENSE_DESCRIPTIONS[categoryName]!,
          ),
          creditCardId: card.id,
          invoiceId,
          categoryId: categoryByName.get(categoryName)!.id,
          userId: user.id,
          costCenterId: pickCostCenterId(),
        },
      });
      transactionCount++;
      await attachRandomTagsAndCostCenter(tx.id);
    }
  }
  console.log(`✅ Created transactions so far: ${transactionCount}`);

  // ---------- Transferências entre carteiras ----------
  const transferCategory = categoryByName.get("Transferências")!;
  let transfersCreated = 0;

  for (let i = 0; i < 5; i++) {
    const fromWallet = randomItem(wallets);
    const toWallet = randomItem(
      wallets.filter((wallet) => wallet.id !== fromWallet.id),
    );
    const ref = randomItem(months);
    const amount = round2(
      faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
    );
    const date = randomDateInMonth(ref);
    const description = `Transferência de ${fromWallet.name} para ${toWallet.name}`;

    const outTransaction = await prisma.transaction.create({
      data: {
        amount,
        type: "EXPENSE",
        paymentMethod: "TRANSFER",
        date,
        description,
        walletId: fromWallet.id,
        categoryId: transferCategory.id,
        userId: user.id,
      },
    });
    const inTransaction = await prisma.transaction.create({
      data: {
        amount,
        type: "INCOME",
        paymentMethod: "TRANSFER",
        date,
        description,
        walletId: toWallet.id,
        categoryId: transferCategory.id,
        userId: user.id,
      },
    });

    await prisma.transfer.create({
      data: {
        description,
        outTransactionId: outTransaction.id,
        inTransactionId: inTransaction.id,
        userId: user.id,
      },
    });

    addWalletDelta(fromWallet.id, -amount);
    addWalletDelta(toWallet.id, amount);
    transactionCount += 2;
    transfersCreated++;
  }
  console.log(`✅ Created ${transfersCreated} transfers`);
  console.log(`✅ Created ${transactionCount} transactions in total`);

  // ---------- Aplica saldos finais das carteiras ----------
  for (const wallet of wallets) {
    const delta = walletBalanceDelta.get(wallet.id) ?? 0;
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: round2(Number(wallet.initialBalance) + delta) },
    });
  }

  // ---------- Aplica totais finais das faturas ----------
  for (const entry of invoicesByCardAndMonth.values()) {
    await prisma.creditCardInvoice.update({
      where: { id: entry.id },
      data: { totalAmount: entry.total },
    });
  }
  console.log(`✅ Reconciled wallet balances and invoice totals`);

  // ---------- Investimentos ----------
  const investmentSeeds = [
    {
      name: "IVVB11",
      ticker: "IVVB11",
      type: "VARIABLE_INCOME" as const,
      institution: "XP Investimentos",
      buys: [
        { qty: 10, price: 250 },
        { qty: 5, price: 270 },
      ],
      yieldQty: 0.5,
    },
    {
      name: "Tesouro Selic 2029",
      ticker: null,
      type: "FIXED_INCOME" as const,
      institution: "Tesouro Direto",
      buys: [
        { qty: 20, price: 100 },
        { qty: 10, price: 102 },
      ],
      yieldQty: 1.2,
    },
    {
      name: "Bitcoin",
      ticker: "BTC",
      type: "CRYPTO" as const,
      institution: "Binance",
      buys: [
        { qty: 0.05, price: 300000 },
        { qty: 0.02, price: 320000 },
      ],
      yieldQty: 0,
    },
  ];

  for (const seed of investmentSeeds) {
    const investment = await prisma.investment.create({
      data: {
        name: seed.name,
        ticker: seed.ticker,
        type: seed.type,
        currency: "BRL",
        quantity: 0,
        averagePrice: 0,
        currentValue: 0,
        institution: seed.institution,
        userId: user.id,
      },
    });

    let quantity = 0;
    let averagePrice = 0;
    const refs = months.slice(
      0,
      seed.buys.length + (seed.yieldQty > 0 ? 1 : 0),
    );

    for (let i = 0; i < seed.buys.length; i++) {
      const buy = seed.buys[i]!;
      const ref = refs[i] ?? months[0]!;
      const totalAmount = round2(buy.qty * buy.price);

      await prisma.investmentLog.create({
        data: {
          type: "BUY",
          quantity: buy.qty,
          unitPrice: buy.price,
          totalAmount,
          date: randomDateInMonth(ref),
          investmentId: investment.id,
        },
      });

      averagePrice =
        (averagePrice * quantity + buy.qty * buy.price) / (quantity + buy.qty);
      quantity += buy.qty;
    }

    if (seed.yieldQty > 0) {
      const ref = months[months.length - 1]!;
      const totalAmount = round2(seed.yieldQty * averagePrice);

      await prisma.investmentLog.create({
        data: {
          type: "YIELD",
          quantity: seed.yieldQty,
          unitPrice: averagePrice,
          totalAmount,
          date: randomDateInMonth(ref),
          investmentId: investment.id,
        },
      });

      averagePrice =
        (averagePrice * quantity + seed.yieldQty * averagePrice) /
        (quantity + seed.yieldQty);
      quantity += seed.yieldQty;
    }

    const marketFactor =
      1 + faker.number.float({ min: -0.05, max: 0.2, fractionDigits: 3 });
    const currentValue = round2(quantity * averagePrice * marketFactor);

    await prisma.investment.update({
      where: { id: investment.id },
      data: {
        quantity,
        averagePrice: round2(averagePrice),
        currentValue,
      },
    });
  }
  console.log(`✅ Created ${investmentSeeds.length} investments with logs`);

  // ---------- Metas (Goals) ----------
  const oneYearFromNow = new Date(
    Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()),
  );
  const twoYearsFromNow = new Date(
    Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()),
  );

  await prisma.goal.create({
    data: {
      name: "Reserva de Emergência",
      targetAmount: 30000,
      currentAmount: 12500,
      targetDate: oneYearFromNow,
      walletId: wallets.find((wallet) => wallet.name === "Poupança Itaú")!.id,
      userId: user.id,
    },
  });
  await prisma.goal.create({
    data: {
      name: "Trocar de Carro",
      targetAmount: 60000,
      currentAmount: 9000,
      targetDate: twoYearsFromNow,
      walletId: wallets.find(
        (wallet) => wallet.name === "Conta Corrente Nubank",
      )!.id,
      userId: user.id,
    },
  });
  console.log(`✅ Created 2 goals`);

  // ---------- Recorrências ----------
  const nextMonthDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()),
  );
  const recurringSeeds = [
    { description: "Assinatura Netflix", amount: 55.9, category: "Streaming" },
    { description: "Assinatura Spotify", amount: 21.9, category: "Streaming" },
    {
      description: "Mensalidade Smart Fit",
      amount: 149.9,
      category: "Academia",
    },
  ];
  for (const seed of recurringSeeds) {
    await prisma.recurringTransaction.create({
      data: {
        description: seed.description,
        amount: seed.amount,
        type: "EXPENSE",
        frequency: "MONTHLY",
        nextExecutionDate: nextMonthDate,
        active: true,
        walletId: wallets[0]!.id,
        categoryId: categoryByName.get(seed.category)!.id,
        userId: user.id,
      },
    });
  }
  console.log(`✅ Created ${recurringSeeds.length} recurring transactions`);

  // ---------- Net Worth Snapshots ----------
  const finalWallets = await prisma.wallet.findMany({
    where: { userId: user.id },
  });
  const finalInvestments = await prisma.investment.findMany({
    where: { userId: user.id },
  });
  const finalInvoices = await prisma.creditCardInvoice.findMany({
    where: { creditCard: { userId: user.id }, paid: false },
  });

  const finalAssets = round2(
    finalWallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0) +
      finalInvestments.reduce(
        (sum, investment) => sum + Number(investment.currentValue),
        0,
      ),
  );
  const finalLiabilities = round2(
    finalInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    ),
  );

  for (let i = 0; i < months.length; i++) {
    const ref = months[i]!;
    const monthsAgo = months.length - 1 - i;
    const decay = 1 - monthsAgo * randomInt(3, 8) * 0.01;
    const totalAssets = round2(finalAssets * decay);
    const totalLiabilities = round2(finalLiabilities * (1 - monthsAgo * 0.05));
    const netWorth = round2(totalAssets - totalLiabilities);

    await prisma.netWorthSnapshot.create({
      data: {
        date: new Date(Date.UTC(ref.year, ref.month, 28)),
        totalAssets,
        totalLiabilities: Math.max(totalLiabilities, 0),
        netWorth,
        userId: user.id,
      },
    });
  }
  console.log(`✅ Created ${months.length} net worth snapshots`);

  console.log("🌱 Seed completed successfully");
};

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
