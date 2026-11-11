import { Fragment, useEffect, useRef } from "react";
import { isCardFunding } from "../../domain/funding";
import type { FundingCalculation } from "../../domain/types";
import {
  formatPen,
  formatPercent,
  formatRate,
  formatUsd,
} from "../../utils/currency";
import { BreakdownRow } from "../CalculationBreakdown/CalculationBreakdown";

interface FundingRouteBreakdownProps {
  methodName: string;
  routeLabel: string;
  calculation: FundingCalculation;
  onClose: () => void;
}

type OkFundingCalculation = Extract<FundingCalculation, { status: "ok" }>;

function RouteChain({ calculation }: { calculation: OkFundingCalculation }) {
  const result = calculation.result;
  const card = isCardFunding(result);
  const firstInput =
    result.steps.length > 0 ? result.steps[0].inputAmount : result.finalAmountReceived;
  const orderFee = result.acquiredUsdt - firstInput;

  return (
    <div className="breakdown funding-breakdown">
      <BreakdownRow
        label="Depósito en soles"
        value={formatPen(result.initialPenRequired)}
        group="funding"
      />
      {card ? (
        <>
          <BreakdownRow
            label={result.sourceLabel}
            value={`${formatRate(result.penPerUsdt)} S/ por USD`}
            group="funding"
            variant="divider"
          />
          <BreakdownRow
            label="Saldo con comisiones"
            value={`${formatUsd(result.targetAmount, 2)} USD`}
            group="funding"
          />
        </>
      ) : (
        <>
          <BreakdownRow
            label={`Compra P2P (${result.sourceLabel})`}
            value={`${formatRate(result.penPerUsdt)} S/ por USDT`}
            group="funding"
            variant="divider"
          />
          <BreakdownRow
            label="USDT comprados"
            value={`${formatUsd(result.acquiredUsdt, 6)} USDT`}
            group="funding"
          />
          {orderFee > 0 ? (
            <BreakdownRow
              label="Comisión de la orden P2P"
              value={`−${formatUsd(orderFee, 6)} USDT`}
              group="funding"
            />
          ) : null}
          {result.steps.map((step) => (
            <Fragment key={step.id}>
              <BreakdownRow
                label={`${step.label}${step.network ? ` · ${step.network}` : " · interna"}`}
                value={`${formatUsd(step.inputAmount, 6)} → ${formatUsd(
                  step.outputAmount,
                  6,
                )} ${step.asset}`}
                group="funding"
              />
              {step.costAmount > 0 ? (
                <BreakdownRow
                  label={`Comisión de ${
                    step.kind === "convert" ? "conversión" : "red"
                  }`}
                  value={`−${formatUsd(step.costAmount, 6)} ${step.asset}`}
                  group="funding"
                />
              ) : null}
            </Fragment>
          ))}
          <BreakdownRow
            label="Llega al destino"
            value={`${formatUsd(result.finalAmountReceived, 6)} ${result.targetAsset}`}
            group="funding"
            variant="divider"
          />
          <BreakdownRow
            label="Saldo requerido por compra (tabla principal)"
            value={`${formatUsd(result.targetAmount, 6)} ${result.targetAsset}`}
            group="funding"
          />
        </>
      )}
      <BreakdownRow
        label="Tipo de cambio efectivo"
        value={`${formatRate(result.effectivePenPerUnit)} S/ por ${result.targetAsset}`}
        group="funding"
      />
      {card ? null : (
        <BreakdownRow
          label="Efectividad del fondeo"
          value={formatPercent(
            result.finalAmountReceived /
              (result.initialPenRequired / result.penPerUsdt),
            1,
          )}
          group="funding"
        />
      )}
      <BreakdownRow
        label="Desembolso inicial"
        value={formatPen(result.initialPenRequired)}
        group="result"
        variant="total"
      />
    </div>
  );
}

export function FundingRouteBreakdown({
  methodName,
  routeLabel,
  calculation,
  onClose,
}: FundingRouteBreakdownProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="breakdown-modal-overlay" onClick={onClose}>
      <div
        className="breakdown-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="funding-route-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="breakdown-modal-head">
          <div>
            <h2 id="funding-route-modal-title">Desglose del fondeo</h2>
            <p className="breakdown-modal-sub">
              {methodName} · {routeLabel}
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="breakdown-modal-close"
            aria-label="Cerrar desglose del fondeo"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="breakdown-modal-body">
          {calculation.status === "ok" ? (
            <RouteChain calculation={calculation} />
          ) : (
            <p className="breakdown-modal-status" role="alert">
              No se puede calcular esta ruta: {calculation.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FundingRouteBreakdown;
