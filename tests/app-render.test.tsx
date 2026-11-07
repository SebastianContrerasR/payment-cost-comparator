import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../src/App";

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

  it("muestra los totales de la tabla y la pista de detalle", () => {
    expect(html).toContain("$317.0271");
    expect(html).toContain(
      "Selecciona un método de la tabla para ver su información",
    );
  });
});
