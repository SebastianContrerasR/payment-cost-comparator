import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import MethodDetailModal from "../src/components/MethodDetailModal/MethodDetailModal";
import { calculateMethod } from "../src/domain/calculator";
import paymentMethods from "../src/data/paymentMethods";

/** Render inicial con los valores por defecto (escenario del Excel). */
const html = renderToString(<App />);

describe("App (renderizado inicial)", () => {
  it("muestra el encabezado con las monedas de la comparación", () => {
    expect(html).toContain("Comparador de métodos de pago");
    expect(html).toContain("Moneda origen: JPY");
    expect(html).toContain("Moneda de referencia: USD");
  });

  it("muestra el panel de entrada con monto y tipos de cambio por defecto", () => {
    expect(html).toContain("Monto JPY");
    expect(html).toContain("50000");
    expect(html).toContain("157.710157");
    expect(html).toContain("157.51008064");
    expect(html).toContain("157.71524839");
  });

  it("muestra los siete métodos en la tabla", () => {
    expect(html).toContain("Binance PayPay");
    expect(html).toContain("OKX Card");
    expect(html).toContain("Binance Card");
    expect(html).toContain("Bybit Card");
    expect(html).toContain(">IO<");
    expect(html).toContain("Bitget Card");
    expect(html).toContain("MEXC Card");
  });

  it("marca MEXC Card como el método más barato con el escenario por defecto", () => {
    expect(html).toContain("El método más económico es");
    expect(html).toContain("MEXC Card");
    expect(html).toContain("$307.3994");
    // Chip del método más barato y fila resaltada.
    expect(html).toContain("Más barato");
    expect(html).toContain("row-cheapest");
  });

  it("muestra por defecto solo las columnas seleccionadas y el selector", () => {
    expect(html).toContain("Columnas");
    expect(html).toContain("Con comisiones");
    expect(html).toContain("Efectivo");
    expect(html).toContain(">Total<");
    // Secundarias, ocultas por defecto. "Marca" solo existe en la tabla y en
    // el detalle (no seleccionado al inicio).
    expect(html).not.toContain("Marca");
    expect(html).not.toContain("Ilimitado");
    expect(html).not.toContain("Potencial");
  });

  it("colorea las cabeceras por grupo de columna", () => {
    expect(html).toContain("th-group-identity"); // nombre (fija)
    expect(html).toContain("th-group-fees"); // Con comisiones
    expect(html).toContain("th-group-cashback"); // Efectivo
    expect(html).toContain("th-group-result"); // Total
    // TC y Base (USD) están ocultas por defecto.
    expect(html).not.toContain("th-group-conversion");
  });

  it("muestra la leyenda de grupos de color", () => {
    expect(html).toContain("table-legend");
    // La leyenda existe aunque sus columnas estén ocultas (avisa del sistema).
    expect(html).toContain("Comisiones");
    expect(html).toContain("Resultado");
  });

  it("no muestra el detalle por defecto: se abre como modal al seleccionar", () => {
    expect(html).toContain("$317.0271");
    expect(html).toContain("Selecciona un método de la tabla para abrir");
    // Sin selección al inicio: ni modal ni paneles de detalle.
    expect(html).not.toContain("method-modal");
    expect(html).not.toContain("method-modal-panel");
  });
});

describe("MethodDetailModal (render SSR)", () => {
  // Escenario del Excel: monto 50000 JPY con las tasas por defecto.
  const exchangeRates = {
    visa: 157.710157,
    mastercard: 157.51008064,
    paypay: 157.71524839,
  };
  const method = paymentMethods.find(
    (candidate) => candidate.id === "binance-card",
  );
  if (!method) {
    throw new Error("El método binance-paypay debe existir en la data.");
  }
  const okResult = calculateMethod(method, 50000, exchangeRates);
  if (okResult.status !== "ok") {
    throw new Error("El caso base debe calcular correctamente.");
  }
  const modalHtml = renderToString(<MethodDetailModal result={okResult} onClose={() => {}} />);

  it("renderiza un diálogo con el nombre del método y sus paneles", () => {
    expect(modalHtml).toContain('role="dialog"');
    expect(modalHtml).toContain("Binance Card");
    expect(modalHtml).toContain("Información del método");
    expect(modalHtml).toContain("Desglose del cálculo");
    expect(modalHtml).toContain("aria-label=\"Cerrar detalle\"");
  });

  it("colorea el desglose con los grupos de la tabla", () => {
    expect(modalHtml).toContain("breakdown-row--conversion"); // TC y conversión
    expect(modalHtml).toContain("breakdown-row--fees"); // FX/crypto/otras
    expect(modalHtml).toContain("breakdown-row--cashback"); // potencial/efectivo
    expect(modalHtml).toContain("breakdown-row--result"); // Total
    expect(modalHtml).toContain("Costo antes de cashback");
  });

  it("renderiza el estado de error del método en el modal", () => {
    const errorResult = calculateMethod(method, null, exchangeRates);
    const errorHtml = renderToString(<MethodDetailModal result={errorResult} onClose={() => {}} />);
    expect(errorHtml).toContain("No se puede calcular con los valores actuales");
    expect(errorHtml).not.toContain("Desglose del cálculo");
  });
});
