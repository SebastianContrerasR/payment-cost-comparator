import { useCallback, useEffect, useMemo, useState } from "react";
import ComparisonTable, {
  type SortKey,
  type SortState,
} from "./components/ComparisonTable/ComparisonTable";
import FundingPanel from "./components/FundingPanel/FundingPanel";
import InputPanel from "./components/InputPanel/InputPanel";
import BreakdownModal from "./components/BreakdownModal/BreakdownModal";
import PaymentMethodPanel from "./components/PaymentMethodPanel/PaymentMethodPanel";
import paymentMethods from "./data/paymentMethods";
import { isOkResult } from "./domain/calculator";
import type { ExchangeRateInput, OkCalculationResult } from "./domain/types";
import { useComparison } from "./hooks/useComparison";
import { useFunding } from "./hooks/useFunding";
import { useVisibleColumns } from "./hooks/useVisibleColumns";
import { formatPen, formatUsd } from "./utils/currency";

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
  const funding = useFunding(results);

  const bestResult = useMemo<OkCalculationResult | undefined>(
    () =>
      results.filter(isOkResult).reduce<OkCalculationResult | undefined>(
        (best, current) => {
          if (!best) {
            return current;
          }
          return current.breakdown.totalUSD < best.breakdown.totalUSD
            ? current
            : best;
        },
        undefined,
      ),
    [results],
  );

  const penBest = useMemo(() => {
    const candidates: Array<{
      result: OkCalculationResult;
      pen: number;
      cashback: string | null;
    }> = [];
    for (const result of results.filter(isOkResult)) {
      const summary = funding.byMethodId[result.method.id];
      if (!summary || !Number.isFinite(summary.penPerPurchase)) {
        continue;
      }
      candidates.push({
        result,
        pen: summary.penPerPurchase,
        cashback:
          summary.cashbackAmount > 0
            ? `${formatUsd(summary.cashbackAmount, 2)} ${summary.cashbackAsset}`
            : null,
      });
    }
    if (candidates.length === 0) {
      return undefined;
    }
    return candidates.reduce((best, current) =>
      current.pen < best.pen ? current : best,
    );
  }, [results, funding.byMethodId]);

  const bestId =
    (penBest ? penBest.result.method.id : bestResult?.method.id) ?? cheapestId;

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
  }, []);

  const handleOpenBreakdown = useCallback((id: string) => {
    setBreakdownId(id);
  }, []);

  const closeBreakdown = useCallback(() => {
    setBreakdownId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    const previousId = selectedId;
    setSelectedId(null);
    if (previousId && typeof document !== "undefined") {
      window.setTimeout(() => {
        (document.querySelector(
          `[data-method-id="${previousId}"]`,
        ) as HTMLElement | null)?.focus({ preventScroll: true });
      }, 0);
    }
  }, [selectedId]);

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

        <FundingPanel model={funding} />

        {penBest ? (
          <section className="summary-banner" role="status">
            El método con menor desembolso es{" "}
            <strong>{penBest.result.method.name}</strong> con{" "}
            <strong>{formatPen(penBest.pen)}</strong> por compra.
            {penBest.cashback ? (
              <>
                {" "}
                Cashback estimado: <strong>{penBest.cashback}</strong>, para la
                siguiente compra.
              </>
            ) : null}
          </section>
        ) : bestResult ? (
          <section className="summary-banner" role="status">
            El método más económico es <strong>{bestResult.method.name}</strong>{" "}
            con un costo total de{" "}
            <strong>{formatUsd(bestResult.breakdown.totalUSD)}</strong>.
          </section>
        ) : null}

        <ComparisonTable
          results={results}
          cheapestId={bestId}
          funding={funding.byMethodId}
          selectedId={selectedId}
          onSelect={handleSelect}
          onOpenBreakdown={handleOpenBreakdown}
          sort={sort}
          onSortChange={handleSortChange}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleVisibleColumn}
          onSelectAllColumns={showAllColumns}
          onResetColumns={resetVisibleColumns}
        />

        {selectedResult ? (
          <PaymentMethodPanel
            result={selectedResult}
            funding={funding.byMethodId[selectedResult.method.id]}
            isCheapest={selectedResult.method.id === bestId}
            onClose={handleClosePanel}
          />
        ) : (
          <p className="details-hint">
            Selecciona un método de la tabla para ver su información debajo. Usa el
            icono junto al nombre si quieres ver el desglose del cálculo.
          </p>
        )}

        <BreakdownModal
          result={breakdownResult}
          funding={
            breakdownResult && breakdownResult.status === "ok"
              ? funding.byMethodId[breakdownResult.method.id]
              : undefined
          }
          onClose={closeBreakdown}
        />
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
