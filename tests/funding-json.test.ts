import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConversionRates } from "../src/domain/funding";
import {
  parseFundingJson,
  serializeFundingJson,
} from "../src/components/FundingInputs/fundingJson";
import { readFundingSettings } from "../src/hooks/useFunding";
import type { FundingSettings } from "../src/hooks/useFunding";

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

function defaultSettings(): FundingSettings {
  stubStorage(null);
  return readFundingSettings();
}

describe("funding JSON", () => {
  it("hace round-trip de los inputs de fondeo sin tocar el resto del estado", () => {
    const settings = defaultSettings();

    expect(parseFundingJson(serializeFundingJson(settings))).toEqual({
      ok: true,
      value: {
        rates: settings.rates,
        fees: settings.fees,
        sourcesEnabled: settings.sourcesEnabled,
        conversionRates: settings.conversionRates,
      },
    });
  });

  it("hace round-trip con tasas nulas, fuentes apagadas y conversión nula", () => {
    const settings = defaultSettings();
    const modified = {
      rates: { ...settings.rates, "binance-p2p": null },
      fees: { ...settings.fees, "binance-p2p": 0.1 },
      sourcesEnabled: { ...settings.sourcesEnabled, "binance-p2p": false },
      conversionRates: { ...settings.conversionRates, "okx:USDG": null },
    };

    expect(parseFundingJson(serializeFundingJson({ ...settings, ...modified }))).toEqual({
      ok: true,
      value: modified,
    });
  });

  it("rechaza JSON mal formado", () => {
    const result = parseFundingJson("{");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON inválido");
    }
  });

  it("rechaza una entrada que no es objeto", () => {
    expect(parseFundingJson("[]")).toEqual({
      ok: false,
      error: "La entrada JSON debe ser un objeto.",
    });
  });

  it("rechaza una fuente desconocida", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.sources = {
      ...(parsed.sources as Record<string, unknown>),
      otra: { penPerUsdt: 3.78, fee: 0.07, enabled: true },
    };

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: 'La fuente "otra" no existe.',
    });
  });

  it("exige todas las fuentes", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as { sources: Record<string, unknown> };
    delete parsed.sources["binance-p2p"];

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: 'Falta "sources.binance-p2p".',
    });
  });

  it("valida los tipos de cada fuente", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as {
      sources: Record<string, Record<string, unknown>>;
    };
    parsed.sources["binance-p2p"].penPerUsdt = "3.78";

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: '"sources.binance-p2p.penPerUsdt" debe ser un número o null.',
    });
  });

  it("valida el flag enabled de una fuente", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as {
      sources: Record<string, Record<string, unknown>>;
    };
    parsed.sources["binance-p2p"].enabled = "sí";

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: '"sources.binance-p2p.enabled" debe ser true o false.',
    });
  });

  it("rechaza claves que no son inputs de fondeo", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.routes = { "binance-p2p-mexc": "bep20" };

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: 'La clave "routes" no es un input de fondeo; usa "sources" y "conversionRates".',
    });
  });

  it("rechaza una conversión desconocida", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.conversionRates = {
      ...(parsed.conversionRates as Record<string, unknown>),
      "binance:XYZ": 1,
    };

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: 'La conversión "binance:XYZ" no existe; usa las claves del JSON generado.',
    });
  });

  it("exige todas las conversiones", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as { conversionRates: Record<string, unknown> };
    const firstKey = Object.keys(defaultConversionRates())[0];
    delete parsed.conversionRates[firstKey];

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: `Falta "conversionRates.${firstKey}".`,
    });
  });
});
