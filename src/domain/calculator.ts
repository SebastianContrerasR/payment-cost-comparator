import type {
  CalculationBreakdown,
  CalculationResult,
  ComparisonResult,
  ExchangeRateInput,
  OkCalculationResult,
  OtherFeeLine,
  PaymentMethod,
  PurchaseInput,
} from "./types";

function validateAmount(purchase: PurchaseInput): string | null {
  if (purchase.amount === null || !Number.isFinite(purchase.amount)) {
    return `Introduce un monto de compra en ${purchase.currency}.`;
  }
  if (purchase.amount <= 0) {
    return `El monto en ${purchase.currency} debe ser mayor que cero.`;
  }
  return null;
}

function validateCurrency(
  method: PaymentMethod,
  purchase: PurchaseInput,
): string | null {
  if (!method.supportedCurrencies.includes(purchase.currency)) {
    return `Este método solo está disponible para compras en ${method.supportedCurrencies.join(" o ")}.`;
  }
  return null;
}

function validateExchangeRate(
  method: PaymentMethod,
  exchangeRates: ExchangeRateInput,
): string | null {
  const rate = exchangeRates[method.exchangeRateKey];
  if (rate === undefined || rate === null || !Number.isFinite(rate)) {
    return `No hay tipo de cambio configurado para la red "${method.network}" (clave "${method.exchangeRateKey}").`;
  }
  if (rate <= 0) {
    return `El tipo de cambio de "${method.network}" debe ser mayor que cero.`;
  }
  return null;
}

function resolveCashback(
  cashback: PaymentMethod["cashback"],
  amountUSD: number,
): { rate: number; cap: number | null; tierLabel: string | null } {
  const tiers = cashback.tiers;
  if (tiers && tiers.length > 0 && Number.isFinite(amountUSD) && amountUSD >= 0) {
    const sorted = [...tiers].sort(
      (first, second) => first.minAmountUSD - second.minAmountUSD,
    );
    let selected = sorted[0];
    for (const tier of sorted) {
      if (amountUSD >= tier.minAmountUSD) {
        selected = tier;
      }
    }
    if (selected) {
      return {
        rate: selected.rate,
        cap: selected.cap,
        tierLabel: selected.label,
      };
    }
  }
  return { rate: cashback.rate, cap: cashback.cap, tierLabel: null };
}

export function applyOtherFees(
  startUSD: number,
  rules: PaymentMethod["fees"]["otherFees"],
): OtherFeeLine[] {
  let currentUSD = startUSD;
  return rules.map((rule) => {
    const costUSD =
      rule.type === "percentage" ? currentUSD * rule.value : rule.value;
    const afterUSD =
      rule.type === "percentage"
        ? currentUSD * (1 + rule.value)
        : currentUSD + rule.value;
    currentUSD = afterUSD;
    return { rule, costUSD, afterUSD };
  });
}

export function calculateMethod(
  method: PaymentMethod,
  purchase: PurchaseInput,
  exchangeRates: ExchangeRateInput,
): CalculationResult {
  const currencyError = validateCurrency(method, purchase);
  if (currencyError !== null) {
    return { status: "error", method, reason: currencyError };
  }

  const amountError = validateAmount(purchase);
  if (purchase.amount === null || amountError !== null) {
    return { status: "error", method, reason: amountError ?? "Monto no válido." };
  }

  let exchangeRate: number | null = null;
  let baseAmountUSD = purchase.amount;
  let fxFeeRate = 0;

  if (purchase.currency === "JPY") {
    const rateError = validateExchangeRate(method, exchangeRates);
    if (rateError !== null) {
      return { status: "error", method, reason: rateError };
    }

    const rate = exchangeRates[method.exchangeRateKey];
    if (typeof rate !== "number") {
      return { status: "error", method, reason: "Tipo de cambio no válido." };
    }

    exchangeRate = rate;
    baseAmountUSD = purchase.amount / rate;
    fxFeeRate = method.fees.fxFee;
  }

  const afterFxUSD = baseAmountUSD * (1 + fxFeeRate);
  const fxFeeCostUSD = afterFxUSD - baseAmountUSD;

  const afterCryptoUSD = afterFxUSD * (1 + method.fees.cryptoFee);
  const cryptoFeeCostUSD = afterCryptoUSD - afterFxUSD;

  const otherFeeLines = applyOtherFees(afterCryptoUSD, method.fees.otherFees);
  const otherFeesCostUSD = otherFeeLines.reduce(
    (sum, line) => sum + line.costUSD,
    0,
  );
  const totalBeforeCashbackUSD =
    otherFeeLines.length > 0
      ? otherFeeLines[otherFeeLines.length - 1].afterUSD
      : afterCryptoUSD;

  const cashback = resolveCashback(method.cashback, baseAmountUSD);
  const potentialCashbackUSD = totalBeforeCashbackUSD * cashback.rate;

  const cashbackCapUSD = cashback.cap;
  const effectiveCashbackUSD =
    cashbackCapUSD === null
      ? potentialCashbackUSD
      : Math.min(potentialCashbackUSD, cashbackCapUSD);

  const totalUSD = totalBeforeCashbackUSD - effectiveCashbackUSD;

  const breakdown: CalculationBreakdown = {
    purchaseCurrency: purchase.currency,
    amountOriginal: purchase.amount,
    exchangeRate,
    baseAmountUSD,
    afterFxUSD,
    fxFeeCostUSD,
    afterCryptoUSD,
    cryptoFeeCostUSD,
    otherFeeLines,
    otherFeesCostUSD,
    totalBeforeCashbackUSD,
    cashbackRate: cashback.rate,
    cashbackTierLabel: cashback.tierLabel,
    potentialCashbackUSD,
    cashbackCapUSD,
    effectiveCashbackUSD,
    totalUSD,
  };

  return { status: "ok", method, breakdown };
}

export const isOkResult = (
  result: CalculationResult,
): result is OkCalculationResult => result.status === "ok";

export function compareMethods(
  methods: readonly PaymentMethod[],
  purchase: PurchaseInput,
  exchangeRates: ExchangeRateInput,
): ComparisonResult {
  const results = methods
    .filter(
      (method) =>
        method.enabled && method.supportedCurrencies.includes(purchase.currency),
    )
    .map((method) => calculateMethod(method, purchase, exchangeRates));

  const okResults = results.filter(isOkResult);
  const cheapest =
    okResults.length > 0
      ? okResults.reduce((best, current) =>
          current.breakdown.totalUSD < best.breakdown.totalUSD ? current : best,
        )
      : undefined;

  return { results, cheapestId: cheapest ? cheapest.method.id : null };
}
