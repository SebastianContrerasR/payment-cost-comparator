import { describe, expect, it } from "vitest";
import {
  parseInputJson,
  serializeInputJson,
  type InputJsonValues,
} from "../src/components/InputPanel/inputJson";

const options = {
  rateKeys: ["visa", "mastercard", "paypay"],
  knownMethodIds: ["binance-card", "okx-card"],
};

const values: InputJsonValues = {
  currency: "JPY",
  amount: 50_000,
  exchangeRates: {
    visa: 157.710157,
    mastercard: 157.51008064,
    paypay: 157.71524839,
  },
  methods: ["binance-card", "okx-card"],
};

describe("input JSON", () => {
  it("hace round-trip de la configuración completa", () => {
    expect(parseInputJson(serializeInputJson(values), options)).toEqual({
      ok: true,
      value: values,
    });
  });

  it("acepta montos y tipos de cambio nulos", () => {
    const result = parseInputJson(
      JSON.stringify({
        currency: "USD",
        amount: null,
        exchangeRates: { visa: null, mastercard: 158, paypay: null },
        methods: [],
      }),
      options,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        currency: "USD",
        amount: null,
        exchangeRates: { visa: null, mastercard: 158, paypay: null },
        methods: [],
      },
    });
  });

  it("rechaza JSON mal formado", () => {
    const result = parseInputJson("{", options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON inválido");
    }
  });

  it("rechaza una moneda no soportada", () => {
    expect(
      parseInputJson(JSON.stringify({ ...values, currency: "EUR" }), options),
    ).toEqual({
      ok: false,
      error: '"currency" debe ser "JPY" o "USD".',
    });
  });

  it("exige todos los tipos de cambio", () => {
    expect(
      parseInputJson(
        JSON.stringify({
          ...values,
          exchangeRates: { visa: 157, mastercard: 157 },
        }),
        options,
      ),
    ).toEqual({
      ok: false,
      error: 'Falta "exchangeRates.paypay".',
    });
  });

  it("rechaza métodos desconocidos", () => {
    expect(
      parseInputJson(
        JSON.stringify({ ...values, methods: ["binance-card", "otro"] }),
        options,
      ),
    ).toEqual({
      ok: false,
      error: 'El método "otro" no existe.',
    });
  });

  it("deduplica los métodos conservando el orden", () => {
    const result = parseInputJson(
      JSON.stringify({
        ...values,
        methods: ["okx-card", "binance-card", "okx-card"],
      }),
      options,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.methods).toEqual(["okx-card", "binance-card"]);
    }
  });
});
