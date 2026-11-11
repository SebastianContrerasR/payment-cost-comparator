import { isCardFunding } from "../../domain/funding";
import type { FundingSummary } from "../../domain/types";
import {
  formatPen,
  formatPercent,
  formatRate,
  formatUsd,
} from "../../utils/currency";
import { BreakdownRow } from "../CalculationBreakdown/CalculationBreakdown";

interface FundingBreakdownProps {
  summary: FundingSummary;
}

export function FundingBreakdown({ summary }: FundingBreakdownProps) {
  return (
    <div className="breakdown funding-breakdown">
      {isCardFunding(summary) ? (
        <>
          <BreakdownRow
            label={summary.sourceLabel}
            value={`${formatRate(summary.penPerUsdt)} S/ por USD`}
            group="funding"
          />
          <BreakdownRow
            label="Saldo con comisiones"
            value={`${formatUsd(summary.targetAmount, 2)} USD`}
            group="funding"
            variant="divider"
          />
        </>
      ) : (
        <>
          <BreakdownRow
            label={`Entrada (${summary.sourceLabel})`}
            value={`${formatRate(summary.penPerUsdt)} S/ por USDT`}
            group="funding"
          />
          <BreakdownRow
            label="Saldo requerido"
            value={`${formatUsd(summary.targetAmount)} ${summary.targetAsset}`}
            group="funding"
          />
          <BreakdownRow
            label="USDT adquiridos"
            value={`${formatUsd(summary.acquiredUsdt)} USDT`}
            group="funding"
          />
          {summary.steps.map((step) => (
            <BreakdownRow
              key={step.id}
              label={`${step.label}${step.network ? ` (${step.network})` : ""}`}
              value={step.costAmount === 0 ? "0" : `−${formatUsd(step.costAmount)}`}
              group="funding"
            />
          ))}
        </>
      )}
      <BreakdownRow
        label="Desembolso por compra"
        value={formatPen(summary.penPerPurchase)}
        group="funding"
        variant="divider"
      />
      <BreakdownRow
        label="Tipo de cambio efectivo"
        value={`${formatRate(summary.effectivePenPerUnit)} S/ por ${summary.targetAsset}`}
        group="funding"
      />
      {isCardFunding(summary) ? null : (
        <BreakdownRow
          label="Efectividad del fondeo"
          value={formatPercent(
            summary.finalAmountReceived /
              (summary.initialPenRequired / summary.penPerUsdt),
            1,
          )}
          group="funding"
        />
      )}
      <BreakdownRow
        label="Desembolso inicial"
        value={formatPen(summary.initialPenRequired)}
        group="result"
        variant="total"
      />
    </div>
  );
}

export default FundingBreakdown;
