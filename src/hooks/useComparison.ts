import { useMemo } from "react";
import { compareMethods } from "../domain/calculator";
import type {
  ComparisonResult,
  ExchangeRateInput,
  PaymentMethod,
  PurchaseInput,
} from "../domain/types";

export function useComparison(
  methods: readonly PaymentMethod[],
  purchase: PurchaseInput,
  exchangeRates: ExchangeRateInput,
): ComparisonResult {
  return useMemo(
    () => compareMethods(methods, purchase, exchangeRates),
    [methods, purchase, exchangeRates],
  );
}
