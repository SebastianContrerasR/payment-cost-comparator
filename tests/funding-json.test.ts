import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConversionRates } from "../src/domain/funding";
import {
  parseFundingJson,
  serializeFundingJson,
} from "../src/components/FundingPanel/fundingJson";
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
  it("hace round-trip de la configuración completa", () => {
    const settings = defaultSettings();

    expect(parseFundingJson(serializeFundingJson(settings))).toEqual({
      ok: true,
      value: settings,
    });
  });

  it("hace round-trip con tasas nulas, fuentes y rutas apagadas y red manual", () => {
    const settings = defaultSettings();
    const modified: FundingSettings = {
      ...settings,
      rates: { ...settings.rates, "binance-p2p": null },
      fees: { ...settings.fees, "binance-p2p": 0.1 },
      sourcesEnabled: { ...settings.sourcesEnabled, "binance-p2p": false },
      routesEnabled: { ...settings.routesEnabled, "binance-p2p-mexc": false },
      networkOverrides: { "binance-p2p-mexc": "bep20" },
      conversionRates: { ...settings.conversionRates, "okx:USDG": null },
    };

    expect(parseFundingJson(serializeFundingJson(modified))).toEqual({
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

  it("rechaza una ruta desconocida", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.routes = {
      ...(parsed.routes as Record<string, unknown>),
      otra: { enabled: true, network: null },
    };

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error: 'La ruta "otra" no existe.',
    });
  });

  it("rechaza una red que no existe", () => {
    const settings = defaultSettings();
    const raw = serializeFundingJson(settings);
    const parsed = JSON.parse(raw) as {
      routes: Record<string, Record<string, unknown>>;
    };
    parsed.routes["binance-p2p-mexc"].network = "red-fantasma";

    expect(parseFundingJson(JSON.stringify(parsed))).toEqual({
      ok: false,
      error:
        '"routes.binance-p2p-mexc.network" debe ser null (automática) o una red conocida.',
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
