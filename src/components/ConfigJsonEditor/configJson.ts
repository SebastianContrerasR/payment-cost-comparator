import {
  parseInputJsonObject,
  serializeInputJsonObject,
  type InputJsonParseOptions,
  type InputJsonValues,
} from "../InputPanel/inputJson";
import {
  parseFundingJsonObject,
  serializeFundingJsonObject,
  type FundingJsonUpdate,
} from "../FundingInputs/fundingJson";
import type { FundingSettings } from "../../hooks/useFunding";

const TOP_LEVEL_KEYS = ["purchase", "funding"];

export interface ConfigJsonValues {
  purchase: InputJsonValues;
  funding: FundingJsonUpdate;
}

export interface ConfigJsonSource {
  purchase: InputJsonValues;
  fundingSettings: FundingSettings;
}

export type ConfigJsonParseResult =
  | { ok: true; value: ConfigJsonValues }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeConfigJson(source: ConfigJsonSource): string {
  return JSON.stringify(
    {
      purchase: serializeInputJsonObject(source.purchase),
      funding: serializeFundingJsonObject(source.fundingSettings),
    },
    null,
    2,
  );
}

export function parseConfigJson(
  raw: string,
  options: InputJsonParseOptions,
): ConfigJsonParseResult {
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
        error: `La clave "${key}" no es parte de la configuración; usa "purchase" y "funding".`,
      };
    }
  }

  if (!isRecord(parsed.purchase)) {
    return { ok: false, error: '"purchase" debe ser un objeto.' };
  }
  if (!isRecord(parsed.funding)) {
    return { ok: false, error: '"funding" debe ser un objeto.' };
  }

  const purchase = parseInputJsonObject(parsed.purchase, options, "purchase");
  if (!purchase.ok) {
    return purchase;
  }
  const funding = parseFundingJsonObject(parsed.funding, "funding");
  if (!funding.ok) {
    return funding;
  }

  return {
    ok: true,
    value: { purchase: purchase.value, funding: funding.value },
  };
}
