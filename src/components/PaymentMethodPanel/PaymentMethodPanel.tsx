import type { CalculationResult } from "../../domain/types";
import { PaymentMethodDetailsBody } from "../PaymentMethodDetails/PaymentMethodDetails";

interface PaymentMethodPanelProps {
  result: CalculationResult;
  isCheapest?: boolean;
  onClose: () => void;
}

export function PaymentMethodPanel({
  result,
  isCheapest = false,
  onClose,
}: PaymentMethodPanelProps) {
  const { method } = result;

  return (
    <article
      id="method-panel"
      className="card panel-card"
      aria-labelledby="method-panel-title"
    >
      <div className="panel-head">
        <div className="panel-head-info">
          <h2 id="method-panel-title" className="card-title">
            {method.name}
          </h2>
          <p className="card-subtitle">
            {method.provider} · {method.network}
            {method.enabled ? "" : " · Deshabilitado"}
          </p>
          <div className="chip-row">
            <span className="chip">Marca: {method.network}</span>
            {method.cashback.currency ? (
              <span className="chip chip-cashback">
                Cashback en {method.cashback.currency}
              </span>
            ) : null}
            {isCheapest ? (
              <span className="chip chip-cheap">Más barato</span>
            ) : null}
            {!method.enabled ? <span className="chip">Inactivo</span> : null}
          </div>
        </div>
        <button
          type="button"
          className="panel-close"
          aria-label={`Cerrar detalle de ${method.name}`}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="panel-details">
        <PaymentMethodDetailsBody method={method} onOpenBreakdown={undefined} />
      </div>
    </article>
  );
}

export default PaymentMethodPanel;
