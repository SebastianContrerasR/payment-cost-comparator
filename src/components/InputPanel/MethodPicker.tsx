import type { PaymentMethod, PurchaseCurrency } from "../../domain/types";

interface MethodPickerProps {
  methods: readonly PaymentMethod[];
  activeMethodIds: readonly string[];
  currency: PurchaseCurrency;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
}

export function MethodPicker({
  methods,
  activeMethodIds,
  currency,
  onToggle,
  onSelectAll,
  onReset,
}: MethodPickerProps) {
  const activeIds = new Set(activeMethodIds);
  const availableMethods = methods.filter((method) =>
    method.supportedCurrencies.includes(currency),
  );
  const activeCount = availableMethods.filter((method) =>
    activeIds.has(method.id),
  ).length;
  const activeLabel = `${activeCount} ${activeCount === 1 ? "activo" : "activos"}`;

  return (
    <div className="field method-picker-field">
      <span className="field-label">Métodos de pago</span>
      <details className="method-picker">
        <summary
          className="column-picker-button method-picker-button"
          aria-label={`Métodos de pago: ${activeLabel}. Editar selección`}
        >
          <span>{activeLabel}</span>
          <span className="method-picker-toggle">
            Editar
            <span className="method-picker-arrow" aria-hidden="true">
              ▾
            </span>
          </span>
        </summary>
        <div className="column-picker-panel method-picker-panel">
          <ul className="column-picker-list">
            {methods.map((method) => {
              const available = method.supportedCurrencies.includes(currency);
              const availabilityLabel = `Solo ${method.supportedCurrencies.join(" o ")}`;
              return (
                <li key={method.id}>
                  <label
                    className={`column-picker-item${
                      available ? "" : " column-picker-item--locked"
                    }`}
                    title={
                      available
                        ? `Activar o desactivar ${method.name}`
                        : `${method.name} no está disponible para compras en ${currency}`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={activeIds.has(method.id)}
                      disabled={!available}
                      onChange={() => onToggle(method.id)}
                    />
                    <span className="method-picker-name">{method.name}</span>
                    {!available ? (
                      <span className="method-picker-note">
                        {availabilityLabel}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="column-picker-actions">
            <button
              type="button"
              className="column-picker-action"
              onClick={onSelectAll}
            >
              Todos
            </button>
            <button
              type="button"
              className="column-picker-action"
              onClick={onReset}
            >
              Restablecer
            </button>
          </div>
        </div>
      </details>
      <p className="field-hint">
        Desactiva los métodos que no quieras comparar. Los no disponibles para
        la moneda quedan bloqueados.
      </p>
    </div>
  );
}

export default MethodPicker;
