import {
  PURCHASE_CURRENCIES,
  type ExchangeRateInput,
  type PurchaseCurrency,
} from "../../domain/types";

export interface InputJsonValues {
  currency: PurchaseCurrency;
  amount: number | null;
  exchangeRates: ExchangeRateInput;
  methods: string[];
}

export interface InputJsonParseOptions {
  rateKeys: readonly string[];
  knownMethodIds: readonly string[];
}

export type InputJsonParseResult =
  | { ok: true; value: InputJsonValues }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function readNumber(
  value: unknown,
  path: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!isNullableFiniteNumber(value)) {
    return {
      ok: false,
      error: `"${path}" debe ser un número o null.`,
    };
  }
  return { ok: true, value };
}

export function serializeInputJsonObject(values: InputJsonValues): object {
  return {
    currency: values.currency,
    amount: values.amount,
    exchangeRates: values.exchangeRates,
    methods: values.methods,
  };
}

export function serializeInputJson(values: InputJsonValues): string {
  return JSON.stringify(serializeInputJsonObject(values), null, 2);
}

export function parseInputJsonObject(
  value: unknown,
  options: InputJsonParseOptions,
  pathPrefix = "",
): InputJsonParseResult {
  const path = (field: string) =>
    pathPrefix ? `${pathPrefix}.${field}` : field;

  if (!isRecord(value)) {
    return {
      ok: false,
      error: `"${pathPrefix || "entrada JSON"}" debe ser un objeto.`,
    };
  }

  const currency = value.currency;
  if (
    typeof currency !== "string" ||
    !PURCHASE_CURRENCIES.includes(currency as PurchaseCurrency)
  ) {
    return {
      ok: false,
      error: `"${path("currency")}" debe ser "JPY" o "USD".`,
    };
  }

  const amount = readNumber(value.amount, path("amount"));
  if (!amount.ok) {
    return amount;
  }

  if (!isRecord(value.exchangeRates)) {
    return {
      ok: false,
      error: `"${path("exchangeRates")}" debe ser un objeto.`,
    };
  }

  const exchangeRates: ExchangeRateInput = {};
  for (const key of options.rateKeys) {
    if (!(key in value.exchangeRates)) {
      return {
        ok: false,
        error: `Falta "${path(`exchangeRates.${key}`)}".`,
      };
    }
    const rate = readNumber(
      value.exchangeRates[key],
      path(`exchangeRates.${key}`),
    );
    if (!rate.ok) {
      return rate;
    }
    exchangeRates[key] = rate.value;
  }

  if (!Array.isArray(value.methods)) {
    return {
      ok: false,
      error: `"${path("methods")}" debe ser un arreglo de IDs.`,
    };
  }

  const knownMethodIds = new Set(options.knownMethodIds);
  const methods: string[] = [];
  for (const [index, methodId] of value.methods.entries()) {
    if (typeof methodId !== "string") {
      return {
        ok: false,
        error: `"${path(`methods[${index}]`)}" debe ser un texto.`,
      };
    }
    if (!knownMethodIds.has(methodId)) {
      return {
        ok: false,
        error: `El método "${methodId}" no existe.`,
      };
    }
    if (!methods.includes(methodId)) {
      methods.push(methodId);
    }
  }

  return {
    ok: true,
    value: {
      currency: currency as PurchaseCurrency,
      amount: amount.value,
      exchangeRates,
      methods,
    },
  };
}

export function parseInputJson(
  raw: string,
  options: InputJsonParseOptions,
): InputJsonParseResult {
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

  return parseInputJsonObject(parsed, options);
}
