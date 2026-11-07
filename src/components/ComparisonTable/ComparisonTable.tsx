import { useMemo } from "react";
import type { CalculationResult, OkCalculationResult } from "../../domain/types";
import { formatPercent, formatRate, formatUsd } from "../../utils/currency";

export type SortDirection = "asc" | "desc";

export type SortKey =
  | "name"
  | "network"
  | "exchangeRate"
  | "baseAmountUSD"
  | "fxFee"
  | "afterFxUSD"
  | "cryptoFee"
  | "otherFees"
  | "totalBeforeCashbackUSD"
  | "cashbackRate"
  | "cashbackCapUSD"
  | "potentialCashbackUSD"
  | "effectiveCashbackUSD"
  | "totalUSD";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface ColumnDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
}

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Forma de pago", align: "left" },
  { key: "network", label: "Marca", align: "left" },
  { key: "exchangeRate", label: "Tipo de cambio", align: "right" },
  { key: "baseAmountUSD", label: "Monto base", align: "right" },
  { key: "fxFee", label: "FX fee", align: "right" },
  { key: "afterFxUSD", label: "Monto con FX", align: "right" },
  { key: "cryptoFee", label: "Crypto fee", align: "right" },
  { key: "otherFees", label: "Otras comisiones", align: "left" },
  {
    key: "totalBeforeCashbackUSD",
    label: "Monto con comisiones",
    align: "right",
  },
  { key: "cashbackRate", label: "Cashback", align: "right" },
  { key: "cashbackCapUSD", label: "Límite cashback", align: "right" },
  {
    key: "potentialCashbackUSD",
    label: "Cashback potencial",
    align: "right",
  },
  {
    key: "effectiveCashbackUSD",
    label: "Cashback efectivo",
    align: "right",
  },
  { key: "totalUSD", label: "Total", align: "right" },
];

interface ComparisonTableProps {
  results: CalculationResult[];
  cheapestId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
}

function otherFeesTotalUSD(row: OkCalculationResult): number {
  return row.breakdown.otherFeeLines.reduce(
    (sum, line) => sum + line.costUSD,
    0,
  );
}

/** Accesor de orden por columna; los campos sin límite se ordenan como ∞. */
const SORT_ACCESSORS: Record<
  SortKey,
  (row: OkCalculationResult) => number | string
> = {
  name: (row) => row.method.name.toLowerCase(),
  network: (row) => row.method.network.toLowerCase(),
  exchangeRate: (row) => row.breakdown.exchangeRate,
  baseAmountUSD: (row) => row.breakdown.baseAmountUSD,
  fxFee: (row) => row.method.fees.fxFee,
  afterFxUSD: (row) => row.breakdown.afterFxUSD,
  cryptoFee: (row) => row.method.fees.cryptoFee,
  otherFees: otherFeesTotalUSD,
  totalBeforeCashbackUSD: (row) => row.breakdown.totalBeforeCashbackUSD,
  cashbackRate: (row) => row.method.cashback.rate,
  cashbackCapUSD: (row) => row.method.cashback.cap ?? Number.POSITIVE_INFINITY,
  potentialCashbackUSD: (row) => row.breakdown.potentialCashbackUSD,
  effectiveCashbackUSD: (row) => row.breakdown.effectiveCashbackUSD,
  totalUSD: (row) => row.breakdown.totalUSD,
};

/** Ordena los resultados; las filas con error siempre van al final. */
export function sortResults(
  results: CalculationResult[],
  sort: SortState,
): CalculationResult[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...results].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "ok" ? -1 : 1;
    }
    if (a.status !== "ok" || b.status !== "ok") {
      return 0;
    }
    const valueA = SORT_ACCESSORS[sort.key](a);
    const valueB = SORT_ACCESSORS[sort.key](b);
    let comparison: number;
    if (typeof valueA === "string" || typeof valueB === "string") {
      comparison = String(valueA).localeCompare(String(valueB), "es");
    } else {
      comparison = valueA - valueB;
    }
    if (comparison !== 0) {
      return comparison * sign;
    }
    // Desempate estable: costo final ascendente y luego el nombre.
    const fallbackTotal = a.breakdown.totalUSD - b.breakdown.totalUSD;
    return fallbackTotal !== 0
      ? fallbackTotal
      : a.method.name.localeCompare(b.method.name, "es");
  });
}

function formatFeeRule(rule: OkCalculationResult["breakdown"]["otherFeeLines"][number]["rule"]): string {
  return rule.type === "percentage"
    ? `${formatPercent(rule.value)}`
    : `${formatUsd(rule.value, 2)} fija`;
}

/** C. Tabla comparativa: una fila por método, con orden por costo final. */
export function ComparisonTable({
  results,
  cheapestId,
  selectedId,
  onSelect,
  sort,
  onSortChange,
}: ComparisonTableProps) {
  const sortedRows = useMemo(
    () => sortResults(results, sort),
    [results, sort],
  );

  const renderCell = (column: ColumnDef, row: OkCalculationResult) => {
    const { breakdown, method } = row;
    switch (column.key) {
      case "name":
        return (
          <div className="cell-name">
            <button
              type="button"
              className="method-link"
              aria-pressed={selectedId === method.id}
              onClick={() => onSelect(method.id)}
            >
              {method.name}
            </button>
            {cheapestId === method.id ? (
              <span className="chip chip-cheap">Más barato</span>
            ) : null}
            <span className="cell-sub">{method.provider}</span>
          </div>
        );
      case "network":
        return method.network;
      case "exchangeRate":
        return formatRate(breakdown.exchangeRate);
      case "baseAmountUSD":
        return formatUsd(breakdown.baseAmountUSD);
      case "fxFee":
        return formatPercent(method.fees.fxFee);
      case "afterFxUSD":
        return formatUsd(breakdown.afterFxUSD);
      case "cryptoFee":
        return formatPercent(method.fees.cryptoFee);
      case "otherFees":
        return breakdown.otherFeeLines.length === 0 ? (
          <span className="cell-muted">—</span>
        ) : (
          <div className="cell-fees">
            {breakdown.otherFeeLines.map((line) => (
              <span key={line.rule.id} className="chip chip-fee">
                {line.rule.name} {formatFeeRule(line.rule)}
              </span>
            ))}
          </div>
        );
      case "totalBeforeCashbackUSD":
        return formatUsd(breakdown.totalBeforeCashbackUSD);
      case "cashbackRate":
        return formatPercent(method.cashback.rate);
      case "cashbackCapUSD":
        return method.cashback.cap === null ? (
          <span className="cell-muted">Ilimitado</span>
        ) : (
          formatUsd(method.cashback.cap, 2)
        );
      case "potentialCashbackUSD":
        return formatUsd(breakdown.potentialCashbackUSD);
      case "effectiveCashbackUSD":
        return formatUsd(breakdown.effectiveCashbackUSD);
      case "totalUSD":
        return <strong>{formatUsd(breakdown.totalUSD)}</strong>;
    }
  };

  return (
    <section className="card table-card" aria-label="Tabla comparativa">
      <div className="table-scroll">
        <table className="comparison-table">
          <caption className="visually-hidden">
            Métodos de pago con su desglose de comisiones, cashback y costo total
            en USD
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`col-${column.align}${
                    column.key === "totalUSD" ? " col-total" : ""
                  }`}
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="th-sort"
                    onClick={() => onSortChange(column.key)}
                  >
                    <span>{column.label}</span>
                    <span
                      className={`sort-indicator${
                        sort.key === column.key ? " is-active" : ""
                      }`}
                      aria-hidden="true"
                    >
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) =>
              row.status === "ok" ? (
                <tr
                  key={row.method.id}
                  className={
                    [
                      cheapestId === row.method.id ? "row-cheapest" : "",
                      selectedId === row.method.id ? "row-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  aria-selected={selectedId === row.method.id}
                  onClick={() => onSelect(row.method.id)}
                >
                  {COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`col-${column.align}${
                        column.key === "totalUSD" ? " col-total" : ""
                      }`}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ) : (
                <tr key={row.method.id} className="row-error">
                  <td colSpan={COLUMNS.length} className="cell-error">
                    {row.method.name}: no se puede calcular — {row.reason}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ComparisonTable;
