import { describe, expect, it } from "vitest";
import paymentMethods from "../src/data/paymentMethods";
import { calculateMethod, compareMethods } from "../src/domain/calculator";
import type {
  ExchangeRateInput,
  OkCalculationResult,
  PaymentMethod,
} from "../src/domain/types";
import { roundTo } from "../src/utils/currency";

/**
 * Entradas del Excel de referencia (plan 7.1):
 * docs/example.md
 */
const EXCEL_AMOUNT_JPY = 50_000;

const EXCEL_EXCHANGE_RATES: ExchangeRateInput = {
  visa: 157.710157,
  mastercard: 157.51008064,
  paypay: 157.71524839,
};

/** Totales esperados según la tabla principal del Excel. */
const EXCEL_EXPECTED_TOTALS: Record<string, number> = {
  "binance-paypay": 317.0271,
  "okx-card": 312.3543,
  "binance-card": 317.6303,
  "bybit-card": 324.9408,
  io: 323.2829,
  "bitget-card": 317.0895,
  "mexc-card": 307.3994,
};

function methodById(id: string): PaymentMethod {
  const method = paymentMethods.find((candidate) => candidate.id === id);
  if (!method) {
    throw new Error(`Método no encontrado en la configuración: ${id}`);
  }
  return method;
}

function calculateOk(
  method: PaymentMethod,
  amountJPY: number | null,
  exchangeRates: ExchangeRateInput,
): OkCalculationResult {
  const result = calculateMethod(method, amountJPY, exchangeRates);
  if (result.status !== "ok") {
    throw new Error(
      `El cálculo de ${method.id} devolvió error: ${result.reason}`,
    );
  }
  return result;
}

describe("Regresión contra el Excel de referencia", () => {
  it("los siete métodos están registrados en la configuración", () => {
    expect(paymentMethods.map((method) => method.id)).toEqual([
      "binance-paypay",
      "okx-card",
      "binance-card",
      "bybit-card",
      "io",
      "bitget-card",
      "mexc-card",
    ]);
  });

  it("compara todos los métodos habilitados y encuentra el más barato", () => {
    const comparison = compareMethods(
      paymentMethods,
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    expect(comparison.results).toHaveLength(7);
    expect(comparison.cheapestId).toBe("mexc-card");
  });

  for (const [id, expectedTotal] of Object.entries(EXCEL_EXPECTED_TOTALS)) {
    it(`reproduce el total del Excel para ${id}`, () => {
      const result = calculateOk(
        methodById(id),
        EXCEL_AMOUNT_JPY,
        EXCEL_EXCHANGE_RATES,
      );
      expect(roundTo(result.breakdown.totalUSD, 4)).toBe(expectedTotal);
    });
  }
});

describe("Pasos intermedios del Excel", () => {
  it("Binance PayPay: solo conversión con el tipo de cambio de PayPay", () => {
    const result = calculateOk(
      methodById("binance-paypay"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.exchangeRate).toBe(157.71524839);
    expect(breakdown.baseAmountUSD).toBeCloseTo(317.0270504, 4);
    expect(breakdown.afterFxUSD).toBeCloseTo(317.0270504, 4);
    expect(breakdown.totalBeforeCashbackUSD).toBeCloseTo(317.0270504, 4);
    expect(breakdown.potentialCashbackUSD).toBe(0);
    expect(breakdown.effectiveCashbackUSD).toBe(0);
    expect(breakdown.totalUSD).toBeCloseTo(317.0270504, 4);
  });

  it("OKX Card: FX 0%, crypto 0.1% y cashback limitado a 5 USDG", () => {
    const result = calculateOk(
      methodById("okx-card"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.baseAmountUSD).toBeCloseTo(317.0372850, 4);
    expect(breakdown.afterFxUSD).toBeCloseTo(317.0372850, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(317.3543223, 4);
    expect(breakdown.totalBeforeCashbackUSD).toBeCloseTo(317.3543223, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(6.3471, 3);
    // El potencial supera el límite: se aplica el límite completo.
    expect(breakdown.effectiveCashbackUSD).toBe(5);
    expect(breakdown.totalUSD).toBeCloseTo(312.3543223, 4);
  });

  it("Binance Card: FX 2% y conversión 0.1% (escenario USDC)", () => {
    const result = calculateOk(
      methodById("binance-card"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.baseAmountUSD).toBeCloseTo(317.44, 4);
    expect(breakdown.afterFxUSD).toBeCloseTo(323.7888, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(324.1125888, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(6.4823, 3);
    // El potencial queda por debajo del límite: se aplica completo.
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(317.6303370, 4);
  });

  it("Bybit Card: FX 2% y 1.9% combinado (0.9% conversión + 1% FX padding)", () => {
    const result = calculateOk(
      methodById("bybit-card"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.afterFxUSD).toBeCloseTo(323.7888, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(329.9407872, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(6.5988, 3);
    // El potencial supera el límite de 5 USDT.
    expect(breakdown.effectiveCashbackUSD).toBe(5);
    expect(breakdown.totalUSD).toBeCloseTo(324.9407872, 4);
  });

  it("IO: FX 3% y cashback 1% con límite ilimitado", () => {
    const result = calculateOk(
      methodById("io"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.afterFxUSD).toBeCloseTo(326.5484036, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(326.5484036, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(3.2655, 3);
    // Sin límite: el efectivo coincide con el potencial.
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(323.2829195, 4);
  });

  it("Bitget: FX 1%, crypto 0.9% y cashback 3% limitado a 6 USD", () => {
    const result = calculateOk(
      methodById("bitget-card"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.afterFxUSD).toBeCloseTo(320.2076579, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(323.0895268, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(9.6927, 3);
    expect(breakdown.effectiveCashbackUSD).toBe(6);
    expect(breakdown.totalUSD).toBeCloseTo(317.0895268, 4);
  });

  it("MEXC Card: FX 0%, crypto 0% y Transaction Fee del 1% como otra comisión", () => {
    const result = calculateOk(
      methodById("mexc-card"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.afterFxUSD).toBeCloseTo(317.0372850, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(317.0372850, 4);
    expect(breakdown.otherFeeLines).toHaveLength(1);
    expect(breakdown.otherFeeLines[0].rule.id).toBe("transaction-fee");
    expect(breakdown.otherFeesCostUSD).toBeCloseTo(3.1703729, 3);
    expect(breakdown.totalBeforeCashbackUSD).toBeCloseTo(320.2076579, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(12.8083, 3);
    // El potencial queda por debajo del límite de 100 USDT.
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(307.3993516, 4);
  });
});

describe("Validaciones de entrada", () => {
  it("monto igual a cero devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      0,
      EXCEL_EXCHANGE_RATES,
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("mayor que cero"),
    });
  });

  it("monto negativo devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      -100,
      EXCEL_EXCHANGE_RATES,
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("mayor que cero"),
    });
  });

  it("monto sin definir devuelve error", () => {
    const result = calculateMethod(methodById("io"), null, EXCEL_EXCHANGE_RATES);
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("monto"),
    });
  });

  it("tipo de cambio igual a cero devuelve error", () => {
    const result = calculateMethod(methodById("io"), 50_000, { visa: 0 });
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("tipo de cambio"),
    });
  });

  it("tipo de cambio faltante devuelve error", () => {
    const result = calculateMethod(methodById("io"), 50_000, {});
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("tipo de cambio"),
    });
  });

  it("un tipo de cambio inválido solo afecta a los métodos de esa red", () => {
    const comparison = compareMethods(paymentMethods, EXCEL_AMOUNT_JPY, {
      // Visa inválida: afecta a OKX, IO, Bitget y MEXC, pero no a la tabla completa.
      visa: 0,
      mastercard: 157.51008064,
      paypay: 157.71524839,
    });
    const errorIds = comparison.results
      .filter((result) => result.status === "error")
      .map((result) => result.method.id);
    expect(errorIds).toEqual(
      expect.arrayContaining(["okx-card", "io", "bitget-card", "mexc-card"]),
    );
    // Con Visa inválida, quedan válidos Binance PayPay, Binance Card y Bybit Card.
    expect(comparison.cheapestId).toBe("binance-paypay");
  });
});

/** Método configurable para casos límite del motor. */
const BASE_METHOD: PaymentMethod = {
  id: "test-method",
  name: "Test Method",
  provider: "Test",
  network: "Visa",
  exchangeRateKey: "visa",
  enabled: true,
  fees: { fxFee: 0, cryptoFee: 0, otherFees: [] },
  cashback: { rate: 0, cap: null, currency: "", base: "amountAfterFees" },
  requirements: [],
  observations: [],
  sources: [],
};

function makeMethod(overrides: Partial<PaymentMethod>): PaymentMethod {
  return {
    ...BASE_METHOD,
    ...overrides,
    fees: { ...BASE_METHOD.fees, ...overrides.fees },
    cashback: { ...BASE_METHOD.cashback, ...overrides.cashback },
  };
}

describe("Comportamiento del motor", () => {
  it("aplica una comisión de porcentaje y otra fija en orden", () => {
    const method = makeMethod({
      fees: {
        fxFee: 0,
        cryptoFee: 0,
        otherFees: [
          { id: "percent", name: "Porcentual", type: "percentage", value: 0.01 },
          { id: "fixed", name: "Fija", type: "fixed", value: 1 },
        ],
      },
    });
    const result = calculateOk(method, 10_000, { visa: 100 });
    const { breakdown } = result;
    // base = 100 → x1.01 = 101 → +1 = 102
    expect(breakdown.baseAmountUSD).toBe(100);
    expect(breakdown.otherFeesCostUSD).toBeCloseTo(2, 6);
    expect(breakdown.totalBeforeCashbackUSD).toBeCloseTo(102, 6);
  });

  it("comisión fija se suma en USD sin multiplicar", () => {
    const method = makeMethod({
      fees: {
        fxFee: 0,
        cryptoFee: 0.001,
        otherFees: [{ id: "fixed", name: "Fija", type: "fixed", value: 2 }],
      },
      cashback: { rate: 0.02, cap: null, currency: "", base: "amountAfterFees" },
    });
    // Mismo escenario que OKX Card (50,000 JPY @ visa) para comparar efectos.
    const okx = calculateOk(methodById("okx-card"), 50_000, EXCEL_EXCHANGE_RATES);
    const result = calculateOk(method, 50_000, EXCEL_EXCHANGE_RATES);
    expect(result.breakdown.otherFeesCostUSD).toBe(2);
    expect(result.breakdown.totalBeforeCashbackUSD).toBeCloseTo(
      okx.breakdown.totalBeforeCashbackUSD + 2,
      6,
    );
  });

  it("cashback potencial inferior al límite se aplica completo", () => {
    const method = makeMethod({
      cashback: { rate: 0.02, cap: 100, currency: "", base: "amountAfterFees" },
    });
    const result = calculateOk(method, 50_000, EXCEL_EXCHANGE_RATES);
    expect(result.breakdown.potentialCashbackUSD).toBeLessThan(100);
    expect(result.breakdown.effectiveCashbackUSD).toBe(
      result.breakdown.potentialCashbackUSD,
    );
  });

  it("cashback potencial superior al límite se recorta al límite", () => {
    const method = makeMethod({
      cashback: { rate: 0.02, cap: 5, currency: "USDG", base: "amountAfterFees" },
    });
    const result = calculateOk(method, 50_000, EXCEL_EXCHANGE_RATES);
    expect(result.breakdown.potentialCashbackUSD).toBeGreaterThan(5);
    expect(result.breakdown.effectiveCashbackUSD).toBe(5);
  });

  it("cashback ilimitado aplica todo el potencial", () => {
    const method = makeMethod({
      cashback: { rate: 0.01, cap: null, currency: "", base: "amountAfterFees" },
    });
    const result = calculateOk(method, 50_000, EXCEL_EXCHANGE_RATES);
    expect(result.breakdown.cashbackCapUSD).toBeNull();
    expect(result.breakdown.effectiveCashbackUSD).toBe(
      result.breakdown.potentialCashbackUSD,
    );
  });

  it("cashback con tasa cero no altera el total", () => {
    const method = makeMethod({
      cashback: { rate: 0, cap: 10, currency: "", base: "amountAfterFees" },
    });
    const result = calculateOk(method, 50_000, EXCEL_EXCHANGE_RATES);
    expect(result.breakdown.potentialCashbackUSD).toBe(0);
    expect(result.breakdown.effectiveCashbackUSD).toBe(0);
    expect(result.breakdown.totalUSD).toBe(
      result.breakdown.totalBeforeCashbackUSD,
    );
  });

  it("variación del tipo de cambio escala proporcionalmente el total (sin cap)", () => {
    // IO no tiene cap de cashback, así que su total es lineal en el TC.
    const referenceV = calculateOk(
      methodById("io"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const doubleRate = calculateOk(methodById("io"), EXCEL_AMOUNT_JPY, {
      visa: EXCEL_EXCHANGE_RATES.visa as number * 2,
    });
    expect(doubleRate.breakdown.exchangeRate).toBe(
      referenceV.breakdown.exchangeRate * 2,
    );
    expect(doubleRate.breakdown.totalUSD).toBeCloseTo(
      referenceV.breakdown.totalUSD / 2,
      6,
    );
  });

  it("variación del monto escala proporcionalmente el total (sin cap)", () => {
    const half = calculateOk(methodById("io"), 25_000, EXCEL_EXCHANGE_RATES);
    const full = calculateOk(methodById("io"), 50_000, EXCEL_EXCHANGE_RATES);
    expect(full.breakdown.totalUSD).toBeCloseTo(half.breakdown.totalUSD * 2, 6);
  });

  it("los métodos deshabilitados se excluyen de la comparación", () => {
    const methods = paymentMethods.map((method) =>
      method.id === "mexc-card" ? { ...method, enabled: false } : method,
    );
    const comparison = compareMethods(
      methods,
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    expect(comparison.results.map((result) => result.method.id)).not.toContain(
      "mexc-card",
    );
    // Sin MEXC, el más barato pasa a ser OKX Card.
    expect(comparison.cheapestId).toBe("okx-card");
  });
});
