import { useCallback, useEffect, useMemo, useState } from "react";
import ComparisonTable, {
  type SortKey,
  type SortState,
} from "./components/ComparisonTable/ComparisonTable";
import ConfigJsonEditor from "./components/ConfigJsonEditor/ConfigJsonEditor";
import FundingInputs from "./components/FundingInputs/FundingInputs";
import FundingResults from "./components/FundingResults/FundingResults";
import InputPanel, { RATE_KEYS } from "./components/InputPanel/InputPanel";
import BreakdownModal from "./components/BreakdownModal/BreakdownModal";
import PaymentMethodPanel from "./components/PaymentMethodPanel/PaymentMethodPanel";
import paymentMethods from "./data/paymentMethods";
import { isOkResult } from "./domain/calculator";
import type { OkCalculationResult } from "./domain/types";
import { useActiveMethods } from "./hooks/useActiveMethods";
import { useComparison } from "./hooks/useComparison";
import { useFunding } from "./hooks/useFunding";
import { usePurchaseInputs } from "./hooks/usePurchaseInputs";
import { useVisibleColumns } from "./hooks/useVisibleColumns";
import { formatPen, formatUsd } from "./utils/currency";

export default function App() {
  const {
    currency,
    amount,
    exchangeRates,
    setCurrency,
    setAmount,
    setExchangeRate,
    applyPurchaseInputs,
  } = usePurchaseInputs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [breakdownId, setBreakdownId] = useState<string | null>(null);
  const [configMode, setConfigMode] = useState<"form" | "json">("form");
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
  const {
    activeMethodIds,
    toggleMethod,
    selectAllMethods,
    resetMethods,
    setActiveMethods,
  } = useActiveMethods(paymentMethods);

  const comparisonMethods = useMemo(
    () =>
      paymentMethods
        .filter((method) => activeMethodIds.includes(method.id))
        .map((method) => ({ ...method, enabled: true })),
    [activeMethodIds],
  );
  const enabledMethodsCount = useMemo(
    () =>
      comparisonMethods.filter((method) =>
        method.supportedCurrencies.includes(currency),
      ).length,
    [comparisonMethods, currency],
  );

  useEffect(() => {
    if (sort.key !== "name" && !visibleColumns.includes(sort.key)) {
      setSort({ key: "totalUSD", direction: "asc" });
    }
  }, [sort.key, visibleColumns]);

  useEffect(() => {
    if (selectedId !== null && !activeMethodIds.includes(selectedId)) {
      setSelectedId(null);
    }
    if (breakdownId !== null && !activeMethodIds.includes(breakdownId)) {
      setBreakdownId(null);
    }
  }, [activeMethodIds, breakdownId, selectedId]);

  const purchase = useMemo(() => ({ currency, amount }), [currency, amount]);

  const { results, cheapestId } = useComparison(
    comparisonMethods,
    purchase,
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

  return (
    <div className="page">
      <header className="app-header">
        <h1>Comparador de métodos de pago</h1>
        <p className="app-description">
          {currency === "USD"
            ? "Compara el costo efectivo de tarjetas y métodos de pago al comprar en dólares: introduce el monto en USD y consulta cómo influyen las comisiones, el cashback y el tipo de cambio de fondeo en el costo final."
            : "Compara el costo efectivo de tarjetas y métodos de pago al comprar en Japón: introduce el monto en JPY y consulta cómo influyen el tipo de cambio de cada red, las comisiones (FX y cripto), otras comisiones y el cashback en el costo final."}
        </p>
        <div className="chip-row">
          <span className="chip">{`Moneda origen: ${currency}`}</span>
          <span className="chip">Moneda de referencia: USD</span>
          <span className="chip">Métodos habilitados: {enabledMethodsCount}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="config-toolbar">
          <span className="config-toolbar-label">Configuración</span>
          <div
            className="input-mode-toggle"
            role="group"
            aria-label="Modo de edición de configuración"
          >
            <button
              type="button"
              className={`input-mode-option${
                configMode === "form" ? " is-active" : ""
              }`}
              aria-pressed={configMode === "form"}
              onClick={() => setConfigMode("form")}
            >
              Individual
            </button>
            <button
              type="button"
              className={`input-mode-option${
                configMode === "json" ? " is-active" : ""
              }`}
              aria-pressed={configMode === "json"}
              onClick={() => setConfigMode("json")}
            >
              JSON
            </button>
          </div>
        </div>

        {configMode === "json" ? (
          <ConfigJsonEditor
            purchase={{
              currency,
              amount,
              exchangeRates,
              methods: [...activeMethodIds],
            }}
            fundingSettings={funding.settings}
            parseOptions={{
              rateKeys: RATE_KEYS,
              knownMethodIds: paymentMethods.map((method) => method.id),
            }}
            onApply={(update) => {
              applyPurchaseInputs({
                currency: update.purchase.currency,
                amount: update.purchase.amount,
                exchangeRates: update.purchase.exchangeRates,
              });
              setActiveMethods(update.purchase.methods);
              funding.applySettings(update.funding);
            }}
          />
        ) : (
          <>
            <InputPanel
              currency={currency}
              onCurrencyChange={setCurrency}
              amount={amount}
              onAmountChange={setAmount}
              methods={paymentMethods}
              activeMethodIds={activeMethodIds}
              onToggleMethod={toggleMethod}
              onSelectAllMethods={selectAllMethods}
              onResetMethods={resetMethods}
              exchangeRates={exchangeRates}
              onExchangeRateChange={setExchangeRate}
            />

            <FundingInputs model={funding} />
          </>
        )}

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

        <FundingResults model={funding} />

        <ComparisonTable
          purchaseCurrency={currency}
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
