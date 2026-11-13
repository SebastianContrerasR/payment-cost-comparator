import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import BreakdownModal from "../src/components/BreakdownModal/BreakdownModal";
import InputPanel from "../src/components/InputPanel/InputPanel";
import FundingRouteBreakdown from "../src/components/FundingRouteBreakdown/FundingRouteBreakdown";
import { calculateMethod } from "../src/domain/calculator";
import { calculateFunding } from "../src/domain/funding";
import paymentMethods from "../src/data/paymentMethods";
import fundingRoutes from "../src/data/fundingRoutes";
import fundingSources from "../src/data/fundingSources";

const html = renderToString(<App />);

describe("App (renderizado inicial)", () => {
  it("muestra el encabezado con las monedas de la comparación", () => {
    expect(html).toContain("Comparador de métodos de pago");
    expect(html).toContain("Moneda origen: JPY");
    expect(html).toContain("Métodos de pago");
    expect(html).toContain("Binance Card (USDC)");
    expect(html).toContain("Binance Card (USDT)");
    expect(html).toContain("Moneda de referencia: USD");
  });

  it("muestra el panel de entrada con monto y tipos de cambio por defecto", () => {
    expect(html).toContain("Monto JPY");
    expect(html).not.toContain("Gasto mensual USD");
    expect(html).toContain("50000");
    expect(html).toContain("157.710157");
    expect(html).toContain("157.51008064");
    expect(html).toContain("157.71524839");
  });

  it("muestra solo los métodos habilitados en la tabla", () => {
    expect(html).toContain("Binance PayPay");
    expect(html).toContain("OKX Card");
    expect(html).toContain("Binance Card");
    expect(html).toContain(">IO<");
    expect(html).toContain("MEXC Card");
    expect(html).toContain("Métodos habilitados");

    expect(html).not.toContain('data-method-id="bybit-card"');
    expect(html).not.toContain('data-method-id="bitget-card"');
  });

  it("permite activar y desactivar métodos desde la configuración", () => {
    expect(html).toContain("Métodos de pago");
    expect(html).toContain("6 activos");
    expect(html).toContain("Bybit Card");
    expect(html).toContain("Bitget Card");
    expect(html).toContain("Todos");
    expect(html).toContain("Restablecer");
  });

  it("elige al ganador por desembolso en soles con el escenario por defecto", () => {
    expect(html).toContain("menor desembolso");
    expect(html).toContain("Binance PayPay");
    expect(html).toContain("S/ 1,198.63");
    expect(html).toContain("$307.3994");

    expect(html).toContain("Más barato");
    expect(html).toContain("row-cheapest");
  });

  it("muestra por defecto solo las columnas seleccionadas y el selector", () => {
    expect(html).toContain("Columnas");
    expect(html).toContain("Con comisiones");
    expect(html).toContain("Efectivo");
    expect(html).toContain(">Total<");

    expect(html).not.toContain("Marca");
    expect(html).not.toContain("Ilimitado");
    expect(html).not.toContain("Potencial");
  });

  it("colorea las cabeceras por grupo de columna", () => {
    expect(html).toContain("th-group-identity");
    expect(html).toContain("th-group-fees");
    expect(html).toContain("th-group-cashback");
    expect(html).toContain("th-group-result");

    expect(html).not.toContain("th-group-conversion");
  });

  it("muestra la leyenda de grupos de color", () => {
    expect(html).toContain("table-legend");

    expect(html).toContain("Comisiones");
    expect(html).toContain("Resultado");
  });

  it("no filtra valores inválidos en el render inicial", () => {
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it("muestra el fondeo con fuentes, mejor ruta y saldos", () => {
    expect(html).toContain("Fondeo");
    expect(html).toContain("Fuentes de adquisición");
    expect(html).toContain("Mejor ruta de fondeo");
    expect(html).toContain("Desembolso");
    expect(html).toContain("funding-table-row--best");
    expect(html).toContain("Más barato:");
    expect(html).toContain("Rutas alternativas y redes · OKX Card");
    expect(html).toContain("planes B de esa misma fila");
    expect(html).toContain("Ver desglose");
    expect(html).toContain("Conversiones de activo");
    expect(html).toContain("Tipo de cambio efectivo");
    expect(html).toContain("USDG por USDT");
    expect(html).toContain("USDC por USDT");
    expect(html).not.toContain(
      "La ruta entrega USDT pero el método requiere USDC",
    );
    expect(html).toContain("Redes descartadas");
    expect(html).not.toContain("Compras que cubre el depósito");
    expect(html).not.toContain("PEN netos");
    expect(html).not.toContain("Costo neto S/");
    expect(html).not.toContain(
      "La ruta entrega USDC pero el método requiere USDT",
    );
    expect(html).toContain("Pago de tarjeta IO");
    expect(html).toContain("funding-table-row--credit");
    expect(html).toContain("Costo neto");
    expect(html).toContain("funding-net-lowest");
    expect(html.indexOf("Ver desglose de la ruta de IO")).toBeGreaterThan(
      html.indexOf("Ver desglose de la ruta de MEXC Card"),
    );
    expect(html).toContain("326.55");
    expect(html).toContain("326.70");
    expect(html).not.toContain("Sin ruta de fondeo disponible");
    expect(html).not.toContain("Tasa de mercado");
    expect(html).not.toContain("Sobrecosto vs mercado");
    expect(html).not.toContain("cuánto debería costar 1 USDT sin");
    expect(html).toContain("no lista BEP20");
  });

  it("no muestra el detalle por defecto: se abre al seleccionar", () => {
    expect(html).toContain("$317.0271");
    expect(html).toContain("Selecciona un método de la tabla para ver");
    expect(html).not.toContain("breakdown-modal");
    expect(html).not.toContain("Requisitos");
  });
});

describe("InputPanel (compra en USD)", () => {
  const usdHtml = renderToString(
    <InputPanel
      currency="USD"
      onCurrencyChange={() => {}}
      amount={500}
      onAmountChange={() => {}}
      methods={paymentMethods}
      activeMethodIds={paymentMethods
        .filter((method) => method.enabled)
        .map((method) => method.id)}
      onToggleMethod={() => {}}
      onSelectAllMethods={() => {}}
      onResetMethods={() => {}}
      exchangeRates={{
        visa: 157.710157,
        mastercard: 157.51008064,
        paypay: 157.71524839,
      }}
      onExchangeRateChange={() => {}}
      onApplyInputs={() => {}}
      onApplyMethods={() => {}}
    />,
  );

  it("ofrece alternar entre inputs individuales y JSON", () => {
    expect(usdHtml).toContain("Modo de edición de entrada");
    expect(usdHtml).toContain("Individual");
    expect(usdHtml).toContain("JSON");
    expect(usdHtml).not.toContain("Configuración JSON");
  });

  it("muestra el monto en dólares y oculta los tipos de cambio", () => {
    expect(usdHtml).toContain("Moneda de compra");
    expect(usdHtml).toContain("Monto USD");
    expect(usdHtml).not.toContain("Gasto mensual USD");
    expect(usdHtml).toContain("Importe de la compra en dólares");
    expect(usdHtml).not.toContain("Tipo de cambio Visa");
    expect(usdHtml).not.toContain("Tipo de cambio Mastercard");
    expect(usdHtml).not.toContain("Tipo de cambio PayPay");
  });

  it("bloquea los métodos que no están disponibles para la moneda", () => {
    expect(usdHtml).toContain("Métodos de pago");
    expect(usdHtml).toContain("5 activos");
    expect(usdHtml).toContain("Binance PayPay");
    expect(usdHtml).toContain("Solo JPY");
    expect(usdHtml).toContain("disabled");
  });

  it("explica que el pago en dólares no tiene conversión ni cross-border", () => {
    expect(usdHtml).toContain("sin conversión de divisa");
    expect(usdHtml).toContain("ni comisiones cross-border");
  });
});

describe("FundingRouteBreakdown (render SSR)", () => {
  const route = fundingRoutes.find(
    (candidate) => candidate.id === "binance-p2p-mexc",
  );
  const source = fundingSources.find(
    (candidate) => candidate.id === route?.sourceId,
  );
  if (!route || !source) {
    throw new Error("La ruta binance-p2p-mexc y su fuente deben existir.");
  }
  const fundingCalculation = calculateFunding({
    route,
    source,
    targetAmount: 100,
    targetAsset: "USDT",
    penPerUsdt: 3.78,
  });
  const routeHtml = renderToString(
    <FundingRouteBreakdown
      methodName="MEXC Card"
      routeLabel={route.label}
      calculation={fundingCalculation}
      onClose={() => {}}
    />,
  );

  it("muestra la cadena desde el depósito en soles hasta el saldo requerido", () => {
    expect(routeHtml).toContain("Desglose del fondeo");
    expect(routeHtml).toContain("Depósito en soles");
    expect(routeHtml).toContain("Comisión de la orden P2P");
    expect(routeHtml).toContain("BEP20");
    expect(routeHtml).toContain("Llega al destino");
    expect(routeHtml).toContain("Saldo requerido por compra");
    expect(routeHtml).toContain("100.000000 USDT");
  });
});

describe("BreakdownModal (render SSR)", () => {

  const exchangeRates = {
    visa: 157.710157,
    mastercard: 157.51008064,
    paypay: 157.71524839,
  };
  const method = paymentMethods.find(
    (candidate) => candidate.id === "binance-card",
  );
  if (!method) {
    throw new Error("El método binance-card debe existir en la data.");
  }
  const okResult = calculateMethod(
    method,
    { currency: "JPY", amount: 50000 },
    exchangeRates,
  );
  if (okResult.status !== "ok") {
    throw new Error("El caso base debe calcular correctamente.");
  }
  const modalHtml = renderToString(
    <BreakdownModal result={okResult} onClose={() => {}} />,
  );

  it("renderiza un diálogo solo con el desglose del método", () => {
    expect(modalHtml).toContain('role="dialog"');
    expect(modalHtml).toContain("Desglose del cálculo");
    expect(modalHtml).toContain("Binance Card");
    expect(modalHtml).toContain('aria-label="Cerrar desglose"');

    expect(modalHtml).not.toContain("Requisitos");
  });

  it("colorea el desglose con los grupos de la tabla", () => {
    expect(modalHtml).toContain("breakdown-row--conversion");
    expect(modalHtml).toContain("breakdown-row--fees");
    expect(modalHtml).toContain("breakdown-row--cashback");
    expect(modalHtml).toContain("breakdown-row--result");
    expect(modalHtml).toContain("Costo antes de cashback");
  });

  it("renderiza el estado de error del método en el modal", () => {
    const errorResult = calculateMethod(
      method,
      { currency: "JPY", amount: null },
      exchangeRates,
    );
    const errorHtml = renderToString(
      <BreakdownModal result={errorResult} onClose={() => {}} />,
    );
    expect(errorHtml).toContain("No se puede calcular con los valores actuales");
    expect(errorHtml).not.toContain("Costo antes de cashback");
  });
});
