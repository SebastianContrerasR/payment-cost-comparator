import {
  PURCHASE_CURRENCIES,
  type ExchangeRateInput,
  type PaymentMethod,
  type PurchaseCurrency,
} from "../../domain/types";
import { MethodPicker } from "./MethodPicker";

interface InputPanelProps {
  currency: PurchaseCurrency;
  onCurrencyChange: (currency: PurchaseCurrency) => void;
  amount: number | null;
  onAmountChange: (value: number | null) => void;
  methods: readonly PaymentMethod[];
  activeMethodIds: readonly string[];
  onToggleMethod: (id: string) => void;
  onSelectAllMethods: () => void;
  onResetMethods: () => void;
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

const RATE_KEYS = RATE_FIELDS.map((field) => field.key);

export { RATE_KEYS };
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
  currency,
  onCurrencyChange,
  amount,
  onAmountChange,
  methods,
  activeMethodIds,
  onToggleMethod,
  onSelectAllMethods,
  onResetMethods,
  exchangeRates,
  onExchangeRateChange,
}: InputPanelProps) {
  const isUsd = currency === "USD";

  return (
    <section className="card" aria-labelledby="input-panel-title">
      <div className="card-head">
        <h2 id="input-panel-title" className="card-title">
          Configuración de entrada
        </h2>
        <p className="card-subtitle">
          Ajusta la compra y los tipos de cambio; la tabla se actualiza al
          instante.
        </p>
      </div>
      <div className="input-panel">
          <section
              className="input-section"
              aria-labelledby="purchase-section-title"
            >
              <div className="input-section-head">
                <h3 id="purchase-section-title" className="input-section-title">
                  Compra
                </h3>
                <p className="input-section-subtitle">
                  Moneda, monto y métodos a comparar
                </p>
              </div>
              <div className="input-grid input-grid--purchase">
                <div className="field">
                  <span className="field-label">Moneda de compra</span>
                  <div
                    className="currency-toggle"
                    role="group"
                    aria-label="Moneda de compra"
                  >
                    {PURCHASE_CURRENCIES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`currency-option${
                          option === currency ? " is-active" : ""
                        }`}
                        aria-pressed={option === currency}
                        onClick={() => onCurrencyChange(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="field-hint">
                    {isUsd
                      ? "Compra en dólares: sin conversión de divisa"
                      : "Compra en yenes: usa el tipo de cambio de cada red"}
                  </p>
                </div>
                <NumericInput
                  id={`amount-${currency.toLowerCase()}`}
                  label={`Monto ${currency}`}
                  hint={
                    isUsd
                      ? "Importe de la compra en dólares"
                      : "Importe de la compra en yenes japoneses"
                  }
                  value={amount}
                  step={isUsd ? "10" : "1000"}
                  onChange={onAmountChange}
                />
                <MethodPicker
                  methods={methods}
                  activeMethodIds={activeMethodIds}
                  currency={currency}
                  onToggle={onToggleMethod}
                  onSelectAll={onSelectAllMethods}
                  onReset={onResetMethods}
                />
              </div>
              {isUsd ? (
                <p className="input-note">
                  El pago ya está en dólares: no se aplican los tipos de cambio
                  de Visa, Mastercard ni PayPay, ni comisiones cross-border.
                </p>
              ) : null}
            </section>

            {isUsd ? null : (
              <section
                className="input-section"
                aria-labelledby="rates-section-title"
              >
                <div className="input-section-head">
                  <h3 id="rates-section-title" className="input-section-title">
                    Tipo de cambio
                  </h3>
                  <p className="input-section-subtitle">
                    Cada red aplica su propia tasa de JPY a USD
                  </p>
                </div>
                <div className="input-grid input-grid--rates">
                  {RATE_FIELDS.map((field) => (
                    <NumericInput
                      key={field.key}
                      id={`exchange-rate-${field.key}`}
                      label={field.label}
                      hint={RATE_HINT}
                      value={exchangeRates[field.key] ?? null}
                      step="0.0001"
                      onChange={(value) =>
                        onExchangeRateChange(field.key, value)
                      }
                      externalUrl={field.externalUrl}
                      externalAriaLabel={field.externalAriaLabel}
                    />
                  ))}
                </div>
              </section>
            )}
      </div>
    </section>
  );
}

export default InputPanel;
