/**
 * Motor de cálculo del comparador.
 *
 * Es un motor genérico: no conoce casos concretos de tarjetas, sólo recibe una
 * configuración (`PaymentMethod`) y las entradas del usuario, y aplica el flujo
 * del plan:
 *
 *  1. Obtener el monto original en JPY.
 *  2. Identificar el tipo de cambio correspondiente al método (JPY por USD).
 *  3. Convertir el monto de JPY a USD.
 *  4. Aplicar las comisiones configuradas, en orden:
 *       FX fee → crypto fee → otras comisiones (reglas % o fijas).
 *  5. Calcular el cashback potencial (por defecto sobre el monto con comisiones).
 *  6. Aplicar el límite disponible de cashback.
 *  7. Obtener el costo final: monto con comisiones − cashback efectivo.
 *
 * Los cálculos internos trabajan con la precisión de `Number` sin redondeos
 * intermedios; el redondeo ocurre sólo al mostrar resultados (`utils/currency`).
 */

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

/** Aplica las reglas de "otras comisiones" en orden sobre el monto acumulado. */
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

/**
 * Calcula el costo efectivo de un método de pago para un monto en JPY.
 *
 * Nunca lanza: los problemas de entrada (monto inválido, tipo de cambio
 * ausente o no positivo) se devuelven como resultado `error` con motivo.
 */
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

  // Paso 1–3. Conversión de moneda: montoBaseUSD = montoJPY / tipoCambio.
  const baseAmountUSD = amountJPY / exchangeRate;

  // Paso 4a. FX fee: montoConFX = montoBase * (1 + fxFee).
  const afterFxUSD = baseAmountUSD * (1 + method.fees.fxFee);
  const fxFeeCostUSD = afterFxUSD - baseAmountUSD;

  // Paso 4b. Crypto fee: montoConCrypto = montoConFX * (1 + cryptoFee).
  const afterCryptoUSD = afterFxUSD * (1 + method.fees.cryptoFee);
  const cryptoFeeCostUSD = afterCryptoUSD - afterFxUSD;

  // Paso 4c. Otras comisiones, según el tipo configurado de cada regla:
  //   percentage: montoAnterior * (1 + otherFee)
  //   fixed:      montoAnterior + fixedFeeUSD
  const otherFeeLines = applyOtherFees(afterCryptoUSD, method.fees.otherFees);
  const otherFeesCostUSD = otherFeeLines.reduce(
    (sum, line) => sum + line.costUSD,
    0,
  );
  const totalBeforeCashbackUSD =
    otherFeeLines.length > 0
      ? otherFeeLines[otherFeeLines.length - 1].afterUSD
      : afterCryptoUSD;

  // Paso 5. Cashback potencial (base configurable; MVP: monto después de comisiones).
  const potentialCashbackUSD = totalBeforeCashbackUSD * method.cashback.rate;

  // Paso 6. Cashback efectivo: potencial con tope al límite disponible.
  const cashbackCapUSD = method.cashback.cap;
  const effectiveCashbackUSD =
    cashbackCapUSD === null
      ? potentialCashbackUSD
      : Math.min(potentialCashbackUSD, cashbackCapUSD);

  // Paso 7. Costo final: monto con comisiones − cashback efectivo.
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

/**
 * Compara todos los métodos habilitados y devuelve un resultado por método
 * junto con el id del método más barato (costo final en USD).
 *
 * Los métodos deshabilitados se excluyen; los resultados con error no pueden
 * ser el más barato, pero se conservan para mostrar el motivo.
 */
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
