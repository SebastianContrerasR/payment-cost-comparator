import type { ExchangeRateInput } from "../../domain/types";

interface InputPanelProps {
  amountJPY: number | null;
  onAmountChange: (value: number | null) => void;
  exchangeRates: ExchangeRateInput;
  onExchangeRateChange: (key: string, value: number | null) => void;
}

const RATE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "visa", label: "Tipo de cambio Visa" },
  { key: "mastercard", label: "Tipo de cambio Mastercard" },
  { key: "paypay", label: "Tipo de cambio PayPay" },
];

const RATE_HINT = "JPY por USD · Monto USD = Monto JPY / TC";

function toNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface NumericInputProps {
  id: string;
  label: string;
  hint: string;
  value: number | null;
  step: string;
  onChange: (value: number | null) => void;
}

function NumericInput({
  id,
  label,
  hint,
  value,
  step,
  onChange,
}: NumericInputProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        className={`field-input${value === null ? " field-input-empty" : ""}`}
        id={id}
        type="number"
        value={value ?? ""}
        step={step}
        inputMode="decimal"
        onChange={(event) => onChange(toNumber(event.target.value))}
      />
      <p className="field-hint">{hint}</p>
    </div>
  );
}

/** A. Panel de entrada: monto en JPY y tipos de cambio por red. */
export function InputPanel({
  amountJPY,
  onAmountChange,
  exchangeRates,
  onExchangeRateChange,
}: InputPanelProps) {
  return (
    <section className="card" aria-labelledby="input-panel-title">
      <div className="card-head">
        <h2 id="input-panel-title" className="card-title">
          Configuración de entrada
        </h2>
        <p className="card-subtitle">
          Todos los valores son editables; la tabla se recalcula automáticamente.
        </p>
      </div>
      <div className="input-grid">
        <NumericInput
          id="amount-jpy"
          label="Monto JPY"
          hint="Importe de la compra en yenes japoneses"
          value={amountJPY}
          step="1000"
          onChange={onAmountChange}
        />
        {RATE_FIELDS.map((field) => (
          <NumericInput
            key={field.key}
            id={`exchange-rate-${field.key}`}
            label={field.label}
            hint={RATE_HINT}
            value={exchangeRates[field.key] ?? null}
            step="0.0001"
            onChange={(value) => onExchangeRateChange(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

export default InputPanel;
