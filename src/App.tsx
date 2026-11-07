import { useCallback, useEffect, useMemo, useState } from "react";
import ComparisonTable, {
  type SortKey,
  type SortState,
} from "./components/ComparisonTable/ComparisonTable";
import InputPanel from "./components/InputPanel/InputPanel";
import MethodDetailModal from "./components/MethodDetailModal/MethodDetailModal";
import paymentMethods from "./data/paymentMethods";
import type { ExchangeRateInput } from "./domain/types";
import { useComparison } from "./hooks/useComparison";
import { useVisibleColumns } from "./hooks/useVisibleColumns";
import { formatUsd } from "./utils/currency";

const DEFAULT_AMOUNT_JPY = 50_000;

/** Tipos de cambio por defecto: referencias del Excel (JPY por USD). */
const DEFAULT_EXCHANGE_RATES: ExchangeRateInput = {
  visa: 157.710157,
  mastercard: 157.51008064,
  paypay: 157.71524839,
};

export default function App() {
  const [amountJPY, setAmountJPY] = useState<number | null>(DEFAULT_AMOUNT_JPY);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateInput>(
    DEFAULT_EXCHANGE_RATES,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({
    key: "totalUSD",
    direction: "asc",
  });
  const {
    visibleColumns,
    toggleColumn: toggleVisibleColumn,
    selectAll: showAllColumns,
    reset: resetVisibleColumns,
  } = useVisibleColumns();

  // Si se oculta la columna por la que se ordena, se vuelve a Total ascendente.
  useEffect(() => {
    if (sort.key !== "name" && !visibleColumns.includes(sort.key)) {
      setSort({ key: "totalUSD", direction: "asc" });
    }
  }, [sort.key, visibleColumns]);

  const { results, cheapestId } = useComparison(
    paymentMethods,
    amountJPY,
    exchangeRates,
  );

  const cheapestResult = useMemo(
    () =>
      cheapestId === null
        ? undefined
        : results.find(
            (result) => result.status === "ok" && result.method.id === cheapestId,
          ),
    [results, cheapestId],
  );

  const selectedResult = useMemo(
    () =>
      selectedId === null
        ? undefined
        : results.find((result) => result.method.id === selectedId),
    [results, selectedId],
  );

  const handleSelect = useCallback((id: string) => {
    // Cualquier clic en un método (fila o nombre) abre su modal de detalle.
    setSelectedId(id);
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleSortChange = useCallback((key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? {
            key,
            direction: previous.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  }, []);

  const handleExchangeRateChange = useCallback(
    (key: string, value: number | null) => {
      setExchangeRates((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  return (
    <div className="page">
      <header className="app-header">
        <h1>Comparador de métodos de pago</h1>
        <p className="app-description">
          Compara el costo efectivo de tarjetas y métodos de pago al comprar en
          Japón: introduce el monto en JPY y consulta cómo influyen el tipo de
          cambio de cada red, las comisiones (FX y cripto), otras comisiones y
          el cashback en el costo final.
        </p>
        <div className="chip-row">
          <span className="chip">Moneda origen: JPY</span>
          <span className="chip">Moneda de referencia: USD</span>
          <span className="chip">
            Métodos habilitados:{" "}
            {paymentMethods.filter((method) => method.enabled).length}
          </span>
        </div>
      </header>

      <main className="app-main">
        <InputPanel
          amountJPY={amountJPY}
          onAmountChange={setAmountJPY}
          exchangeRates={exchangeRates}
          onExchangeRateChange={handleExchangeRateChange}
        />

        {cheapestResult && cheapestResult.status === "ok" ? (
          <section className="summary-banner" role="status">
            El método más económico es{" "}
            <strong>{cheapestResult.method.name}</strong> con un costo total de{" "}
            <strong>{formatUsd(cheapestResult.breakdown.totalUSD)}</strong>.
          </section>
        ) : null}

        <ComparisonTable
          results={results}
          cheapestId={cheapestId}
          selectedId={selectedId}
          onSelect={handleSelect}
          sort={sort}
          onSortChange={handleSortChange}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleVisibleColumn}
          onSelectAllColumns={showAllColumns}
          onResetColumns={resetVisibleColumns}
        />

        {selectedResult ? (
          <MethodDetailModal result={selectedResult} onClose={closeDetails} />
        ) : (
          <p className="details-hint">
            Selecciona un método de la tabla para abrir un panel con su
            información, requisitos y el desglose del cálculo.
          </p>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Los escenarios se basan en la configuración registrada en{" "}
          <code>src/data/paymentMethods.ts</code> (documentación de cada
          proveedor y hoja de referencia). Verifica siempre las condiciones
          oficiales antes de pagar.
        </p>
      </footer>
    </div>
  );
}
