import type { OkCalculationResult } from "../../domain/types";
import { formatJpy, formatPercent, formatRate, formatUsd } from "../../utils/currency";

interface CalculationBreakdownProps {
  result: OkCalculationResult;
}

interface BreakdownRowProps {
  label: string;
  value: string;
  variant?: "default" | "divider" | "total";
}

function BreakdownRow({ label, value, variant = "default" }: BreakdownRowProps) {
  return (
    <div className={`breakdown-row breakdown-row--${variant}`}>
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-leader" aria-hidden="true" />
      <span className="breakdown-value">{value}</span>
    </div>
  );
}

/**
 * E. Desglose del cálculo: muestra paso a paso cómo se obtuvo el total del
 * método seleccionado (conversión, comisiones, cashback y total final).
 */
export function CalculationBreakdown({
  result,
}: CalculationBreakdownProps) {
  const { breakdown, method } = result;

  return (
    <article className="card breakdown-card">
      <div className="card-head">
        <h2 className="card-title">Desglose del cálculo</h2>
        <p className="card-subtitle">
          {method.name} · {method.network}
        </p>
      </div>

      <div className="breakdown">
        <BreakdownRow label="Monto original" value={formatJpy(breakdown.amountJPY)} />
        <BreakdownRow
          label={`Tipo de cambio (${method.exchangeRateKey})`}
          value={`${formatRate(breakdown.exchangeRate)} JPY/USD`}
        />
        <BreakdownRow
          label="Conversión a USD"
          value={formatUsd(breakdown.baseAmountUSD)}
          variant="divider"
        />
        <BreakdownRow
          label={`FX Fee (${formatPercent(method.fees.fxFee)})`}
          value={`+${formatUsd(breakdown.fxFeeCostUSD)}`}
        />
        <BreakdownRow
          label={`Crypto Fee (${formatPercent(method.fees.cryptoFee)})`}
          value={`+${formatUsd(breakdown.cryptoFeeCostUSD)}`}
        />
        {breakdown.otherFeeLines.map((line) => (
          <BreakdownRow
            key={line.rule.id}
            label={`${line.rule.name} (${
              line.rule.type === "percentage"
                ? formatPercent(line.rule.value)
                : `${formatUsd(line.rule.value, 2)} fija`
            })`}
            value={`+${formatUsd(line.costUSD)}`}
          />
        ))}
        <BreakdownRow
          label="Costo antes de cashback"
          value={formatUsd(breakdown.totalBeforeCashbackUSD)}
          variant="divider"
        />
        {method.cashback.rate > 0 ? (
          <>
            <BreakdownRow
              label={`Cashback potencial (${formatPercent(method.cashback.rate)})`}
              value={formatUsd(breakdown.potentialCashbackUSD)}
            />
            <BreakdownRow
              label="Límite disponible"
              value={
                breakdown.cashbackCapUSD === null
                  ? "Ilimitado"
                  : formatUsd(breakdown.cashbackCapUSD)
              }
            />
            <BreakdownRow
              label="Cashback efectivo"
              value={`−${formatUsd(breakdown.effectiveCashbackUSD)}`}
            />
          </>
        ) : null}
        <BreakdownRow
          label="Total"
          value={formatUsd(breakdown.totalUSD)}
          variant="total"
        />
      </div>
    </article>
  );
}

export default CalculationBreakdown;
