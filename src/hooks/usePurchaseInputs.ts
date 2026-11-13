import { useCallback, useEffect, useState } from "react";
import type {
  ExchangeRateInput,
  PurchaseCurrency,
} from "../domain/types";

const STORAGE_KEY = "payment-cost-comparator.purchase-inputs";

const DEFAULT_AMOUNTS: Record<PurchaseCurrency, number | null> = {
  JPY: 50_000,
  USD: 500,
};

const DEFAULT_EXCHANGE_RATES: ExchangeRateInput = {
  visa: 157.710157,
  mastercard: 157.51008064,
  paypay: 157.71524839,
};

export interface PurchaseInputSettings {
  currency: PurchaseCurrency;
  amounts: Record<PurchaseCurrency, number | null>;
  exchangeRates: ExchangeRateInput;
}

export interface PurchaseInputUpdate {
  currency: PurchaseCurrency;
  amount: number | null;
  exchangeRates: ExchangeRateInput;
}

function defaultPurchaseInputs(): PurchaseInputSettings {
  return {
    currency: "JPY",
    amounts: { ...DEFAULT_AMOUNTS },
    exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableNumber(
  value: unknown,
  fallback: number | null,
): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readAmounts(
  value: unknown,
  fallback: Record<PurchaseCurrency, number | null>,
): Record<PurchaseCurrency, number | null> {
  if (!isRecord(value)) {
    return { ...fallback };
  }
  return {
    JPY: readNullableNumber(value.JPY, fallback.JPY),
    USD: readNullableNumber(value.USD, fallback.USD),
  };
}

function readExchangeRates(
  value: unknown,
  fallback: ExchangeRateInput,
): ExchangeRateInput {
  if (!isRecord(value)) {
    return { ...fallback };
  }
  const result: ExchangeRateInput = { ...fallback };
  for (const key of Object.keys(fallback)) {
    result[key] = readNullableNumber(value[key], fallback[key] ?? null);
  }
  return result;
}

export function readPurchaseInputs(): PurchaseInputSettings {
  const defaults = defaultPurchaseInputs();
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return defaults;
    }
    return {
      currency:
        parsed.currency === "USD" || parsed.currency === "JPY"
          ? parsed.currency
          : defaults.currency,
      amounts: readAmounts(parsed.amounts, defaults.amounts),
      exchangeRates: readExchangeRates(
        parsed.exchangeRates,
        defaults.exchangeRates,
      ),
    };
  } catch {
    return defaults;
  }
}

export function usePurchaseInputs(): {
  currency: PurchaseCurrency;
  amount: number | null;
  exchangeRates: ExchangeRateInput;
  setCurrency: (currency: PurchaseCurrency) => void;
  setAmount: (value: number | null) => void;
  setExchangeRate: (key: string, value: number | null) => void;
  applyPurchaseInputs: (update: PurchaseInputUpdate) => void;
} {
  const [inputs, setInputs] = useState<PurchaseInputSettings>(readPurchaseInputs);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      return;
    }
  }, [inputs]);

  const setCurrency = useCallback((currency: PurchaseCurrency) => {
    setInputs((previous) => ({ ...previous, currency }));
  }, []);

  const setAmount = useCallback((value: number | null) => {
    setInputs((previous) => ({
      ...previous,
      amounts: { ...previous.amounts, [previous.currency]: value },
    }));
  }, []);

  const setExchangeRate = useCallback((key: string, value: number | null) => {
    setInputs((previous) => ({
      ...previous,
      exchangeRates: { ...previous.exchangeRates, [key]: value },
    }));
  }, []);

  const applyPurchaseInputs = useCallback((update: PurchaseInputUpdate) => {
    setInputs((previous) => ({
      currency: update.currency,
      amounts: {
        ...previous.amounts,
        [update.currency]: update.amount,
      },
      exchangeRates: { ...previous.exchangeRates, ...update.exchangeRates },
    }));
  }, []);

  return {
    currency: inputs.currency,
    amount: inputs.amounts[inputs.currency],
    exchangeRates: inputs.exchangeRates,
    setCurrency,
    setAmount,
    setExchangeRate,
    applyPurchaseInputs,
  };
}
