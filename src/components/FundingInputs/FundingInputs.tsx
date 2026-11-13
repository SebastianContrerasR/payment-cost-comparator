import { useState } from "react";
import type {
  FundingModel,
  FundingSourceView,
} from "../../hooks/useFunding";
import { parseFundingJson, serializeFundingJson } from "./fundingJson";
import { formatPercent } from "../../utils/currency";

interface FundingInputsProps {
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
    <div
      className={`funding-row${
        source.enabled ? "" : " funding-row--inactive"
      }`}
    >
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
      <div className="funding-field funding-toggle-field">
        <span>Usar en rutas</span>
        <label className="funding-toggle">
          <input
            type="checkbox"
            className="funding-toggle-input visually-hidden"
            checked={source.enabled}
            onChange={onToggle}
            aria-label={`Usar ${source.label} en las rutas`}
          />
          <span className="funding-switch" aria-hidden="true">
            <span className="funding-switch-knob" />
          </span>
          <span
            className={`funding-switch-text${
              source.enabled ? " is-on" : ""
            }`}
          >
            {source.enabled ? "Activa" : "Inactiva"}
          </span>
        </label>
      </div>
    </div>
  );
}

type FundingMode = "form" | "json";

export function FundingInputs({ model }: FundingInputsProps) {
  const [mode, setMode] = useState<FundingMode>("form");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  function showJsonEditor() {
    if (mode === "json") {
      return;
    }
    setJsonDraft(serializeFundingJson(model.settings));
    setJsonError(null);
    setMode("json");
  }

  function handleJsonChange(value: string) {
    setJsonDraft(value);
    const parsed = parseFundingJson(value);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(null);
    model.applySettings(parsed.value);
  }

  return (
    <section className="card funding-card" aria-labelledby="funding-inputs-title">
      <div className="card-head card-head--split">
        <div className="card-head-heading">
          <h2 id="funding-inputs-title" className="card-title">
            Fondeo
          </h2>
          <p className="card-subtitle">
            {mode === "json"
              ? "Edita los inputs de fondeo como JSON; cada cambio válido se aplica al instante."
              : "Tasas y comisiones de las fuentes que consiguen el saldo de cada tarjeta, y conversiones de activo. Se revisan una vez al mes."}
          </p>
        </div>
        <div
          className="input-mode-toggle"
          role="group"
          aria-label="Modo de edición de fondeo"
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

      {mode === "json" ? (
        <div className="json-editor">
          <div className="json-editor-head">
            <label className="field-label" htmlFor="funding-json">
              Configuración JSON
            </label>
            <span
              id="funding-json-status"
              className={`json-status${
                jsonError ? " json-status--error" : ""
              }`}
            >
              {jsonError ? "JSON inválido" : "Válido · aplicado"}
            </span>
          </div>
          <textarea
            id="funding-json"
            className={`json-textarea${
              jsonError ? " json-textarea--error" : ""
            }`}
            value={jsonDraft}
            onChange={(event) => handleJsonChange(event.target.value)}
            spellCheck={false}
            aria-invalid={jsonError !== null}
            aria-describedby="funding-json-help funding-json-status"
          />
          <p className="field-hint" id="funding-json-help">
            Objeto con <code>sources</code> (cada fuente define{" "}
            <code>penPerUsdt</code>, <code>fee</code> y <code>enabled</code>) y{" "}
            <code>conversionRates</code>. Solo los inputs de configuración: la
            red de cada ruta se elige en la tabla y no entra aquí. Los cambios
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
        </>
      )}
    </section>
  );
}

export default FundingInputs;
