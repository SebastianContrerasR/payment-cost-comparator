import { useMemo } from "react";
import { compareMethods } from "../domain/calculator";
import type {
  ComparisonResult,
  ExchangeRateInput,
  PaymentMethod,
} from "../domain/types";

/**
 * Recalcula la comparación completa cada vez que cambian el monto en JPY o
 * los tipos de cambio, memoriaizando el resultado entre renders.
 */
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
