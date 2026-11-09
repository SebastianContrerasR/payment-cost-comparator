import { useMemo } from "react";
import type { CalculationResult, OkCalculationResult } from "../../domain/types";
import { formatPercent, formatRate, formatUsd } from "../../utils/currency";
import { ColumnPicker, type ColumnPickerTarget } from "./ColumnPicker";

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

type ColumnGroup = "identity" | "conversion" | "fees" | "cashback" | "result";

const COLUMN_GROUPS: readonly { id: ColumnGroup; label: string }[] = [
  { id: "identity", label: "Identidad" },
  { id: "conversion", label: "Conversión" },
  { id: "fees", label: "Comisiones" },
  { id: "cashback", label: "Cashback" },
  { id: "result", label: "Resultado" },
];

interface ColumnDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
  group: ColumnGroup;

  description?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Método", align: "left", group: "identity" },
  { key: "network", label: "Marca", align: "left", group: "identity" },
  {
    key: "exchangeRate",
    label: "TC",
    align: "right",
    group: "conversion",
    description: "Tipo de cambio: JPY por USD",
  },
  {
    key: "baseAmountUSD",
    label: "Base (USD)",
    align: "right",
    group: "conversion",
  },
  {
    key: "fxFee",
    label: "FX",
    align: "right",
    group: "fees",
    description: "FX fee: comisión por cambio de divisa",
  },
  { key: "afterFxUSD", label: "Con FX", align: "right", group: "fees" },
  {
    key: "cryptoFee",
    label: "Crypto",
    align: "right",
    group: "fees",
    description: "Crypto fee: comisión de conversión de criptomonedas a fiat",
  },
  {
    key: "otherFees",
    label: "Otras comisiones",
    align: "left",
    group: "fees",
  },
  {
    key: "totalBeforeCashbackUSD",
    label: "Con comisiones",
    align: "right",
    group: "fees",
  },
  {
    key: "cashbackRate",
    label: "Cashback %",
    align: "right",
    group: "cashback",
  },
  { key: "cashbackCapUSD", label: "Límite", align: "right", group: "cashback" },
  {
    key: "potentialCashbackUSD",
    label: "Potencial",
    align: "right",
    group: "cashback",
  },
  {
    key: "effectiveCashbackUSD",
    label: "Efectivo",
    align: "right",
    group: "cashback",
  },
  { key: "totalUSD", label: "Total", align: "right", group: "result" },
];

export const DEFAULT_VISIBLE_COLUMNS: SortKey[] = [
  "name",
  "totalBeforeCashbackUSD",
  "effectiveCashbackUSD",
  "totalUSD",
];

export const ALL_COLUMN_KEYS: readonly SortKey[] = COLUMNS.map(
  (column) => column.key,
);

interface ComparisonTableProps {
  results: CalculationResult[];
  cheapestId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenBreakdown: (id: string) => void;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  visibleColumns: readonly SortKey[];
  onToggleColumn: (key: SortKey) => void;
  onSelectAllColumns: () => void;
  onResetColumns: () => void;
}

function otherFeesTotalUSD(row: OkCalculationResult): number {
  return row.breakdown.otherFeeLines.reduce(
    (sum, line) => sum + line.costUSD,
    0,
  );
}

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

    const fallbackTotal = a.breakdown.totalUSD - b.breakdown.totalUSD;
    return fallbackTotal !== 0
      ? fallbackTotal
      : a.method.name.localeCompare(b.method.name, "es");
  });
}

function BreakdownIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 3.5h10v17l-1.7-1.3-1.7 1.3-1.6-1.3-1.7 1.3-1.6-1.3L7 20.5v-17z" />
      <path d="M9.2 7.5h5.6" />
      <path d="M9.2 10.2h3.4" />
      <path d="M9.2 12.9h4.2" />
    </svg>
  );
}

function formatFeeRule(
  rule: OkCalculationResult["breakdown"]["otherFeeLines"][number]["rule"],
): string {
  return rule.type === "percentage"
    ? `${formatPercent(rule.value)}`
    : `${formatUsd(rule.value, 2)} fija`;
}

export function ComparisonTable({
  results,
  cheapestId,
  selectedId,
  onSelect,
  onOpenBreakdown,
  sort,
  onSortChange,
  visibleColumns,
  onToggleColumn,
  onSelectAllColumns,
  onResetColumns,
}: ComparisonTableProps) {
  const sortedRows = useMemo(() => sortResults(results, sort), [results, sort]);

  const columns = useMemo(
    () =>
      COLUMNS.filter(
        (column) => column.key === "name" || visibleColumns.includes(column.key),
      ),
    [visibleColumns],
  );

  const pickerColumns: ColumnPickerTarget[] = useMemo(
    () => COLUMNS.filter((column) => column.key !== "name"),
    [],
  );

  const renderCell = (column: ColumnDef, row: OkCalculationResult) => {
    const { breakdown, method } = row;
    switch (column.key) {
      case "name":
        return (
          <div className="cell-name">
            <div className="cell-name-row">
              <button
                type="button"
                className="method-link"
                data-method-id={method.id}
                aria-pressed={selectedId === method.id}
                onClick={() => onSelect(method.id)}
              >
                {method.name}
              </button>
              <button
                type="button"
                className="breakdown-icon-btn"
                aria-label={`Ver desglose de ${method.name}`}
                title={`Ver desglose de ${method.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenBreakdown(method.id);
                }}
              >
                <BreakdownIcon />
              </button>
            </div>
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
      <div className="table-toolbar">
        <p className="table-units">
          Importes en USD · tipo de cambio en JPY/USD
        </p>
        <ColumnPicker
          columns={pickerColumns}
          visible={visibleColumns}
          onToggle={onToggleColumn}
          onSelectAll={onSelectAllColumns}
          onReset={onResetColumns}
        />
      </div>
      <div className="table-scroll">
        <table className="comparison-table">
          <caption className="visually-hidden">
            Métodos de pago con su desglose de comisiones, cashback y costo total
            USD
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={[
                    `col-${column.align}`,
                    column.key === "name" ? "col-first" : "",
                    column.key === "totalUSD" ? "col-total" : "",
                    `th-group-${column.group}`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                    title={column.description}
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
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`col-${column.align}${
                        column.key === "totalUSD" ? " col-total" : ""
                      }${column.key === "name" ? " col-first" : ""}`}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ) : (
                <tr key={row.method.id} className="row-error">
                  <td colSpan={columns.length} className="cell-error">
                    {row.method.name}: no se puede calcular — {row.reason}{" "}
                    <button
                      type="button"
                      className="breakdown-icon-btn"
                      aria-label={`Ver desglose de ${row.method.name}`}
                      title={`Ver desglose de ${row.method.name}`}
                      onClick={() => onOpenBreakdown(row.method.id)}
                    >
                      <BreakdownIcon />
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <div className="table-legend" aria-label="Leyenda de grupos de columnas">
        {COLUMN_GROUPS.map((group) => (
          <span key={group.id} className="legend-chip">
            <span
              className={`legend-dot legend-dot--${group.id}`}
              aria-hidden="true"
            />
            <span>{group.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

export default ComparisonTable;
