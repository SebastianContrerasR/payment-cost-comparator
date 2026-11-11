const usdFormatters = new Map<number, Intl.NumberFormat>();

function usdFormatter(decimals: number): Intl.NumberFormat {
  let formatter = usdFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    usdFormatters.set(decimals, formatter);
  }
  return formatter;
}

export function formatUsd(value: number, decimals = 4): string {
  return `$${usdFormatter(decimals).format(value)}`;
}

export function formatJpy(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} JPY`;
}

export function formatPercent(fraction: number, decimals = 2): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fraction * 100)}%`;
}

export function formatPen(value: number, decimals = 2): string {
  return `S/ ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}`;
}

export function formatRate(value: number, maxDecimals = 8): string {
  const fixed = value.toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const shifted = Number(`${value}e${decimals}`);
  if (!Number.isFinite(shifted)) {
    return value;
  }
  const rounded = Math.round(shifted);
  if (rounded === 0) {
    return 0;
  }
  return Number(`${rounded}e${-decimals}`);
}
