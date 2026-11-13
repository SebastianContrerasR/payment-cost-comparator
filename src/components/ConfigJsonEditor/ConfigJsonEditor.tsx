import { useState } from "react";
import type {
  InputJsonParseOptions,
  InputJsonValues,
} from "../InputPanel/inputJson";
import type { FundingSettings } from "../../hooks/useFunding";
import {
  parseConfigJson,
  serializeConfigJson,
  type ConfigJsonValues,
} from "./configJson";

interface ConfigJsonProps {
  purchase: InputJsonValues;
  fundingSettings: FundingSettings;
  parseOptions: InputJsonParseOptions;
  onApply: (update: ConfigJsonValues) => void;
}

export function ConfigJsonEditor({
  purchase,
  fundingSettings,
  parseOptions,
  onApply,
}: ConfigJsonProps) {
  const [jsonDraft, setJsonDraft] = useState(() =>
    serializeConfigJson({ purchase, fundingSettings }),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  function handleJsonChange(value: string) {
    setJsonDraft(value);
    const parsed = parseConfigJson(value, parseOptions);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(null);
    onApply(parsed.value);
  }

  return (
    <section className="card" aria-labelledby="config-json-title">
      <div className="card-head">
        <h2 id="config-json-title" className="card-title">
          Configuración JSON
        </h2>
        <p className="card-subtitle">
          Moneda, monto, tipos de cambio, métodos, fuentes de fondeo y
          conversiones en un solo documento. Cada cambio válido se aplica al
          instante.
        </p>
      </div>
      <div className="json-editor">
        <div className="json-editor-head">
          <label className="field-label" htmlFor="config-json">
            Configuración JSON
          </label>
          <span
            id="config-json-status"
            className={`json-status${
              jsonError ? " json-status--error" : ""
            }`}
          >
            {jsonError ? "JSON inválido" : "Válido · aplicado"}
          </span>
        </div>
        <textarea
          id="config-json"
          className={`json-textarea${
            jsonError ? " json-textarea--error" : ""
          }`}
          value={jsonDraft}
          onChange={(event) => handleJsonChange(event.target.value)}
          spellCheck={false}
          aria-invalid={jsonError !== null}
          aria-describedby="config-json-help config-json-status"
        />
        <p className="field-hint" id="config-json-help">
          Objeto con <code>purchase</code> (<code>currency</code>,{" "}
          <code>amount</code>, <code>exchangeRates</code> y{" "}
          <code>methods</code>) y <code>funding</code> (<code>sources</code>,
          cada fuente define <code>penPerUsdt</code>, <code>fee</code> y{" "}
          <code>enabled</code>, más <code>conversionRates</code>). Solo los
          inputs de configuración: la red de cada ruta se elige en la tabla de
          fondeo y no entra aquí.
        </p>
        {jsonError ? (
          <p className="json-error" role="alert">
            {jsonError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default ConfigJsonEditor;
