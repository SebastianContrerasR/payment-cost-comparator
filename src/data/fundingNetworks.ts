import type { NetworkFee, PlatformFees } from "../domain/types";

const NETWORK_DEFAULTS = {
  depositFee: 0,
  minDeposit: null,
  canDeposit: true,
  canWithdraw: true,
} as const;

const binanceNetworks: NetworkFee[] = [
  { ...NETWORK_DEFAULTS, network: "BEP20", networkId: "bep20", asset: "USDT", withdrawFee: 0.01, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Plasma", networkId: "plasma", asset: "USDT", withdrawFee: 0.012, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "opBNB", networkId: "opbnb", asset: "USDT", withdrawFee: 0.015, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Kaia", networkId: "kaia", asset: "USDT", withdrawFee: 0.02, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Polygon POS", networkId: "polygon", asset: "USDT", withdrawFee: 0.03, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "AVAX C-Chain", networkId: "avaxc", asset: "USDT", withdrawFee: 0.04, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Optimism", networkId: "optimism", asset: "USDT", withdrawFee: 0.04, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "CELO", networkId: "celo", asset: "USDT", withdrawFee: 0.05, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Aptos", networkId: "aptos", asset: "USDT", withdrawFee: 0.1, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Asset Hub Polkadot", networkId: "assethub", asset: "USDT", withdrawFee: 0.1, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Scroll", networkId: "scroll", asset: "USDT", withdrawFee: 0.1, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Tezos", networkId: "tezos", asset: "USDT", withdrawFee: 0.1, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "NEAR", networkId: "near", asset: "USDT", withdrawFee: 0.2, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "KAVAEVM", networkId: "kavaevm", asset: "USDT", withdrawFee: 0.2, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Arbitrum One", networkId: "arbitrum", asset: "USDT", withdrawFee: 0.3, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "TON", networkId: "ton", asset: "USDT", withdrawFee: 0.3, minWithdraw: 3, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "ERC20", networkId: "ethereum", asset: "USDT", withdrawFee: 0.6, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Solana", networkId: "solana", asset: "USDT", withdrawFee: 0.7, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "TRC20", networkId: "tron", asset: "USDT", withdrawFee: 2, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
];

const okxNetworks: NetworkFee[] = [
  { ...NETWORK_DEFAULTS, network: "Plasma", networkId: "plasma", asset: "USDT0", withdrawFee: 0.000003, minWithdraw: 5, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Berachain", networkId: "berachain", asset: "USDT0", withdrawFee: 0.000026, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Tempo", networkId: "tempo", asset: "USDT", withdrawFee: 0.000061, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Monad", networkId: "monad", asset: "USDT0", withdrawFee: 0.00052, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Aptos", networkId: "aptos", asset: "USDT", withdrawFee: 0.00071, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "X Layer", networkId: "xlayer", asset: "USDT0", withdrawFee: 0.0022, minWithdraw: 0.004, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Arbitrum One", networkId: "arbitrum", asset: "USDT0", withdrawFee: 0.0033, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Polygon", networkId: "polygon", asset: "USDT0", withdrawFee: 0.0083, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Unichain", networkId: "unichain", asset: "USDT0", withdrawFee: 0.0096, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "TON", networkId: "ton", asset: "USDT", withdrawFee: 0.013, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Optimism", networkId: "optimism", asset: "USDT", withdrawFee: 0.018, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Optimism (USDT0)", networkId: "optimism", asset: "USDT0", withdrawFee: 0.018, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Avalanche C-Chain", networkId: "avaxc", asset: "USDT", withdrawFee: 0.2, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Solana", networkId: "solana", asset: "USDT", withdrawFee: 0.24, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "ERC20", networkId: "ethereum", asset: "USDT", withdrawFee: 0.3, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "TRC20", networkId: "tron", asset: "USDT", withdrawFee: 2, minWithdraw: 10, feeTreatment: "deducted_from_amount" },
];

const mexcNetworks: NetworkFee[] = [
  { ...NETWORK_DEFAULTS, network: "BEP20", networkId: "bep20", asset: "USDT", withdrawFee: 0.01, minWithdraw: 0.2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Conflux eSpace", networkId: "conflux", asset: "USDT", withdrawFee: 0.01, minWithdraw: 1, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Arbitrum", networkId: "arbitrum", asset: "USDT", withdrawFee: 0.05, minWithdraw: 1, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Solana", networkId: "solana", asset: "USDT", withdrawFee: 0.26, minWithdraw: 10, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "ERC20", networkId: "ethereum", asset: "USDT", withdrawFee: 0.3, minWithdraw: 8, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Polkadot AssetHub", networkId: "assethub", asset: "USDT", withdrawFee: 1, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "Kaia", networkId: "kaia", asset: "USDT", withdrawFee: 1, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
  { ...NETWORK_DEFAULTS, network: "TRC20", networkId: "tron", asset: "USDT", withdrawFee: 1.2, minWithdraw: 2, feeTreatment: "deducted_from_amount" },
];

const fundingPlatforms: PlatformFees[] = [
  {
    platform: "binance",
    label: "Binance",
    checkedAt: "2026-11-09",
    source: {
      label: "Binance — comisiones de retiro cripto",
      url: "https://www.binance.com/en/fee/cryptoFee",
    },
    networks: binanceNetworks,
  },
  {
    platform: "okx",
    label: "OKX",
    checkedAt: "2026-11-09",
    source: {
      label: "OKX — comisiones de retiro",
      url: "https://www.okx.com/fees/withdrawal-info",
    },
    networks: okxNetworks,
  },
  {
    platform: "mexc",
    label: "MEXC",
    checkedAt: "2026-11-09",
    source: {
      label: "MEXC — comisiones de retiro",
      url: "https://www.mexc.com/fee",
    },
    networks: mexcNetworks,
  },
];

export const PLATFORM_LABELS: Record<string, string> = {
  binance: "Binance",
  okx: "OKX",
  mexc: "MEXC",
  io: "IO",
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export default fundingPlatforms;
