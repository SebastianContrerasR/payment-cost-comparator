/**
 * Modelo de dominio del comparador de métodos de pago.
 *
 * Este módulo describe qué datos existen y cómo se relacionan. El motor de
 * cálculo (`calculator.ts`) consume estas estructuras, así que agregar un
 * método de pago nuevo consiste únicamente en registrar configuración
 * (`data/paymentMethods.ts`): no hay que tocar fórmulas ni componentes.
 *
 * Convenciones de unidades:
 * - Los importes de la comparación están en USD (los JPY son la moneda origen).
 * - Las comisiones porcentuales se guardan como fracción: 0.02 = 2%.
 * - El tipo de cambio se interpreta como JPY por USD:
 *     montoUSD = montoJPY / tipoDeCambio
 * - El límite de cashback (`cap`) se expresa en USD aproximados (USDT, USDG y
 *   monedas pegadas al dólar se tratan como USD en el escenario del Excel).
 */

export type FeeRuleType = "percentage" | "fixed";

/** Regla de comisión adicional, aplicada secuencialmente tras el crypto fee. */
export interface FeeRule {
  id: string;
  name: string;
  type: FeeRuleType;
  /** percentage: fracción (0.01 = 1%). fixed: importe fijo en USD. */
  value: number;
  /** Nota informativa sobre cuándo aplica la comisión. */
  description?: string;
}

/**
 * Base sobre la que se calcula el cashback. El MVP usa el monto después de
 * comisiones, igual que la hoja Excel de referencia.
 */
export const CASHBACK_BASES = ["amountAfterFees"] as const;
export type CashbackBase = (typeof CASHBACK_BASES)[number];

export interface CashbackConfig {
  /** Fracción (0.02 = 2%). */
  rate: number;
  /** Límite mensual de cashback disponible; null = ilimitado. */
  cap: number | null;
  /** Moneda/denominación en la que acredita el cashback, si se conoce. */
  currency: string;
  /** Base de cálculo del cashback para este método. */
  base: CashbackBase;
}

export interface FeesConfig {
  /** FX fee de la red/proveedor, fracción (0.02 = 2%). */
  fxFee: number;
  /** Comisión de conversión cripto → fiat, fracción. */
  cryptoFee: number;
  /** Comisiones adicionales, aplicadas en orden sobre el monto acumulado. */
  otherFees: FeeRule[];
}

export interface PaymentMethodSource {
  label: string;
  url: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  /** Red o marca tal como aparece en la comparación: Visa, Mastercard, PayPay... */
  network: string;
  /** Clave para buscar el tipo de cambio en `ExchangeRateInput`. */
  exchangeRateKey: string;
  enabled: boolean;
  fees: FeesConfig;
  cashback: CashbackConfig;
  requirements: string[];
  observations: string[];
  sources: PaymentMethodSource[];
}

/** Tipos de cambio en JPY por USD, indexados por clave de red ("visa", ...). */
export type ExchangeRateInput = Record<string, number | null>;

/** Resultado de una regla de comisión adicional. */
export interface OtherFeeLine {
  rule: FeeRule;
  /** Costo de la regla, en USD, sobre el monto previo. */
  costUSD: number;
  /** Monto acumulado tras aplicar la regla. */
  afterUSD: number;
}

/** Desglose paso a paso del cálculo de un método (todas las cifras en USD). */
export interface CalculationBreakdown {
  amountJPY: number;
  exchangeRate: number;
  /** Paso 1. Conversión de moneda. */
  baseAmountUSD: number;
  /** Paso 2. FX fee. */
  afterFxUSD: number;
  fxFeeCostUSD: number;
  /** Paso 3. Crypto fee. */
  afterCryptoUSD: number;
  cryptoFeeCostUSD: number;
  /** Paso 4. Otras comisiones, aplicadas en orden. */
  otherFeeLines: OtherFeeLine[];
  otherFeesCostUSD: number;
  /** Monto con todas las comisiones (antes del cashback). */
  totalBeforeCashbackUSD: number;
  /** Pasos 5–6. Cashback potencial y efectivo (tras aplicar el límite). */
  potentialCashbackUSD: number;
  cashbackCapUSD: number | null;
  effectiveCashbackUSD: number;
  /** Paso 7. Costo final. */
  totalUSD: number;
}

/** Resultado del cálculo de un método: ok con desglose, o error con motivo. */
export type CalculationResult =
  | { status: "ok"; method: PaymentMethod; breakdown: CalculationBreakdown }
  | { status: "error"; method: PaymentMethod; reason: string };

export type OkCalculationResult = Extract<CalculationResult, { status: "ok" }>;

/** Comparación completa: un resultado por método habilitado + el más barato. */
export interface ComparisonResult {
  results: CalculationResult[];
  /** Id del método habilitado más barato; null si no hay resultados válidos. */
  cheapestId: string | null;
}
