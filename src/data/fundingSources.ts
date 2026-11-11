import type { FundingSource } from "../domain/types";

const fundingSources: FundingSource[] = [
  {
    id: "binance-p2p",
    platform: "binance",
    label: "Binance P2P",
    penPerUsdt: 3.78,
    fee: {
      id: "binance-p2p-order",
      label: "Comisión por orden P2P",
      type: "fixed",
      value: 0.07,
      currency: "USDT",
      mode: "deducted_from_amount",
    },
    to: "binance:spot",
    enabled: true,
    updatedAt: "2026-11-09",
    notes: [
      "Binance cobra 0.07 USDT por cada orden de compra o venta en P2P.",
      "La tasa se consulta una vez al mes y se comparte entre todas las rutas de Binance.",
    ],
    source: {
      label: "Binance P2P",
      url: "https://p2p.binance.com/",
    },
  },
  {
    id: "io-card",
    platform: "io",
    label: "Pago de tarjeta IO",
    penPerUsdt: 3.75,
    rateLabel: "Cambio (S/ por USD de deuda)",
    fee: {
      id: "io-card-payment-fee",
      label: "Comisión de pago de la tarjeta",
      type: "fixed",
      value: 0,
      currency: "USD",
      mode: "charged_on_top",
    },
    to: "io:card",
    enabled: true,
    updatedAt: "2026-11-10",
    notes: [
      "La tarjeta se paga en soles desde tu cuenta: no hay compra de cripto ni red de transferencia.",
      "El saldo requerido es el total con comisiones de la tabla principal; el cashback del 1% se descuenta en el costo neto.",
      "Ajusta el tipo de cambio al que tu banco te cobra el dólar de la deuda.",
    ],
    source: {
      label: "IO — tarjeta de crédito",
      url: "https://www.io.pe/",
    },
  },
  {
    id: "okx-p2p",
    platform: "okx",
    label: "OKX P2P",
    penPerUsdt: 3.79,
    fee: null,
    to: "okx:exchange",
    enabled: true,
    updatedAt: "2026-11-09",
    notes: [
      "Sin comisión por orden: el costo se paga en la tasa.",
      "Buena liquidez y ofertas competitivas para PEN.",
    ],
    source: {
      label: "OKX P2P",
      url: "https://www.okx.com/p2p-markets",
    },
  },
  {
    id: "okx-ligopay",
    platform: "okx",
    label: "OKX LigoPay",
    penPerUsdt: 3.79,
    fee: null,
    to: "okx:exchange",
    enabled: true,
    updatedAt: "2026-11-09",
    notes: [
      "Disponible en Perú como depósito fiat directo hacia OKX.",
      "Tasa inicial de referencia: actualízala con la cotización del mes.",
      "El registro histórico del 7 de octubre de 2025 (S/ 50.00 por 14.38 USDT) se conserva como prueba de regresión, no como cotización vigente.",
    ],
    source: {
      label: "OKX — compra de cripto vía OKX LigoPay",
      url: "https://www.okx.com/buy-crypto",
    },
  },
];

export default fundingSources;
