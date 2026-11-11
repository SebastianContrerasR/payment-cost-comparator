import type { FundingSummary, PaymentMethod } from "../../domain/types";
import {
  formatPen,
  formatPercent,
  formatRate,
  formatUsd,
} from "../../utils/currency";

interface PaymentMethodDetailsProps {
  method: PaymentMethod;
  funding?: FundingSummary | null;
  onOpenBreakdown?: (id: string) => void;
}

function FundingSection({ method, funding }: PaymentMethodDetailsProps) {
  if (!method.funding) {
    return (
      <section className="details-section">
        <h3>Fondeo</h3>
        <p className="cell-muted">
          No requiere depósito: se paga directo en fiat.
        </p>
      </section>
    );
  }

  if (!funding) {
    return (
      <section className="details-section">
        <h3>Fondeo</h3>
        <p className="cell-muted">
          Sin ruta de depósito configurada para esta cuenta.
        </p>
      </section>
    );
  }

  const external = funding.steps.find((step) => step.network !== null);

  return (
    <section className="details-section details-section--funding">
      <h3>Fondeo</h3>
      <dl className="info-list">
        <div className="info-row">
          <dt>Ruta</dt>
          <dd>{funding.routeLabel}</dd>
        </div>
        <div className="info-row">
          <dt>Entrada</dt>
          <dd>
            {funding.sourceLabel} · {formatRate(funding.penPerUsdt)} S/ por USDT
          </dd>
        </div>
        <div className="info-row">
          <dt>Saldo requerido</dt>
          <dd>
            {formatUsd(funding.targetAmount, 2)} {funding.targetAsset}
          </dd>
        </div>
        <div className="info-row">
          <dt>Red</dt>
          <dd>
            {external && external.network
              ? `${external.network} · ${formatUsd(external.costAmount, 3)}`
              : "Sin transferencia externa"}
          </dd>
        </div>
        <div className="info-row">
          <dt>PEN por compra</dt>
          <dd>{formatPen(funding.penPerPurchase)}</dd>
        </div>
        <div className="info-row">
          <dt>Cashback esperado</dt>
          <dd>
            {formatUsd(funding.cashbackAmount, 2)} {funding.cashbackAsset}
          </dd>
        </div>
        <div className="info-row">
          <dt>Efectividad</dt>
          <dd>{formatPercent(funding.effectivePenPerUnit > 0 ? funding.targetAmount * funding.penPerUsdt / funding.initialPenRequired : 0, 1)}</dd>
        </div>
      </dl>
    </section>
  );
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

export function PaymentMethodDetailsBody({
  method,
  funding,
}: PaymentMethodDetailsProps) {
  return (
      <div className="details-body">
        <FundingSection method={method} funding={funding} />

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
  );
}

export function PaymentMethodDetails({
  method,
  onOpenBreakdown,
}: PaymentMethodDetailsProps) {
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
        {onOpenBreakdown ? (
          <div className="details-actions">
            <button
              type="button"
              className="details-open-breakdown"
              aria-label={`Ver desglose del cálculo de ${method.name}`}
              onClick={() => onOpenBreakdown(method.id)}
            >
              Ver desglose del cálculo
            </button>
          </div>
        ) : null}
      </div>
      <PaymentMethodDetailsBody method={method} />
    </article>
  );
}

export default PaymentMethodDetails;
