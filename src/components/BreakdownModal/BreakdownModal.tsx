import { useEffect, useRef } from "react";
import type { CalculationResult, FundingSummary } from "../../domain/types";
import CalculationBreakdown from "../CalculationBreakdown/CalculationBreakdown";
import FundingBreakdown from "../FundingBreakdown/FundingBreakdown";

interface BreakdownModalProps {
  result: CalculationResult | undefined;
  funding?: FundingSummary;
  onClose: () => void;
}

export function BreakdownModal({ result, funding, onClose }: BreakdownModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!result) {
      return undefined;
    }
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
  }, [result, onClose]);

  if (!result) {
    return null;
  }

  return (
    <div className="breakdown-modal-overlay" onClick={onClose}>
      <div
        className="breakdown-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="breakdown-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="breakdown-modal-head">
          <div>
            <h2 id="breakdown-modal-title">Desglose del cálculo</h2>
            <p className="breakdown-modal-sub">
              {result.method.name} · {result.method.network}
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="breakdown-modal-close"
            aria-label="Cerrar desglose"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="breakdown-modal-body">
          {result.status === "ok" ? (
            <>
              <CalculationBreakdown result={result} />
              {funding ? <FundingBreakdown summary={funding} /> : null}
            </>
          ) : (
            <p className="breakdown-modal-status" role="alert">
              No se puede calcular con los valores actuales: {result.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BreakdownModal;
