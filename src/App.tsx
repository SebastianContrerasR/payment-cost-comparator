import { useCallback, useEffect, useMemo, useState } from "react";
import BreakdownModal from "./components/BreakdownModal/BreakdownModal";
import ComparisonTable, {
  type SortKey,
  type SortState,
} from "./components/ComparisonTable/ComparisonTable";
import InputPanel from "./components/InputPanel/InputPanel";
import PaymentMethodDetails from "./components/PaymentMethodDetails/PaymentMethodDetails";
import paymentMethods from "./data/paymentMethods";
import type { ExchangeRateInput } from "./domain/types";
import { useComparison } from "./hooks/useComparison";
import { useVisibleColumns } from "./hooks/useVisibleColumns";
import { formatUsd } from "./utils/currency";

const DEFAULT_AMOUNT_JPY = 50_000;

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
  const [breakdownId, setBreakdownId] = useState<string | null>(null);
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

  const breakdownResult = useMemo(
    () =>
      breakdownId === null
        ? undefined
        : results.find((result) => result.method.id === breakdownId),
    [results, breakdownId],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setBreakdownId(id);
  }, []);

  const closeBreakdown = useCallback(() => {
    setBreakdownId(null);
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
          selectedResult.status === "ok" ? (
            <PaymentMethodDetails method={selectedResult.method} />
          ) : (
            <section className="card" aria-label="Detalle no disponible">
              <div className="card-head">
                <h2 className="card-title">{selectedResult.method.name}</h2>
                <p className="card-subtitle">{selectedResult.reason}</p>
              </div>
            </section>
          )
        ) : (
          <p className="details-hint">
            Selecciona un método de la tabla para ver su información debajo y
            abrir el desglose del cálculo en un modal.
          </p>
        )}

        <BreakdownModal result={breakdownResult} onClose={closeBreakdown} />
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
