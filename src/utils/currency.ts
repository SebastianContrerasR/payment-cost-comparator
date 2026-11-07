/**
 * Utilidades de formateo y redondeo.
 *
 * El motor de cálculo trabaja con precisión completa (sin redondeos
 * intermedios); aquí se aplica el redondeo único al **mostrar** resultados y
 * se normalizan los importes para que JPY y USD se distingan claramente.
 *
 * Convención numérica (igual que el Excel de referencia): separador de miles
 * "," y punto decimal, con 4 decimales por defecto para importes en USD.
 */

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

/** Importe en USD con prefijo "$". Por defecto 4 decimales, como el Excel. */
export function formatUsd(value: number, decimals = 4): string {
  return `$${usdFormatter(decimals).format(value)}`;
}

/** Importe en JPY con separador de miles y sin decimales. */
export function formatJpy(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} JPY`;
}

/** Porcentaje a partir de una fracción: 0.02 → "2.00%". */
export function formatPercent(fraction: number, decimals = 2): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fraction * 100)}%`;
}

/**
 * Tipo de cambio con hasta 8 decimales, sin ceros finales:
 * 157.710157 → "157.710157"; 157.51008064 → "157.51008064".
 */
export function formatRate(value: number, maxDecimals = 8): string {
  const fixed = value.toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

/**
 * Redondeo estable para mostrar resultados o escribir aserciones.
 *
 * Estrategia consistente contra el error de punto flotante: se desplaza el
 * punto decimal en notación exponencial, se redondea una vez y se vuelve a
 * desplazar. También normaliza `-0` a `0`.
 */
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
