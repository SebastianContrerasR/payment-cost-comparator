export type FeeRuleType = "percentage" | "fixed";

export interface FeeRule {
  id: string;
  name: string;
  type: FeeRuleType;

  value: number;

  description?: string;
}

export const CASHBACK_BASES = ["amountAfterFees"] as const;
export type CashbackBase = (typeof CASHBACK_BASES)[number];

export interface CashbackConfig {

  rate: number;

  cap: number | null;

  currency: string;

  base: CashbackBase;
}

export interface FeesConfig {

  fxFee: number;

  cryptoFee: number;

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

  network: string;

  exchangeRateKey: string;
  enabled: boolean;
  fees: FeesConfig;
  cashback: CashbackConfig;
  requirements: string[];
  observations: string[];
  sources: PaymentMethodSource[];
}

export type ExchangeRateInput = Record<string, number | null>;

export interface OtherFeeLine {
  rule: FeeRule;

  costUSD: number;

  afterUSD: number;
}

export interface CalculationBreakdown {
  amountJPY: number;
  exchangeRate: number;

  baseAmountUSD: number;

  afterFxUSD: number;
  fxFeeCostUSD: number;

  afterCryptoUSD: number;
  cryptoFeeCostUSD: number;

  otherFeeLines: OtherFeeLine[];
  otherFeesCostUSD: number;

  totalBeforeCashbackUSD: number;

  potentialCashbackUSD: number;
  cashbackCapUSD: number | null;
  effectiveCashbackUSD: number;

  totalUSD: number;
}

export type CalculationResult =
  | { status: "ok"; method: PaymentMethod; breakdown: CalculationBreakdown }
  | { status: "error"; method: PaymentMethod; reason: string };

export type OkCalculationResult = Extract<CalculationResult, { status: "ok" }>;

export interface ComparisonResult {
  results: CalculationResult[];

  cheapestId: string | null;
}
