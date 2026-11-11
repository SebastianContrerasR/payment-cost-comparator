import type { OkCalculationResult } from "../../domain/types";
import { formatJpy, formatPercent, formatRate, formatUsd } from "../../utils/currency";

interface CalculationBreakdownProps {
  result: OkCalculationResult;
}

type BreakdownGroup = "conversion" | "fees" | "cashback" | "funding" | "result";

interface BreakdownRowProps {
  label: string;
  value: string;
  group?: BreakdownGroup;
  variant?: "default" | "divider" | "total";
}

export function BreakdownRow({
  label,
  value,
  group,
  variant = "default",
}: BreakdownRowProps) {
  const groupClass = group ? ` breakdown-row--${group}` : "";
  return (
    <div
      className={`breakdown-row breakdown-row--${variant}${groupClass}`}
    >
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-leader" aria-hidden="true" />
      <span className="breakdown-value">{value}</span>
    </div>
  );
}

export function CalculationBreakdown({
  result,
}: CalculationBreakdownProps) {
  const { breakdown, method } = result;

  return (
    <div className="breakdown">
      <BreakdownRow label="Monto original" value={formatJpy(breakdown.amountJPY)} />
      <BreakdownRow
        label={`Tipo de cambio (${method.exchangeRateKey})`}
        value={`${formatRate(breakdown.exchangeRate)} JPY/USD`}
        group="conversion"
      />
      <BreakdownRow
        label="Conversión a USD"
        value={formatUsd(breakdown.baseAmountUSD)}
        group="conversion"
        variant="divider"
      />
      <BreakdownRow
        label={`FX Fee (${formatPercent(method.fees.fxFee)})`}
        value={`+${formatUsd(breakdown.fxFeeCostUSD)}`}
        group="fees"
      />
      <BreakdownRow
        label={`Crypto Fee (${formatPercent(method.fees.cryptoFee)})`}
        value={`+${formatUsd(breakdown.cryptoFeeCostUSD)}`}
        group="fees"
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
          group="fees"
        />
      ))}
      <BreakdownRow
        label="Costo antes de cashback"
        value={formatUsd(breakdown.totalBeforeCashbackUSD)}
        group="fees"
        variant="divider"
      />
      {method.cashback.rate > 0 ? (
        <>
          <BreakdownRow
            label={`Cashback potencial (${formatPercent(method.cashback.rate)})`}
            value={formatUsd(breakdown.potentialCashbackUSD)}
            group="cashback"
          />
          <BreakdownRow
            label="Límite disponible"
            value={
              breakdown.cashbackCapUSD === null
                ? "Ilimitado"
                : formatUsd(breakdown.cashbackCapUSD)
            }
            group="cashback"
          />
          <BreakdownRow
            label="Cashback efectivo"
            value={`−${formatUsd(breakdown.effectiveCashbackUSD)}`}
            group="cashback"
          />
        </>
      ) : null}
      <BreakdownRow
        label="Total"
        value={formatUsd(breakdown.totalUSD)}
        group="result"
        variant="total"
      />
    </div>
  );
}

export default CalculationBreakdown;
