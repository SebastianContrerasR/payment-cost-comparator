import fundingSources from "../../data/fundingSources";
import { defaultConversionRates } from "../../domain/funding";
import type { FundingSettings } from "../../hooks/useFunding";

const SOURCE_IDS = fundingSources.map((source) => source.id);
const CONVERSION_DEFAULTS = defaultConversionRates();
const CONVERSION_KEYS = Object.keys(CONVERSION_DEFAULTS);
const TOP_LEVEL_KEYS = ["sources", "conversionRates"];

export type FundingJsonUpdate = Pick<
  FundingSettings,
  "rates" | "fees" | "sourcesEnabled" | "conversionRates"
>;

export type FundingJsonParseResult =
  | { ok: true; value: FundingJsonUpdate }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function settingsNumber(
  map: Record<string, number | null>,
  id: string,
  fallback: number | null,
): number | null {
  const value = map[id];
  return value === undefined ? fallback : value;
}

function settingsBoolean(
  map: Record<string, boolean>,
  id: string,
  fallback: boolean,
): boolean {
  const value = map[id];
  return value === undefined ? fallback : value;
}

function readNumberField(
  path: string,
  value: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!isNullableFiniteNumber(value)) {
    return {
      ok: false,
      error: `"${path}" debe ser un número o null.`,
    };
  }
  return { ok: true, value };
}

function readBooleanField(
  path: string,
  value: unknown,
): { ok: true; value: boolean } | { ok: false; error: string } {
  if (typeof value !== "boolean") {
    return {
      ok: false,
      error: `"${path}" debe ser true o false.`,
    };
  }
  return { ok: true, value };
}

export function serializeFundingJson(settings: FundingSettings): string {
  const sources: Record<string, unknown> = {};
  for (const source of fundingSources) {
    sources[source.id] = {
      penPerUsdt: settingsNumber(settings.rates, source.id, source.penPerUsdt),
      fee: settingsNumber(settings.fees, source.id, source.fee?.value ?? null),
      enabled: settingsBoolean(
        settings.sourcesEnabled,
        source.id,
        source.enabled,
      ),
    };
  }

  const conversionRates: Record<string, number | null> = {};
  for (const key of CONVERSION_KEYS) {
    conversionRates[key] = settingsNumber(
      settings.conversionRates,
      key,
      CONVERSION_DEFAULTS[key],
    );
  }

  return JSON.stringify({ sources, conversionRates }, null, 2);
}

function parseSources(
  value: unknown,
): { ok: true; rates: Record<string, number | null>; fees: Record<string, number | null>; enabled: Record<string, boolean> } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: '"sources" debe ser un objeto.' };
  }
  for (const key of Object.keys(value)) {
    if (!SOURCE_IDS.includes(key)) {
      return { ok: false, error: `La fuente "${key}" no existe.` };
    }
  }

  const rates: Record<string, number | null> = {};
  const fees: Record<string, number | null> = {};
  const enabled: Record<string, boolean> = {};
  for (const id of SOURCE_IDS) {
    const entry = value[id];
    if (entry === undefined) {
      return { ok: false, error: `Falta "sources.${id}".` };
    }
    if (!isRecord(entry)) {
      return { ok: false, error: `"sources.${id}" debe ser un objeto.` };
    }
    const rate = readNumberField(`sources.${id}.penPerUsdt`, entry.penPerUsdt);
    if (!rate.ok) {
      return rate;
    }
    const fee = readNumberField(`sources.${id}.fee`, entry.fee);
    if (!fee.ok) {
      return fee;
    }
    const isEnabled = readBooleanField(`sources.${id}.enabled`, entry.enabled);
    if (!isEnabled.ok) {
      return isEnabled;
    }
    rates[id] = rate.value;
    fees[id] = fee.value;
    enabled[id] = isEnabled.value;
  }
  return { ok: true, rates, fees, enabled };
}

function parseConversionRates(
  value: unknown,
): { ok: true; rates: Record<string, number | null> } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: '"conversionRates" debe ser un objeto.' };
  }
  for (const key of Object.keys(value)) {
    if (!CONVERSION_KEYS.includes(key)) {
      return {
        ok: false,
        error: `La conversión "${key}" no existe; usa las claves del JSON generado.`,
      };
    }
  }

  const rates: Record<string, number | null> = {};
  for (const key of CONVERSION_KEYS) {
    const entry = value[key];
    if (entry === undefined) {
      return { ok: false, error: `Falta "conversionRates.${key}".` };
    }
    const rate = readNumberField(`conversionRates.${key}`, entry);
    if (!rate.ok) {
      return rate;
    }
    rates[key] = rate.value;
  }
  return { ok: true, rates };
}

export function parseFundingJson(raw: string): FundingJsonParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    return { ok: false, error: `JSON inválido.${detail}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "La entrada JSON debe ser un objeto." };
  }

  for (const key of Object.keys(parsed)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      return {
        ok: false,
        error: `La clave "${key}" no es un input de fondeo; usa "sources" y "conversionRates".`,
      };
    }
  }

  const sources = parseSources(parsed.sources);
  if (!sources.ok) {
    return sources;
  }
  const conversionRates = parseConversionRates(parsed.conversionRates);
  if (!conversionRates.ok) {
    return conversionRates;
  }

  return {
    ok: true,
    value: {
      rates: sources.rates,
      fees: sources.fees,
      sourcesEnabled: sources.enabled,
      conversionRates: conversionRates.rates,
    },
  };
}
