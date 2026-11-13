import { afterEach, describe, expect, it, vi } from "vitest";
import { readPurchaseInputs } from "../src/hooks/usePurchaseInputs";

function stubStorage(value: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn(() => value),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readPurchaseInputs", () => {
  it("usa los valores por defecto cuando no hay nada guardado", () => {
    stubStorage(null);

    expect(readPurchaseInputs()).toEqual({
      currency: "JPY",
      amounts: { JPY: 50_000, USD: 500 },
      exchangeRates: {
        visa: 157.710157,
        mastercard: 157.51008064,
        paypay: 157.71524839,
      },
    });
  });

  it("restaura la moneda, los montos y los tipos de cambio", () => {
    stubStorage(
      JSON.stringify({
        currency: "USD",
        amounts: { JPY: 75_000, USD: null },
        exchangeRates: { visa: 160, mastercard: null, paypay: 159 },
      }),
    );

    expect(readPurchaseInputs()).toEqual({
      currency: "USD",
      amounts: { JPY: 75_000, USD: null },
      exchangeRates: { visa: 160, mastercard: null, paypay: 159 },
    });
  });

  it("ignora valores inválidos y conserva el resto", () => {
    stubStorage(
      JSON.stringify({
        currency: "EUR",
        amounts: { JPY: "mucho", USD: 250 },
        exchangeRates: { visa: 170, mastercard: "otro", paypay: null },
      }),
    );

    expect(readPurchaseInputs()).toEqual({
      currency: "JPY",
      amounts: { JPY: 50_000, USD: 250 },
      exchangeRates: {
        visa: 170,
        mastercard: 157.51008064,
        paypay: null,
      },
    });
  });

  it("usa los valores por defecto si el JSON está corrupto", () => {
    stubStorage("{");

    expect(readPurchaseInputs().currency).toBe("JPY");
    expect(readPurchaseInputs().amounts).toEqual({ JPY: 50_000, USD: 500 });
  });
});
