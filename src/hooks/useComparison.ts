import { useMemo } from "react";
import { compareMethods } from "../domain/calculator";
import type {
  ComparisonResult,
  ExchangeRateInput,
  PaymentMethod,
} from "../domain/types";

export function useComparison(
  methods: readonly PaymentMethod[],
  amountJPY: number | null,
  exchangeRates: ExchangeRateInput,
): ComparisonResult {
  return useMemo(
    () => compareMethods(methods, amountJPY, exchangeRates),
    [methods, amountJPY, exchangeRates],
  );
}
