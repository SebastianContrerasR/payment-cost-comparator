import { useState } from "react";
import {
  PURCHASE_CURRENCIES,
  type ExchangeRateInput,
  type PaymentMethod,
  type PurchaseCurrency,
} from "../../domain/types";
import { MethodPicker } from "./MethodPicker";
import {
  parseInputJson,
  serializeInputJson,
  type InputJsonValues,
} from "./inputJson";

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
  onApplyInputs: (update: {
    currency: PurchaseCurrency;
    amount: number | null;
    exchangeRates: ExchangeRateInput;
  }) => void;
  onApplyMethods: (ids: readonly string[]) => void;
}

type InputMode = "form" | "json";

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
  onApplyInputs,
  onApplyMethods,
}: InputPanelProps) {
  const [mode, setMode] = useState<InputMode>("form");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const isUsd = currency === "USD";

  function showJsonEditor() {
    if (mode === "json") {
      return;
    }
    const values: InputJsonValues = {
      currency,
      amount,
      exchangeRates,
      methods: [...activeMethodIds],
    };
    setJsonDraft(serializeInputJson(values));
    setJsonError(null);
    setMode("json");
  }

  function handleJsonChange(value: string) {
    setJsonDraft(value);
    const parsed = parseInputJson(value, {
      rateKeys: RATE_KEYS,
      knownMethodIds: methods.map((method) => method.id),
    });
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(null);
    onApplyInputs({
      currency: parsed.value.currency,
      amount: parsed.value.amount,
      exchangeRates: parsed.value.exchangeRates,
    });
    onApplyMethods(parsed.value.methods);
  }

  return (
    <section className="card" aria-labelledby="input-panel-title">
      <div className="card-head card-head--input">
        <div className="input-card-heading">
          <h2 id="input-panel-title" className="card-title">
            Configuración de entrada
          </h2>
          <p className="card-subtitle">
            {mode === "json"
              ? "Edita toda la configuración como JSON; cada cambio válido se aplica al instante."
              : "Ajusta la compra y los tipos de cambio; la tabla se actualiza al instante."}
          </p>
        </div>
        <div
          className="input-mode-toggle"
          role="group"
          aria-label="Modo de edición de entrada"
        >
          <button
            type="button"
            className={`input-mode-option${
              mode === "form" ? " is-active" : ""
            }`}
            aria-pressed={mode === "form"}
            onClick={() => setMode("form")}
          >
            Individual
          </button>
          <button
            type="button"
            className={`input-mode-option${
              mode === "json" ? " is-active" : ""
            }`}
            aria-pressed={mode === "json"}
            onClick={showJsonEditor}
          >
            JSON
          </button>
        </div>
      </div>
      <div className="input-panel">
        {mode === "json" ? (
          <div className="json-editor">
            <div className="json-editor-head">
              <label className="field-label" htmlFor="input-json">
                Configuración JSON
              </label>
              <span
                id="input-json-status"
                className={`json-status${
                  jsonError ? " json-status--error" : ""
                }`}
              >
                {jsonError ? "JSON inválido" : "Válido · aplicado"}
              </span>
            </div>
            <textarea
              id="input-json"
              className={`json-textarea${
                jsonError ? " json-textarea--error" : ""
              }`}
              value={jsonDraft}
              onChange={(event) => handleJsonChange(event.target.value)}
              spellCheck={false}
              aria-invalid={jsonError !== null}
              aria-describedby="input-json-help input-json-status"
            />
            <p className="field-hint" id="input-json-help">
              Objeto con <code>currency</code>, <code>amount</code>,{" "}
              <code>exchangeRates</code> y <code>methods</code>. Los cambios
              válidos se aplican al instante.
            </p>
            {jsonError ? (
              <p className="json-error" role="alert">
                {jsonError}
              </p>
            ) : null}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}

export default InputPanel;
