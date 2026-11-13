export const PURCHASE_CURRENCIES = ["JPY", "USD"] as const;
export type PurchaseCurrency = (typeof PURCHASE_CURRENCIES)[number];

export interface PurchaseInput {
  currency: PurchaseCurrency;
  amount: number | null;
}

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

export interface CashbackTier {
  id: string;
  label: string;
  minAmountUSD: number;
  rate: number;
  cap: number | null;
}

export interface CashbackConfig {

  rate: number;

  cap: number | null;

  tiers?: CashbackTier[];

  currency: string;

  timing?: string;

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
  supportedCurrencies: PurchaseCurrency[];
  enabled: boolean;
  fees: FeesConfig;
  cashback: CashbackConfig;
  funding: FundingRequirement | null;
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
  purchaseCurrency: PurchaseCurrency;
  amountOriginal: number;
  exchangeRate: number | null;

  baseAmountUSD: number;

  afterFxUSD: number;
  fxFeeCostUSD: number;

  afterCryptoUSD: number;
  cryptoFeeCostUSD: number;

  otherFeeLines: OtherFeeLine[];
  otherFeesCostUSD: number;

  totalBeforeCashbackUSD: number;

  cashbackRate: number;
  cashbackTierLabel: string | null;
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

export type Asset =
  | "PEN"
  | "USD"
  | "USDT"
  | "USDT0"
  | "USDC"
  | "USDG"
  | "U";

export type FundingCostType = "fixed" | "percent";

export type FundingCostMode = "deducted_from_amount" | "charged_on_top";

export interface FundingCost {
  id: string;
  label: string;
  type: FundingCostType;
  value: number;
  currency: Asset;
  mode: FundingCostMode;
}

export interface FundingSource {
  id: string;
  platform: string;
  label: string;
  penPerUsdt: number;
  rateLabel?: string;
  fee: FundingCost | null;
  to: string;
  enabled: boolean;
  updatedAt?: string;
  notes?: string[];
  source?: PaymentMethodSource;
}

export interface NetworkFee {
  network: string;
  networkId: string;
  asset: "USDT" | "USDT0";
  depositFee: number;
  minDeposit: number | null;
  withdrawFee: number;
  minWithdraw: number;
  canDeposit: boolean;
  canWithdraw: boolean;
  feeTreatment: FundingCostMode;
}

export interface PlatformFees {
  platform: string;
  label: string;
  checkedAt: string;
  source: PaymentMethodSource;
  networks: NetworkFee[];
}

export type FundingStepKind = "transfer" | "convert";

export interface FundingStep {
  id: string;
  kind: FundingStepKind;
  label: string;
  from: string;
  to: string;
  network?: "auto" | string;
  cost?: FundingCost;
  conversionRate?: number;
  toAsset?: Asset;
  enabled?: boolean;
  notes?: string[];
  source?: PaymentMethodSource;
}

export interface FundingRoute {
  id: string;
  label: string;
  sourceId: string;
  asset?: Asset;
  steps: FundingStep[];
  enabled: boolean;
  notes?: string[];
}

export interface FundingRequirement {
  account: string;
  asset: Asset;
}

export interface NetworkQuote {
  network: string;
  networkId: string;
  asset: Asset;
  fee: number;
  minWithdraw: number;
  minDeposit: number | null;
  usable: boolean;
  reason?: string;
}

export interface NetworkChoice {
  network: string;
  networkId: string;
  asset: Asset;
  fee: number;
  candidates: NetworkQuote[];
}

export interface FundingStepResult {
  id: string;
  label: string;
  kind: FundingStepKind;
  from: string;
  to: string;
  inputAmount: number;
  outputAmount: number;
  costAmount: number;
  asset: Asset;
  network: string | null;
  notes: string[];
  candidates: NetworkQuote[];
}

export interface FundingResult {
  routeId: string;
  routeLabel: string;
  sourceId: string;
  sourceLabel: string;
  destinationPlatform: string;
  targetAsset: Asset;
  targetAmount: number;
  initialPenRequired: number;
  acquiredUsdt: number;
  finalAmountReceived: number;
  effectivePenPerUnit: number;
  transferNetwork?: string;
  transferFee?: number;
  conversionCosts: number;
  steps: FundingStepResult[];
  purchases: number;
  penPerUsdt: number;
}

export type FundingCalculation =
  | { status: "ok"; result: FundingResult }
  | { status: "error"; routeId: string; reason: string };

export interface FundingSummary extends FundingResult {
  methodId: string;
  methodName: string;
  cashbackAmount: number;
  cashbackAsset: string;
  cashbackValuePen: number | null;
  netEconomicCostPen: number | null;
  penPerPurchase: number;
}
