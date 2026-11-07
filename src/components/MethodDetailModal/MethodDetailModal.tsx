import { useEffect, useRef } from "react";
import type { CalculationResult } from "../../domain/types";
import CalculationBreakdown from "../CalculationBreakdown/CalculationBreakdown";
import PaymentMethodDetails from "../PaymentMethodDetails/PaymentMethodDetails";

interface MethodDetailModalProps {
  result: CalculationResult;
  onClose: () => void;
}

/**
 * Modal con la información del método seleccionado y el desglose del cálculo
 * con los colores de grupos de la tabla. Cierra con el botón ×, la tecla Esc
 * o haciendo clic fuera del panel.
 */
export function MethodDetailModal({ result, onClose }: MethodDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Al abrir: foco en el botón de cierre, bloqueo del scroll de fondo y cierre
  // con la tecla Esc. Al cerrar: se restaura todo.
  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="method-modal-overlay" onClick={onClose}>
      <div
        className="method-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="method-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="method-modal-head">
          <div>
            <h2 id="method-modal-title">{result.method.name}</h2>
            <p className="method-modal-sub">
              {result.method.provider} · {result.method.network}
              {result.method.enabled ? "" : " · Deshabilitado"}
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="method-modal-close"
            aria-label="Cerrar detalle"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="method-modal-body">
          {result.status === "ok" ? (
            <div className="method-modal-grid">
              <section
                className="method-modal-panel"
                aria-label="Información del método"
              >
                <h3 className="method-modal-panel-title">
                  Información del método
                </h3>
                <PaymentMethodDetails method={result.method} />
              </section>
              <section
                className="method-modal-panel"
                aria-label="Desglose del cálculo"
              >
                <h3 className="method-modal-panel-title">
                  Desglose del cálculo
                </h3>
                <CalculationBreakdown result={result} />
              </section>
            </div>
          ) : (
            <p className="method-modal-status" role="alert">
              No se puede calcular con los valores actuales: {result.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MethodDetailModal;
