import type {
  CalculationBreakdown,
  CalculationResult,
  ComparisonResult,
  ExchangeRateInput,
  OkCalculationResult,
  OtherFeeLine,
  PaymentMethod,
} from "./types";

function validateAmount(amountJPY: number | null): string | null {
  if (amountJPY === null || !Number.isFinite(amountJPY)) {
    return "Introduce un monto de compra en JPY.";
  }
  if (amountJPY <= 0) {
    return "El monto en JPY debe ser mayor que cero.";
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
  amountJPY: number | null,
  exchangeRates: ExchangeRateInput,
): CalculationResult {
  const amountError = validateAmount(amountJPY);
  if (amountJPY === null || amountError !== null) {
    return { status: "error", method, reason: amountError ?? "Monto no válido." };
  }

  const rateError = validateExchangeRate(method, exchangeRates);
  if (rateError !== null) {
    return { status: "error", method, reason: rateError };
  }

  const exchangeRate = exchangeRates[method.exchangeRateKey];
  if (typeof exchangeRate !== "number") {
    return { status: "error", method, reason: "Tipo de cambio no válido." };
  }

  const baseAmountUSD = amountJPY / exchangeRate;

  const afterFxUSD = baseAmountUSD * (1 + method.fees.fxFee);
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

  const potentialCashbackUSD = totalBeforeCashbackUSD * method.cashback.rate;

  const cashbackCapUSD = method.cashback.cap;
  const effectiveCashbackUSD =
    cashbackCapUSD === null
      ? potentialCashbackUSD
      : Math.min(potentialCashbackUSD, cashbackCapUSD);

  const totalUSD = totalBeforeCashbackUSD - effectiveCashbackUSD;

  const breakdown: CalculationBreakdown = {
    amountJPY,
    exchangeRate,
    baseAmountUSD,
    afterFxUSD,
    fxFeeCostUSD,
    afterCryptoUSD,
    cryptoFeeCostUSD,
    otherFeeLines,
    otherFeesCostUSD,
    totalBeforeCashbackUSD,
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
  amountJPY: number | null,
  exchangeRates: ExchangeRateInput,
): ComparisonResult {
  const results = methods
    .filter((method) => method.enabled)
    .map((method) => calculateMethod(method, amountJPY, exchangeRates));

  const okResults = results.filter(isOkResult);
  const cheapest =
    okResults.length > 0
      ? okResults.reduce((best, current) =>
          current.breakdown.totalUSD < best.breakdown.totalUSD ? current : best,
        )
      : undefined;

  return { results, cheapestId: cheapest ? cheapest.method.id : null };
}
