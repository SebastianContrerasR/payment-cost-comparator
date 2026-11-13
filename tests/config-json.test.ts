import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseConfigJson,
  serializeConfigJson,
  type ConfigJsonValues,
} from "../src/components/ConfigJsonEditor/configJson";
import { readFundingSettings } from "../src/hooks/useFunding";
import type { FundingSettings } from "../src/hooks/useFunding";
import { readPurchaseInputs } from "../src/hooks/usePurchaseInputs";

const options = {
  rateKeys: ["visa", "mastercard", "paypay"],
  knownMethodIds: ["binance-card", "okx-card"],
};

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

function defaultSource(): { purchase: ConfigJsonValues["purchase"]; fundingSettings: FundingSettings } {
  stubStorage(null);
  const saved = readPurchaseInputs();
  return {
    purchase: {
      currency: saved.currency,
      amount: saved.amounts[saved.currency],
      exchangeRates: saved.exchangeRates,
      methods: ["binance-card"],
    },
    fundingSettings: readFundingSettings(),
  };
}

describe("config JSON", () => {
  it("hace round-trip de compra y fondeo desde los defaults", () => {
    const source = defaultSource();

    expect(parseConfigJson(serializeConfigJson(source), options)).toEqual({
      ok: true,
      value: {
        purchase: source.purchase,
        funding: {
          rates: source.fundingSettings.rates,
          fees: source.fundingSettings.fees,
          sourcesEnabled: source.fundingSettings.sourcesEnabled,
          conversionRates: source.fundingSettings.conversionRates,
        },
      },
    });
  });

  it("hace round-trip con compra en USD y fondeo modificado", () => {
    const source = defaultSource();
    const purchase: ConfigJsonValues["purchase"] = {
      currency: "USD",
      amount: null,
      exchangeRates: { visa: null, mastercard: 158, paypay: 159 },
      methods: [],
    };
    const fundingSettings = {
      ...source.fundingSettings,
      rates: { ...source.fundingSettings.rates, "binance-p2p": null },
      sourcesEnabled: {
        ...source.fundingSettings.sourcesEnabled,
        "binance-p2p": false,
      },
      conversionRates: {
        ...source.fundingSettings.conversionRates,
        "okx:USDG": null,
      },
    };

    expect(
      parseConfigJson(
        serializeConfigJson({ purchase, fundingSettings }),
        options,
      ),
    ).toEqual({
      ok: true,
      value: {
        purchase,
        funding: {
          rates: fundingSettings.rates,
          fees: fundingSettings.fees,
          sourcesEnabled: fundingSettings.sourcesEnabled,
          conversionRates: fundingSettings.conversionRates,
        },
      },
    });
  });

  it("rechaza JSON mal formado", () => {
    const result = parseConfigJson("{", options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON inválido");
    }
  });

  it("rechaza una entrada que no es objeto", () => {
    expect(parseConfigJson("[]", options)).toEqual({
      ok: false,
      error: "La entrada JSON debe ser un objeto.",
    });
  });

  it("rechaza claves ajenas a la configuración", () => {
    const source = defaultSource();
    const parsed = JSON.parse(
      serializeConfigJson(source),
    ) as Record<string, unknown>;
    parsed.routes = {};

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error:
        'La clave "routes" no es parte de la configuración; usa "purchase" y "funding".',
    });
  });

  it("exige la sección purchase", () => {
    const source = defaultSource();
    const parsed = JSON.parse(
      serializeConfigJson(source),
    ) as Record<string, unknown>;
    delete parsed.purchase;

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error: '"purchase" debe ser un objeto.',
    });
  });

  it("prefija los errores de compra con purchase", () => {
    const source = defaultSource();
    const parsed = JSON.parse(serializeConfigJson(source)) as {
      purchase: Record<string, unknown>;
    };
    parsed.purchase.amount = "50k";

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error: '"purchase.amount" debe ser un número o null.',
    });
  });

  it("prefija los errores de fondeo con funding", () => {
    const source = defaultSource();
    const parsed = JSON.parse(serializeConfigJson(source)) as {
      funding: { sources: Record<string, Record<string, unknown>> };
    };
    parsed.funding.sources["binance-p2p"].enabled = "sí";

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error: '"funding.sources.binance-p2p.enabled" debe ser true o false.',
    });
  });

  it("mantiene el rechazo de claves ajenas dentro de funding", () => {
    const source = defaultSource();
    const parsed = JSON.parse(serializeConfigJson(source)) as {
      funding: Record<string, unknown>;
    };
    parsed.funding.routes = {};

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error:
        'La clave "routes" no es un input de fondeo; usa "sources" y "conversionRates".',
    });
  });

  it("rechaza métodos desconocidos en purchase", () => {
    const source = defaultSource();
    const parsed = JSON.parse(
      serializeConfigJson(source),
    ) as { purchase: Record<string, unknown> };
    parsed.purchase.methods = ["ghost"];

    expect(parseConfigJson(JSON.stringify(parsed), options)).toEqual({
      ok: false,
      error: 'El método "ghost" no existe.',
    });
  });
});
