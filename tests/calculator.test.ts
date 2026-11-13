import { describe, expect, it } from "vitest";
import paymentMethods from "../src/data/paymentMethods";
import { calculateMethod, compareMethods } from "../src/domain/calculator";
import type {
  ExchangeRateInput,
  OkCalculationResult,
  PaymentMethod,
} from "../src/domain/types";
import { roundTo } from "../src/utils/currency";

const EXCEL_AMOUNT_JPY = 50_000;

const EXCEL_EXCHANGE_RATES: ExchangeRateInput = {
  visa: 157.710157,
  mastercard: 157.51008064,
  paypay: 157.71524839,
};

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
  const result = calculateMethod(
    method,
    { currency: "JPY", amount: amountJPY },
    exchangeRates,
  );
  if (result.status !== "ok") {
    throw new Error(
      `El cálculo de ${method.id} devolvió error: ${result.reason}`,
    );
  }
  return result;
}

describe("Regresión contra el Excel de referencia", () => {
  it("los métodos están registrados en la configuración", () => {
    expect(paymentMethods.map((method) => method.id)).toEqual([
      "binance-paypay",
      "okx-card",
      "binance-card",
      "binance-card-usdt",
      "bybit-card",
      "io",
      "bitget-card",
      "mexc-card",
    ]);
  });

  it("compara todos los métodos habilitados y encuentra el más barato", () => {
    const comparison = compareMethods(
      paymentMethods,
      { currency: "JPY", amount: EXCEL_AMOUNT_JPY },
      EXCEL_EXCHANGE_RATES,
    );
    expect(comparison.results).toHaveLength(6);
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
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(317.6303370, 4);
  });

  it("Binance Card (USDT): FX 2% y conversión general de 0.9%", () => {
    const result = calculateOk(
      methodById("binance-card-usdt"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const { breakdown } = result;
    expect(breakdown.baseAmountUSD).toBeCloseTo(317.44, 4);
    expect(breakdown.afterFxUSD).toBeCloseTo(323.7888, 4);
    expect(breakdown.afterCryptoUSD).toBeCloseTo(326.7028992, 4);
    expect(breakdown.potentialCashbackUSD).toBeCloseTo(6.5341, 3);
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(320.168841, 4);
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
    expect(breakdown.effectiveCashbackUSD).toBe(breakdown.potentialCashbackUSD);
    expect(breakdown.totalUSD).toBeCloseTo(307.3993516, 4);
  });
});

describe("Validaciones de entrada", () => {
  it("monto igual a cero devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      { currency: "JPY", amount: 0 },
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
      { currency: "JPY", amount: -100 },
      EXCEL_EXCHANGE_RATES,
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("mayor que cero"),
    });
  });

  it("monto sin definir devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      { currency: "JPY", amount: null },
      EXCEL_EXCHANGE_RATES,
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("monto"),
    });
  });

  it("tipo de cambio igual a cero devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      { currency: "JPY", amount: 50_000 },
      { visa: 0 },
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("tipo de cambio"),
    });
  });

  it("tipo de cambio faltante devuelve error", () => {
    const result = calculateMethod(
      methodById("io"),
      { currency: "JPY", amount: 50_000 },
      {},
    );
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("tipo de cambio"),
    });
  });

  it("un tipo de cambio inválido solo afecta a los métodos de esa red", () => {
    const comparison = compareMethods(
      paymentMethods,
      { currency: "JPY", amount: EXCEL_AMOUNT_JPY },
      {
        visa: 0,
        mastercard: 157.51008064,
        paypay: 157.71524839,
      },
    );
    const errorIds = comparison.results
      .filter((result) => result.status === "error")
      .map((result) => result.method.id);
    expect(errorIds).toEqual(
      expect.arrayContaining(["okx-card", "io", "mexc-card"]),
    );
    expect(comparison.cheapestId).toBe("binance-paypay");
  });
});

describe("Compras en dólares", () => {
  const USD_AMOUNT = 500;
  const usdPurchase = { currency: "USD" as const, amount: USD_AMOUNT };

  it("calcula sin depender de los tipos de cambio de las redes", () => {
    const result = calculateMethod(methodById("io"), usdPurchase, {});
    expect(result.status).toBe("ok");
    if (result.status !== "ok") {
      return;
    }
    expect(result.breakdown.purchaseCurrency).toBe("USD");
    expect(result.breakdown.amountOriginal).toBe(USD_AMOUNT);
    expect(result.breakdown.exchangeRate).toBeNull();
    expect(result.breakdown.baseAmountUSD).toBe(USD_AMOUNT);
  });

  it("no aplica el FX fee ni el 3% de conversión de IO", () => {
    const card = calculateMethod(methodById("binance-card"), usdPurchase, {});
    expect(card.status).toBe("ok");
    if (card.status !== "ok") {
      return;
    }
    expect(card.breakdown.fxFeeCostUSD).toBe(0);
    expect(card.breakdown.afterFxUSD).toBe(USD_AMOUNT);

    const usdtCard = calculateMethod(
      methodById("binance-card-usdt"),
      usdPurchase,
      {},
    );
    expect(usdtCard.status).toBe("ok");
    if (usdtCard.status !== "ok") {
      return;
    }
    expect(usdtCard.breakdown.fxFeeCostUSD).toBe(0);
    expect(usdtCard.breakdown.afterFxUSD).toBe(USD_AMOUNT);

    const io = calculateMethod(methodById("io"), usdPurchase, {});
    expect(io.status).toBe("ok");
    if (io.status !== "ok") {
      return;
    }
    expect(io.breakdown.fxFeeCostUSD).toBe(0);
    expect(io.breakdown.totalBeforeCashbackUSD).toBe(USD_AMOUNT);
    expect(io.breakdown.totalUSD).toBeCloseTo(495, 6);
  });

  it("mantiene crypto fees, otras comisiones y cashback", () => {
    const okx = calculateMethod(methodById("okx-card"), usdPurchase, {});
    const mexc = calculateMethod(methodById("mexc-card"), usdPurchase, {});
    const card = calculateMethod(methodById("binance-card"), usdPurchase, {});
    if (
      okx.status !== "ok" ||
      mexc.status !== "ok" ||
      card.status !== "ok"
    ) {
      throw new Error("Los escenarios USD deben calcular correctamente.");
    }
    const usdtCard = calculateMethod(
      methodById("binance-card-usdt"),
      usdPurchase,
      {},
    );
    if (usdtCard.status !== "ok") {
      throw new Error("El escenario USD con USDT debe calcular correctamente.");
    }
    expect(roundTo(okx.breakdown.totalUSD, 4)).toBe(495.5);
    expect(roundTo(mexc.breakdown.totalUSD, 4)).toBe(484.8);
    expect(roundTo(card.breakdown.totalUSD, 4)).toBe(490.49);
    expect(roundTo(usdtCard.breakdown.totalUSD, 4)).toBe(494.41);
  });

  it("excluye PayPay y elige el menor costo en dólares", () => {
    const comparison = compareMethods(paymentMethods, usdPurchase, {});
    expect(comparison.results).toHaveLength(5);
    expect(comparison.results.map((result) => result.method.id)).not.toContain(
      "binance-paypay",
    );
    expect(comparison.cheapestId).toBe("mexc-card");
  });

  it("PayPay queda fuera con un error explicativo si se calcula directo", () => {
    const result = calculateMethod(methodById("binance-paypay"), usdPurchase, {});
    expect(result).toMatchObject({
      status: "error",
      reason: expect.stringContaining("solo está disponible para compras en JPY"),
    });
  });
});

describe("Cashback de Binance por monto de compra", () => {
  const usdPurchase = { currency: "USD" as const, amount: 500 };

  it("aplica el Nivel 1 por debajo de 100 USD", () => {
    const result = calculateMethod(
      methodById("binance-card"),
      { currency: "USD", amount: 50 },
      {},
    );
    if (result.status !== "ok") {
      throw new Error("El escenario debe calcular correctamente.");
    }
    expect(result.breakdown.cashbackRate).toBe(0.015);
    expect(result.breakdown.cashbackTierLabel).toContain("Nivel 1");
    expect(result.breakdown.cashbackCapUSD).toBeNull();
    expect(result.breakdown.totalUSD).toBeCloseTo(49.29925, 6);
  });

  it("aplica el Nivel 2 entre 100 y menos de 1,000 USD", () => {
    const result = calculateMethod(
      methodById("binance-card"),
      usdPurchase,
      {},
    );
    if (result.status !== "ok") {
      throw new Error("El escenario debe calcular correctamente.");
    }
    expect(result.breakdown.cashbackRate).toBe(0.02);
    expect(result.breakdown.cashbackTierLabel).toContain("Nivel 2");
    expect(result.breakdown.cashbackCapUSD).toBeNull();
    expect(result.breakdown.totalUSD).toBeCloseTo(490.49, 6);
  });

  it("convierte el monto JPY antes de elegir el nivel", () => {
    const result = calculateMethod(
      methodById("binance-card"),
      { currency: "JPY", amount: 50_000 },
      { mastercard: 157.51008064 },
    );
    if (result.status !== "ok") {
      throw new Error("El escenario debe calcular correctamente.");
    }
    expect(result.breakdown.baseAmountUSD).toBeCloseTo(317.44, 5);
    expect(result.breakdown.cashbackRate).toBe(0.02);
    expect(result.breakdown.cashbackTierLabel).toContain("Nivel 2");
  });

  it("aplica el Nivel 3 desde 1,000 USD con límite de 100 USD", () => {
    const result = calculateMethod(
      methodById("binance-card"),
      { currency: "USD", amount: 1_000 },
      {},
    );
    if (result.status !== "ok") {
      throw new Error("El escenario debe calcular correctamente.");
    }
    expect(result.breakdown.cashbackRate).toBe(0.03);
    expect(result.breakdown.cashbackTierLabel).toContain("Nivel 3");
    expect(result.breakdown.cashbackCapUSD).toBe(100);
    expect(result.breakdown.totalUSD).toBeCloseTo(970.97, 6);
  });

  it("recorta el cashback del Nivel 3 al límite mensual", () => {
    const result = calculateMethod(
      methodById("binance-card"),
      { currency: "USD", amount: 10_000 },
      {},
    );
    if (result.status !== "ok") {
      throw new Error("El escenario debe calcular correctamente.");
    }
    expect(result.breakdown.potentialCashbackUSD).toBeCloseTo(300.3, 6);
    expect(result.breakdown.effectiveCashbackUSD).toBe(100);
    expect(result.breakdown.totalUSD).toBeCloseTo(9_910, 6);
  });
});

const BASE_METHOD: PaymentMethod = {
  id: "test-method",
  name: "Test Method",
  provider: "Test",
  network: "Visa",
  exchangeRateKey: "visa",
  supportedCurrencies: ["JPY", "USD"],
  enabled: true,
  fees: { fxFee: 0, cryptoFee: 0, otherFees: [] },
  cashback: { rate: 0, cap: null, currency: "", base: "amountAfterFees" },
  funding: null,
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
    const referenceV = calculateOk(
      methodById("io"),
      EXCEL_AMOUNT_JPY,
      EXCEL_EXCHANGE_RATES,
    );
    const doubleRate = calculateOk(methodById("io"), EXCEL_AMOUNT_JPY, {
      visa: EXCEL_EXCHANGE_RATES.visa as number * 2,
    });
    expect(doubleRate.breakdown.exchangeRate).toBe(
      (referenceV.breakdown.exchangeRate as number) * 2,
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
      { currency: "JPY", amount: EXCEL_AMOUNT_JPY },
      EXCEL_EXCHANGE_RATES,
    );
    expect(comparison.results.map((result) => result.method.id)).not.toContain(
      "mexc-card",
    );
    expect(comparison.cheapestId).toBe("okx-card");
  });
});
