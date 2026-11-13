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

export function serializeInputJson(values: InputJsonValues): string {
  return JSON.stringify(
    {
      currency: values.currency,
      amount: values.amount,
      exchangeRates: values.exchangeRates,
      methods: values.methods,
    },
    null,
    2,
  );
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

  const currency = parsed.currency;
  if (
    typeof currency !== "string" ||
    !PURCHASE_CURRENCIES.includes(currency as PurchaseCurrency)
  ) {
    return {
      ok: false,
      error: '"currency" debe ser "JPY" o "USD".',
    };
  }

  const amount = readNumber(parsed.amount, "amount");
  if (!amount.ok) {
    return amount;
  }

  if (!isRecord(parsed.exchangeRates)) {
    return {
      ok: false,
      error: '"exchangeRates" debe ser un objeto.',
    };
  }

  const exchangeRates: ExchangeRateInput = {};
  for (const key of options.rateKeys) {
    if (!(key in parsed.exchangeRates)) {
      return {
        ok: false,
        error: `Falta "exchangeRates.${key}".`,
      };
    }
    const rate = readNumber(parsed.exchangeRates[key], `exchangeRates.${key}`);
    if (!rate.ok) {
      return rate;
    }
    exchangeRates[key] = rate.value;
  }

  if (!Array.isArray(parsed.methods)) {
    return {
      ok: false,
      error: '"methods" debe ser un arreglo de IDs.',
    };
  }

  const knownMethodIds = new Set(options.knownMethodIds);
  const methods: string[] = [];
  for (const [index, methodId] of parsed.methods.entries()) {
    if (typeof methodId !== "string") {
      return {
        ok: false,
        error: `"methods[${index}]" debe ser un texto.`,
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
