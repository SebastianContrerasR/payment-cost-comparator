import type { ExchangeRateInput } from "../../domain/types";

interface InputPanelProps {
  amountJPY: number | null;
  onAmountChange: (value: number | null) => void;
  exchangeRates: ExchangeRateInput;
  onExchangeRateChange: (key: string, value: number | null) => void;
}

const RATE_FIELDS: Array<{
  key: string;
  label: string;
  externalUrl?: string;
  externalAriaLabel?: string;
}> = [
  {
    key: "visa",
    label: "Tipo de cambio Visa",
    externalUrl:
      "https://www.visa.com.pe/soporte/consumidores/viajes/exchange-rate-calculator.html",
    externalAriaLabel:
      "Tipo de cambio Visa — abrir calculadora de Visa en una pestaña nueva",
  },
  {
    key: "mastercard",
    label: "Tipo de cambio Mastercard",
    externalUrl:
      "https://www.mastercard.com/pe/es/personal/get-support/currency-exchange-rate-converter.html",
    externalAriaLabel:
      "Tipo de cambio Mastercard — abrir calculadora de Mastercard en una pestaña nueva",
  },
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
  externalUrl?: string;
  externalAriaLabel?: string;
}

function NumericInput({
  id,
  label,
  hint,
  value,
  step,
  onChange,
  externalUrl,
  externalAriaLabel,
}: NumericInputProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {externalUrl ? (
          <a
            className="field-label-link"
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={externalAriaLabel}
            title={externalAriaLabel}
          >
            {label}
          </a>
        ) : (
          label
        )}
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
            externalUrl={field.externalUrl}
            externalAriaLabel={field.externalAriaLabel}
          />
        ))}
      </div>
    </section>
  );
}

export default InputPanel;
