import { describe, it, expect } from "vitest";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makePayInvoiceUseCase } from "../../../src/modules/credit-cards/use-cases/pay-invoice.use-case.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("pay-invoice use case", () => {
  it("should mark all open invoices as paid and decrement wallet balance", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({ id: "inv-1", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null });

    // Act
    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    // Assert
    expect(cardRepo.invoices[0]!.paid).toBe(true);
    expect(walletRepo.items[0]!.balance).toBe(700);
  });

  it("should sum all open invoices and deduct the combined total from the wallet", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 2000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push(
      { id: "inv-1", creditCardId: card.id, totalAmount: 500, paid: false, deletedAt: null },
      { id: "inv-2", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null },
    );

    // Act
    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    // Assert — wallet decremented by 800, both invoices paid
    expect(walletRepo.items[0]!.balance).toBe(1200);
    expect(cardRepo.invoices.every((i) => i.paid)).toBe(true);
  });

  it("should ignore already-paid invoices and only deduct the open ones", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push(
      { id: "inv-1", creditCardId: card.id, totalAmount: 200, paid: true, deletedAt: null },
      { id: "inv-2", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null },
    );

    // Act
    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    // Assert — only 300 deducted (already-paid invoice is excluded)
    expect(walletRepo.items[0]!.balance).toBe(700);
  });

  it("should throw NO_OPEN_INVOICE when the card has no open invoices", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "NO_OPEN_INVOICE" });
  });

  it("should throw CREDIT_CARD_NOT_FOUND when card does not exist", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: "non-existent-id", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_NOT_FOUND" });
  });

  it("should throw CREDIT_CARD_ACCESS_DENIED when user does not own the card", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId: "card-owner" }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_ACCESS_DENIED" });
  });

  it("should throw WALLET_NOT_FOUND when wallet does not exist", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({ id: "inv-1", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null });

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, walletId: "non-existent-wallet", userId }),
    ).rejects.toMatchObject({ code: "WALLET_NOT_FOUND" });
  });

  it("should throw WALLET_ACCESS_DENIED when user does not own the wallet", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId: "wallet-owner" }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({ id: "inv-1", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null });

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "WALLET_ACCESS_DENIED" });
  });

  it("should auto-create the 'Pagamento de Fatura' system category and link it to the payment transaction", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({ id: "inv-1", creditCardId: card.id, totalAmount: 300, paid: false, deletedAt: null });

    // Act
    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    // Assert
    expect(categoryRepo.items).toHaveLength(1);
    expect(categoryRepo.items[0]!.name).toBe("Pagamento de Fatura");
    expect(categoryRepo.items[0]!.isSystem).toBe(true);
    expect(categoryRepo.items[0]!.systemId).toBe("CREDIT_CARD_PAYMENT");
    expect(cardRepo.paymentTransactions[0]!.categoryId).toBe(categoryRepo.items[0]!.id);
  });

  it("should reuse the existing system category on subsequent payments instead of creating duplicates", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 2000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({ id: "inv-1", creditCardId: card.id, totalAmount: 200, paid: false, deletedAt: null });

    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    cardRepo.invoices.push({ id: "inv-2", creditCardId: card.id, totalAmount: 150, paid: false, deletedAt: null });

    // Act
    await payInvoice({ creditCardId: card.id, walletId: wallet.id, userId });

    // Assert — only one system category exists, reused across both payments
    expect(categoryRepo.items).toHaveLength(1);
    expect(cardRepo.paymentTransactions).toHaveLength(2);
    expect(cardRepo.paymentTransactions[1]!.categoryId).toBe(categoryRepo.items[0]!.id);
  });
});
