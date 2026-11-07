import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../src/App";

/**
 * Prueba de humo de la interfaz: renderizado en servidor de la app con los
 * valores por defecto (escenario del Excel). No abre navegador ni hace I/O.
 */
const html = renderToString(<App />);

describe("App (rendizado inicial)", () => {
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

  it("muestra los totales de la tabla y la pista de detalle", () => {
    expect(html).toContain("$317.0271");
    expect(
      html,
    ).toContain(`Selecciona un método de la tabla para ver su información`);
  });
});
