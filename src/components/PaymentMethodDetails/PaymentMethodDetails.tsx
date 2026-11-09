import type { PaymentMethod } from "../../domain/types";
import { formatPercent, formatUsd } from "../../utils/currency";

interface PaymentMethodDetailsProps {
  method: PaymentMethod;
}

function FeeListItems({ method }: { method: PaymentMethod }) {
  const { fees } = method;
  const items: Array<{ id: string; label: string; value: string }> = [
    {
      id: "fx-fee",
      label: "FX Fee",
      value: formatPercent(fees.fxFee),
    },
    {
      id: "crypto-fee",
      label: "Crypto Fee",
      value: formatPercent(fees.cryptoFee),
    },
    ...fees.otherFees.map((rule) => ({
      id: rule.id,
      label: rule.name,
      value:
        rule.type === "percentage"
          ? formatPercent(rule.value)
          : formatUsd(rule.value, 2),
    })),
  ];

  return (
    <>
      {items.map((item) => (
        <div className="info-row" key={item.id}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </>
  );
}

export function PaymentMethodDetails({ method }: PaymentMethodDetailsProps) {
  return (
    <article className="card details-card">
      <div className="card-head">
        <h2 className="card-title">{method.name}</h2>
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
          {!method.enabled ? <span className="chip">Inactivo</span> : null}
        </div>
      </div>

      <div className="details-body">
        <section className="details-section">
          <h3>Comisiones</h3>
          <dl className="info-list">
            <FeeListItems method={method} />
          </dl>
          {method.fees.otherFees.some((rule) => rule.description) ? (
            <ul className="notes-list">
              {method.fees.otherFees
                .filter((rule) => rule.description)
                .map((rule) => (
                  <li key={`desc-${rule.id}`}>{rule.description}</li>
                ))}
            </ul>
          ) : null}
        </section>

        <section className="details-section">
          <h3>Cashback</h3>
          <dl className="info-list">
            <div className="info-row">
              <dt>Tasa</dt>
              <dd>{formatPercent(method.cashback.rate)}</dd>
            </div>
            <div className="info-row">
              <dt>Límite mensual</dt>
              <dd>
                {method.cashback.cap === null
                  ? "Ilimitado"
                  : formatUsd(method.cashback.cap, 2)}
              </dd>
            </div>
            <div className="info-row">
              <dt>Base de cálculo</dt>
              <dd>Monto después de comisiones</dd>
            </div>
          </dl>
        </section>

        <section className="details-section">
          <h3>Requisitos</h3>
          {method.requirements.length > 0 ? (
            <ul className="notes-list">
              {method.requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          ) : (
            <p className="cell-muted">Sin requisitos registrados.</p>
          )}
        </section>

        <section className="details-section">
          <h3>Observaciones</h3>
          {method.observations.length > 0 ? (
            <ul className="notes-list">
              {method.observations.map((observation) => (
                <li key={observation}>{observation}</li>
              ))}
            </ul>
          ) : (
            <p className="cell-muted">Sin observaciones.</p>
          )}
        </section>

        <section className="details-section">
          <h3>Documentación oficial</h3>
          {method.sources.length > 0 ? (
            <ul className="sources-list">
              {method.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cell-muted">Sin documentación registrada.</p>
          )}
        </section>
      </div>
    </article>
  );
}

export default PaymentMethodDetails;
