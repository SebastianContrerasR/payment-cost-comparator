import { useState } from "react";
import { isCardFunding } from "../../domain/funding";
import type { FundingCalculation, NetworkQuote } from "../../domain/types";
import type {
  FundingMethodView,
  FundingModel,
  FundingOptionView,
  FundingSourceView,
} from "../../hooks/useFunding";
import FundingRouteBreakdown from "../FundingRouteBreakdown/FundingRouteBreakdown";
import {
  formatPen,
  formatPercent,
  formatRate,
  formatUsd,
} from "../../utils/currency";

interface FundingPanelProps {
  model: FundingModel;
}

function toNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function SourceRow({
  source,
  onRateChange,
  onFeeChange,
  onToggle,
}: {
  source: FundingSourceView;
  onRateChange: (value: number | null) => void;
  onFeeChange: (value: number | null) => void;
  onToggle: () => void;
}) {
  return (
    <div className="funding-row">
      <div className="funding-row-main">
        <span className="funding-name">{source.label}</span>
        <span className="cell-sub">
          {source.platformLabel}
          {source.updatedAt ? ` · actualizada ${source.updatedAt}` : ""}
        </span>
      </div>
      <label className="funding-field">
        <span>{source.rateLabel ?? "Cambio (S/ por USDT)"}</span>
        <input
          className={`field-input${
            source.penPerUsdt === null ? " field-input-empty" : ""
          }`}
          type="number"
          inputMode="decimal"
          step="0.0001"
          value={source.penPerUsdt ?? ""}
          aria-label={`Cambio de ${source.label}`}
          onChange={(event) => onRateChange(toNumber(event.target.value))}
        />
      </label>
      <label className="funding-field">
        <span>Comisión ({source.feeUnit})</span>
        <input
          className={`field-input${
            source.feeValue === null ? " field-input-empty" : ""
          }`}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={source.feeValue ?? ""}
          aria-label={`Comisión de ${source.label}`}
          onChange={(event) => onFeeChange(toNumber(event.target.value))}
        />
      </label>
      <label className="funding-toggle">
        <input
          type="checkbox"
          checked={source.enabled}
          onChange={onToggle}
          aria-label={`Usar ${source.label} en las rutas`}
        />
        <span>{source.enabled ? "Activa" : "Inactiva"}</span>
      </label>
    </div>
  );
}

function netPenOf(view: FundingMethodView): number | null {
  return view.best
    ? view.best.penPerPurchase -
        view.best.cashbackAmount * view.best.effectivePenPerUnit
    : null;
}

function MethodRow({
  view,
  isWinner,
  isLowestNet,
  onOpenBreakdown,
}: {
  view: FundingMethodView;
  isWinner: boolean;
  isLowestNet: boolean;
  onOpenBreakdown?: () => void;
}) {
  const { best } = view;
  const netPen = netPenOf(view);
  const isCreditCard = view.targetAsset === "USD";
  return (
    <div
      className={`funding-table-row${
        isWinner ? " funding-table-row--best" : ""
      }${isCreditCard ? " funding-table-row--credit" : ""}`}
      role="row"
      aria-label={isWinner ? `${view.methodName}, más barato` : undefined}
    >
      <span role="cell" data-label="Destino">
        <span className="funding-name">{view.methodName}</span>
        {isWinner ? <span className="chip chip-cheap">Más barato</span> : null}
        <span className="cell-sub">{view.platformLabel}</span>
      </span>
      <span role="cell" data-label="Saldo requerido">
        {formatUsd(view.targetAmount, 2)} {view.targetAsset}
      </span>
      <span role="cell" data-label="Ruta elegida">
        {best ? best.routeLabel : "Sin ruta de fondeo disponible"}
        {onOpenBreakdown ? (
          <button
            type="button"
            className="funding-breakdown-btn"
            aria-label={`Ver desglose de la ruta de ${view.methodName}`}
            onClick={onOpenBreakdown}
          >
            Ver desglose
          </button>
        ) : null}
      </span>
      <span role="cell" data-label="Red">
        {best?.transferNetwork ?? (best ? "Sin transferencia" : "—")}
      </span>
      <span role="cell" data-label="Desembolso">
        {best ? formatPen(best.penPerPurchase) : "—"}
      </span>
      <span role="cell" data-label="Cashback">
        {best ? (
          <>
            {formatUsd(best.cashbackAmount, 2)} {best.cashbackAsset}
            {view.cashbackTiming ? (
              <span className="cell-sub">{view.cashbackTiming}</span>
            ) : null}
          </>
        ) : (
          "—"
        )}
      </span>
      <span role="cell" data-label="Costo neto">
        {netPen === null ? (
          "—"
        ) : isLowestNet ? (
          <strong className="funding-net-lowest">{formatPen(netPen)}</strong>
        ) : (
          formatPen(netPen)
        )}
      </span>
      <span role="cell" data-label="Tipo de cambio efectivo">
        {best
          ? `${formatRate(best.effectivePenPerUnit)} S/ por ${view.targetAsset}`
          : "—"}
      </span>
    </div>
  );
}

function OptionItem({
  option,
  onNetworkOverride,
  onOpenBreakdown,
}: {
  option: FundingOptionView;
  onNetworkOverride: (routeId: string, networkId: string | null) => void;
  onOpenBreakdown: () => void;
}) {
  const calculation = option.calculation;
  const transferNetwork =
    calculation.status === "ok"
      ? calculation.result.transferNetwork
      : undefined;
  const networkLabel =
    calculation.status === "ok"
      ? calculation.result.transferNetwork ?? "Sin transferencia"
      : null;
  const networkQuote =
    transferNetwork === undefined
      ? undefined
      : option.candidates.find(
          (candidate) =>
            candidate.usable && candidate.network === transferNetwork,
        );

  return (
    <li className="funding-option">
      <div className="funding-option-head">
        <span className="funding-name">{option.label}</span>
        {calculation.status === "ok" ? (
          <span className="funding-option-actions">
            <span className="funding-value">
              {formatPen(calculation.result.initialPenRequired)}
            </span>
            <button
              type="button"
              className="funding-breakdown-btn"
              aria-label={`Ver desglose de ${option.label}`}
              onClick={onOpenBreakdown}
            >
              Ver desglose
            </button>
          </span>
        ) : (
          <span className="funding-value cell-muted">No disponible</span>
        )}
      </div>
      {calculation.status === "ok" ? (
        <p className="cell-sub">
          {option.networkOverride === null ? "Red automática: " : "Red manual: "}
          {networkLabel}
          {networkQuote ? ` · ${formatUsd(networkQuote.fee, 4)} USDT` : ""}
          {option.overcostPen !== null && option.overcostPen > 0.004
            ? ` · +${formatPen(option.overcostPen)} frente a la red automática`
            : ""}
        </p>
      ) : (
        <p className="funding-error">{calculation.reason}</p>
      )}
      {networkQuote ? (
        <p className="cell-sub">
          Retiro mínimo {networkQuote.minWithdraw} USDT · depósito mínimo{" "}
          {networkQuote.minDeposit === null
            ? "no especificado"
            : `${networkQuote.minDeposit} USDT`}
        </p>
      ) : null}
      {option.candidates.length > 0 ? (
        <label className="funding-network-select">
          <span>Red</span>
          <select
            value={option.networkOverride ?? "auto"}
            aria-label={`Red para ${option.label}`}
            onChange={(event) =>
              onNetworkOverride(
                option.routeId,
                event.target.value === "auto" ? null : event.target.value,
              )
            }
          >
            <option value="auto">Automática</option>
            {option.candidates
              .filter((candidate: NetworkQuote) => candidate.usable)
              .map((candidate) => (
                <option
                  key={`${candidate.networkId}-${candidate.asset}`}
                  value={candidate.networkId}
                >
                  {candidate.network} · {formatUsd(candidate.fee, 3)}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {option.candidates.some((candidate) => !candidate.usable) ? (
        <details className="funding-discarded">
          <summary>
            Redes descartadas (
            {option.candidates.filter((candidate) => !candidate.usable).length})
          </summary>
          <ul>
            {option.candidates
              .filter((candidate) => !candidate.usable)
              .map((candidate) => (
                <li key={`${candidate.networkId}-${candidate.asset}`}>
                  <span className="funding-name">{candidate.network}</span>
                  <span className="cell-sub">{candidate.reason}</span>
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

export function FundingPanel({ model }: FundingPanelProps) {
  const [routeBreakdown, setRouteBreakdown] = useState<{
    methodName: string;
    routeLabel: string;
    calculation: FundingCalculation;
  } | null>(null);

  const winner =
    model.methodViews.find(
      (view) => view.methodId === model.winnerMethodId && view.best !== null,
    ) ?? null;
  const orderedViews = [...model.methodViews].sort(
    (a, b) =>
      Number(a.targetAsset === "USD") - Number(b.targetAsset === "USD"),
  );
  const lowestNetPen = orderedViews.reduce<number | null>((lowest, view) => {
    const netPen = netPenOf(view);
    if (netPen === null) {
      return lowest;
    }
    return lowest === null || netPen < lowest ? netPen : lowest;
  }, null);

  return (
    <section className="card funding-card" aria-labelledby="funding-panel-title">
      <div className="card-head">
        <h2 id="funding-panel-title" className="card-title">
          Fondeo
        </h2>
        <p className="card-subtitle">
          Cuánto cuesta conseguir el saldo que necesita cada tarjeta: tasa de
          adquisición, ruta, red y desembolso en soles. Se revisa una vez al mes.
        </p>
      </div>

      <h3 className="funding-subtitle">Fuentes de adquisición</h3>
      <div className="funding-list">
        {model.sourceViews.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            onRateChange={(value) => model.setSourceRate(source.id, value)}
            onFeeChange={(value) => model.setSourceFee(source.id, value)}
            onToggle={() => model.toggleSource(source.id)}
          />
        ))}
      </div>

      <h3 className="funding-subtitle">Conversiones de activo</h3>
      <p className="field-hint">
        Tasa efectiva: unidades del activo destino que recibes por 1 USDT. Si
        es menor que 1, la diferencia es el costo de convertir.
      </p>
      <div className="funding-list">
        {model.conversionViews.map((view) => (
          <div className="funding-row funding-row--conversion" key={view.key}>
            <div className="funding-row-main">
              <span className="funding-name">
                {view.fromAsset} → {view.toAsset}
              </span>
              <span className="cell-sub">{view.platformLabel}</span>
              {view.rate !== null && view.rate > 0 && view.rate < 1 ? (
                <span className="cell-sub">
                  Costo implícito {formatPercent(1 - view.rate, 2)}
                </span>
              ) : null}
            </div>
            <label className="funding-field">
              <span>{`${view.toAsset} por USDT`}</span>
              <input
                className={`field-input${
                  view.rate === null ? " field-input-empty" : ""
                }`}
                type="number"
                inputMode="decimal"
                step="0.000001"
                value={view.rate ?? ""}
                aria-label={`Tasa de conversión de ${view.fromAsset} a ${view.toAsset} en ${view.platformLabel}`}
                onChange={(event) =>
                  model.setConversionRate(view.key, toNumber(event.target.value))
                }
              />
            </label>
          </div>
        ))}
      </div>

      <h3 className="funding-subtitle">Mejor ruta de fondeo</h3>
      {winner && winner.best ? (
        <p className="funding-winner">
          <strong>Más barato:</strong> {winner.methodName} ·{" "}
          {formatPen(winner.best.penPerPurchase)} por compra
          .
        </p>
      ) : null}
      <p className="field-hint">
        Cada fila muestra su ruta más barata. El desplegable de una fila lista
        los planes B de esa misma fila: otras fuentes y otras redes, con su
        costo y el motivo por el que se descartaron.
      </p>
      <div
        className="funding-table"
        role="table"
        aria-label="Mejor ruta de fondeo por método de pago"
      >
        <div className="funding-table-head" role="row">
          <span role="columnheader">Destino</span>
          <span role="columnheader">Saldo requerido</span>
          <span role="columnheader">Ruta elegida</span>
          <span role="columnheader">Red</span>
          <span role="columnheader">Desembolso</span>
          <span role="columnheader">Cashback</span>
          <span role="columnheader">Costo neto</span>
          <span role="columnheader">Tipo de cambio efectivo</span>
        </div>

        {orderedViews.map((view) => {
          const bestOption = view.best
            ? view.options.find(
                (option) =>
                  option.routeId === view.best?.routeId &&
                  option.calculation.status === "ok",
              )
            : undefined;
          const openBreakdown = bestOption
            ? () =>
                setRouteBreakdown({
                  methodName: view.methodName,
                  routeLabel: bestOption.label,
                  calculation: bestOption.calculation,
                })
            : undefined;
          return (
          <div className="funding-method" key={view.methodId}>
            <MethodRow
              view={view}
              isWinner={view.methodId === model.winnerMethodId}
              isLowestNet={
                lowestNetPen !== null &&
                netPenOf(view) !== null &&
                Math.abs((netPenOf(view) ?? 0) - lowestNetPen) < 0.005
              }
              onOpenBreakdown={openBreakdown}
            />
            {view.options.length > 0 ? (
            <details className="funding-alternatives">
              <summary>
                {`Rutas alternativas y redes · ${view.methodName}`}
                {view.best && !isCardFunding(view.best) ? (
                  <span className="funding-summary-extra">
                    {" "}
                    · efectividad{" "}
                    {formatPercent(
                      view.best.finalAmountReceived /
                        (view.best.initialPenRequired / view.best.penPerUsdt),
                      1,
                    )}
                  </span>
                ) : null}
              </summary>
              <ul className="funding-option-list">
                {view.options.map((option) => (
                  <OptionItem
                    key={option.routeId}
                    option={option}
                    onNetworkOverride={model.setNetworkOverride}
                    onOpenBreakdown={() =>
                      setRouteBreakdown({
                        methodName: view.methodName,
                        routeLabel: option.label,
                        calculation: option.calculation,
                      })
                    }
                  />
                ))}
              </ul>
            </details>
            ) : null}
          </div>
          );
        })}
      </div>

      {model.methodsWithoutRoute.length > 0 ? (
        <p className="funding-missing">
          Sin ruta de fondeo disponible: {model.methodsWithoutRoute.join(", ")}.
        </p>
      ) : null}

      <p className="field-hint">
        Las redes y sus comisiones se actualizan en{" "}
        <code>src/data/fundingNetworks.ts</code>.
      </p>

      {routeBreakdown ? (
        <FundingRouteBreakdown
          methodName={routeBreakdown.methodName}
          routeLabel={routeBreakdown.routeLabel}
          calculation={routeBreakdown.calculation}
          onClose={() => setRouteBreakdown(null)}
        />
      ) : null}
    </section>
  );
}

export default FundingPanel;
