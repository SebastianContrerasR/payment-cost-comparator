import { describe, expect, it } from "vitest";
import fundingRoutes from "../src/data/fundingRoutes";
import fundingSources from "../src/data/fundingSources";
import {
  applyCashback,
  bestNetwork,
  calculateFunding,
  costAmountForward,
  quoteNetworks,
  requiredBefore,
  simulateFunding,
} from "../src/domain/funding";
import type {
  FundingCost,
  FundingRoute,
  FundingSource,
  NetworkFee,
  PlatformFees,
} from "../src/domain/types";

function routeById(id: string): FundingRoute {
  const route = fundingRoutes.find((candidate) => candidate.id === id);
  if (!route) {
    throw new Error(`Ruta no encontrada en la configuración: ${id}`);
  }
  return route;
}

function sourceById(id: string): FundingSource {
  const source = fundingSources.find((candidate) => candidate.id === id);
  if (!source) {
    throw new Error(`Fuente no encontrada en la configuración: ${id}`);
  }
  return source;
}

function platform(
  name: string,
  networks: NetworkFee[],
): PlatformFees {
  return {
    platform: name,
    label: name,
    checkedAt: "2026-11-09",
    source: { label: name, url: "https://example.com" },
    networks,
  };
}

function network(overrides: Partial<NetworkFee>): NetworkFee {
  return {
    network: "Red",
    networkId: "red",
    asset: "USDT",
    depositFee: 0,
    minDeposit: null,
    withdrawFee: 1,
    minWithdraw: 1,
    canDeposit: true,
    canWithdraw: true,
    feeTreatment: "deducted_from_amount",
    ...overrides,
  };
}

const cost = (overrides: Partial<FundingCost>): FundingCost => ({
  id: "cost",
  label: "Costo",
  type: "fixed",
  value: 1,
  currency: "USDT",
  mode: "deducted_from_amount",
  ...overrides,
});

describe("Fuentes de adquisición", () => {
  it("aplica la comisión fija de Binance una sola vez por orden", () => {
    const calculation = calculateFunding({
      route: routeById("binance-p2p-mexc"),
      source: sourceById("binance-p2p"),
      targetAmount: 100,
      targetAsset: "USDT",
      penPerUsdt: 3.78,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.acquiredUsdt).toBeCloseTo(100.08, 6);
    expect(calculation.result.initialPenRequired).toBeCloseTo(378.31, 2);
    expect(calculation.result.transferNetwork).toBe("BEP20");
  });

  it("propaga el cambio de tasa a todas las rutas de la misma fuente", () => {
    const input = {
      source: sourceById("binance-p2p"),
      targetAmount: 100,
      targetAsset: "USDT" as const,
    };
    const cheap = calculateFunding({
      ...input,
      route: routeById("binance-p2p-binance"),
      penPerUsdt: 3.5,
    });
    const expensive = calculateFunding({
      ...input,
      route: routeById("binance-p2p-binance"),
      penPerUsdt: 4,
    });

    if (cheap.status !== "ok" || expensive.status !== "ok") {
      throw new Error("Ambos escenarios deben calcular correctamente.");
    }

    expect(expensive.result.initialPenRequired).toBeGreaterThan(
      cheap.result.initialPenRequired,
    );
    expect(expensive.result.initialPenRequired / cheap.result.initialPenRequired).toBeCloseTo(
      4 / 3.5,
      2,
    );
  });

  it("una fuente sin comisión no altera la adquisición", () => {
    const calculation = calculateFunding({
      route: routeById("okx-p2p-mexc"),
      source: sourceById("okx-p2p"),
      targetAmount: 100,
      targetAsset: "USDT",
      penPerUsdt: 3.79,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.acquiredUsdt).toBeCloseTo(100.24, 6);
    expect(calculation.result.initialPenRequired).toBeCloseTo(379.91, 2);
  });
});

describe("Transferencias entre plataformas", () => {
  it("Binance → OKX elige Optimism y descarta las redes USDT0", () => {
    const choice = bestNetwork("binance", "okx", 300);
    expect(choice?.network).toBe("Optimism");
    expect(choice?.fee).toBeCloseTo(0.04, 6);
    expect(choice?.asset).toBe("USDT");

    const plasma = choice?.candidates.find(
      (candidate) => candidate.networkId === "plasma",
    );
    expect(plasma?.usable).toBe(false);
    expect(plasma?.reason).toContain("Activo incompatible");
    expect(plasma?.reason).toContain("OKX");
  });

  it("OKX → Binance elige Aptos por costo", () => {
    const choice = bestNetwork("okx", "binance", 300);
    expect(choice?.network).toBe("Aptos");
    expect(choice?.fee).toBeCloseTo(0.00071, 6);
  });

  it("Binance → MEXC elige BEP20 y OKX → MEXC elige Solana", () => {
    expect(bestNetwork("binance", "mexc", 300)?.network).toBe("BEP20");
    expect(bestNetwork("okx", "mexc", 300)?.network).toBe("Solana");
  });

  it("no usa el mínimo de retiro del destino para validar la entrada", () => {
    const choice = bestNetwork("okx", "mexc", 9);
    expect(choice?.network).toBe("Solana");
    const solana = choice?.candidates.find(
      (candidate) => candidate.networkId === "solana",
    );
    expect(solana?.usable).toBe(true);
  });

  it("respeta el mínimo de depósito cuando está especificado", () => {
    const platforms = [
      platform("origen", [network({ networkId: "red" })]),
      platform("destino", [
        network({ networkId: "red", minDeposit: 50, depositFee: 0 }),
      ]),
    ];
    const quotes = quoteNetworks("origen", "destino", 10, platforms);
    expect(quotes[0].usable).toBe(false);
    expect(quotes[0].reason).toContain("Mínimo de depósito");
  });

  it("descarta la red cuando el destino no permite depósitos", () => {
    const platforms = [
      platform("origen", [network({})]),
      platform("destino", [network({ canDeposit: false })]),
    ];
    const quotes = quoteNetworks("origen", "destino", 100, platforms);
    expect(quotes[0].usable).toBe(false);
    expect(quotes[0].reason).toContain("Depósito deshabilitado");
  });

  it("un par sin redes compatibles devuelve null, nunca costo cero", () => {
    expect(bestNetwork("okx", "binance", 1)).toBeNull();
    expect(bestNetwork("mexc", "okx", 100)?.network).toBe("Solana");
  });
});

describe("Casos de redes del plan", () => {
  it("Binance → OKX con 3 USDT descarta TRC20 por el mínimo de Binance", () => {
    const choice = bestNetwork("binance", "okx", 3);
    expect(choice?.network).toBe("Optimism");
    const trc20 = choice?.candidates.find(
      (candidate) => candidate.networkId === "tron",
    );
    expect(trc20?.usable).toBe(false);
    expect(trc20?.reason).toContain("Mínimo de retiro 5");
  });

  it("OKX → MEXC con 9 USDT descarta TRC20 por el mínimo de OKX", () => {
    const choice = bestNetwork("okx", "mexc", 9);
    const trc20 = choice?.candidates.find(
      (candidate) => candidate.networkId === "tron",
    );
    expect(trc20?.usable).toBe(false);
    expect(trc20?.reason).toContain("Mínimo de retiro 10");
  });

  it("una red con activo no confirmado queda descartada", () => {
    const quotes = quoteNetworks("binance", "okx", 300);
    const polygon = quotes.find(
      (candidate) => candidate.networkId === "polygon",
    );
    expect(polygon?.usable).toBe(false);
    expect(polygon?.reason).toContain("USDT0");
  });
});

describe("Conversiones y transferencias internas", () => {
  it("la conversión USDT → USDG usa la tasa efectiva observada", () => {
    const calculation = calculateFunding({
      route: routeById("ligopay-okx-pay"),
      source: sourceById("okx-ligopay"),
      targetAmount: 14.231138,
      targetAsset: "USDG",
      penPerUsdt: 50 / 14.38,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.acquiredUsdt).toBeCloseTo(14.38, 6);
    expect(calculation.result.steps[0].inputAmount).toBeCloseTo(14.38, 6);
    expect(calculation.result.steps[1].costAmount).toBe(0);
  });

  it("aplica tasa de conversión y comisión porcentual en el orden correcto", () => {
    const route: FundingRoute = {
      id: "test-conversion",
      label: "Conversión de prueba",
      sourceId: "test-source",
      enabled: true,
      steps: [
        {
          id: "convert",
          kind: "convert",
          label: "Convertir",
          from: "okx:exchange",
          to: "okx:exchange",
          conversionRate: 0.5,
          toAsset: "USDG",
          cost: cost({ type: "percent", value: 0.1 }),
        },
      ],
    };
    const source: FundingSource = {
      id: "test-source",
      platform: "okx",
      label: "Fuente de prueba",
      penPerUsdt: 1,
      fee: null,
      to: "okx:exchange",
      enabled: true,
    };

    const calculation = calculateFunding({
      route,
      source,
      targetAmount: 45,
      targetAsset: "USDG",
      penPerUsdt: 1,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.steps[0].inputAmount).toBeCloseTo(100, 6);
    expect(calculation.result.steps[0].costAmount).toBeCloseTo(10, 6);
    expect(calculation.result.initialPenRequired).toBeCloseTo(100, 6);
  });

  it("una ruta interna sin costo no agrega comisiones", () => {
    const calculation = calculateFunding({
      route: routeById("binance-p2p-binance"),
      source: sourceById("binance-p2p"),
      targetAmount: 100,
      targetAsset: "USDT",
      penPerUsdt: 3.78,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.steps).toHaveLength(0);
    expect(calculation.result.initialPenRequired).toBeCloseTo(378.27, 2);
  });

  it("distingue comisiones descontadas de las cobradas por encima", () => {
    const deducted = cost({ mode: "deducted_from_amount", value: 2 });
    const onTop = cost({ mode: "charged_on_top", value: 2 });

    expect(requiredBefore(100, deducted)).toBeCloseTo(102, 6);
    expect(requiredBefore(100, onTop)).toBeCloseTo(102, 6);
    expect(costAmountForward(102, deducted).output).toBeCloseTo(100, 6);
    expect(costAmountForward(100, onTop).consumed).toBeCloseTo(102, 6);
  });
});

describe("Cálculo inverso y redondeo", () => {
  it("el saldo final recibido nunca queda por debajo del objetivo", () => {
    const calculation = calculateFunding({
      route: routeById("binance-p2p-mexc"),
      source: sourceById("binance-p2p"),
      targetAmount: 33.333333,
      targetAsset: "USDT",
      penPerUsdt: 3.78,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    expect(calculation.result.finalAmountReceived).toBeGreaterThanOrEqual(
      33.333333,
    );
    expect(calculation.result.acquiredUsdt).toBeGreaterThanOrEqual(33.333333);
    expect(calculation.result.initialPenRequired).toBeGreaterThan(0);
  });

  it("el cálculo directo reconstruye el saldo final de una ruta sin red", () => {
    const forward = simulateFunding({
      route: routeById("ligopay-okx-pay"),
      source: sourceById("okx-ligopay"),
      pen: 50,
      penPerUsdt: 50 / 14.38,
    });

    if (!forward) {
      throw new Error("La simulación directa no debería fallar.");
    }

    expect(forward.acquiredUsdt).toBeCloseTo(14.38, 6);
    expect(forward.finalAmount).toBeCloseTo(14.231138, 6);
  });
});

describe("Cashback", () => {
  it("no reduce los PEN iniciales y se descuenta solo en el costo neto", () => {
    const calculation = calculateFunding({
      route: routeById("binance-p2p-mexc"),
      source: sourceById("binance-p2p"),
      targetAmount: 307.3994,
      targetAsset: "USDT",
      penPerUsdt: 3.78,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    const summary = applyCashback(
      calculation.result,
      { methodId: "mexc-card", methodName: "MEXC Card" },
      12.8083,
      "USDT",
      3.72,
    );

    expect(summary.initialPenRequired).toBe(
      calculation.result.initialPenRequired,
    );
    expect(summary.cashbackValuePen).toBeCloseTo(47.6469, 4);
    expect(summary.netEconomicCostPen).toBeCloseTo(
      summary.initialPenRequired - 47.6469,
      4,
    );
  });

  it("reparte los costos fijos entre las compras del depósito", () => {
    const base = {
      route: routeById("binance-p2p-mexc"),
      source: sourceById("binance-p2p"),
      targetAmount: 100,
      targetAsset: "USDT" as const,
      penPerUsdt: 3.78,
    };
    const single = calculateFunding({ ...base, purchasesPerDeposit: 1 });
    const monthly = calculateFunding({ ...base, purchasesPerDeposit: 4 });

    if (single.status !== "ok" || monthly.status !== "ok") {
      throw new Error("Ambos escenarios deben calcular correctamente.");
    }

    const singleSummary = applyCashback(
      single.result,
      { methodId: "mexc-card", methodName: "MEXC Card" },
      0,
      "USD",
      3.78,
    );
    const monthlySummary = applyCashback(
      monthly.result,
      { methodId: "mexc-card", methodName: "MEXC Card" },
      0,
      "USD",
      3.78,
    );

    expect(monthly.result.initialPenRequired).toBeGreaterThan(
      single.result.initialPenRequired,
    );
    expect(monthlySummary.penPerPurchase).toBeLessThan(
      singleSummary.penPerPurchase,
    );
    expect(monthlySummary.netEconomicCostPen).toBeCloseTo(
      monthlySummary.penPerPurchase,
      6,
    );
  });

  it("sin tasa de valoración no inventa un costo neto en PEN", () => {
    const calculation = calculateFunding({
      route: routeById("binance-p2p-binance"),
      source: sourceById("binance-p2p"),
      targetAmount: 100,
      targetAsset: "USDT",
      penPerUsdt: 3.78,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    const summary = applyCashback(
      calculation.result,
      { methodId: "binance-paypay", methodName: "Binance PayPay" },
      0,
      "USD",
      null,
    );

    expect(summary.cashbackValuePen).toBeNull();
    expect(summary.netEconomicCostPen).toBeNull();
  });
});

describe("Regresión histórica: OKX LigoPay del 7 de octubre de 2025", () => {
  it("reproduce S/ 50.00 → 14.38 USDT → 14.231138 USDG", () => {
    const calculation = calculateFunding({
      route: routeById("ligopay-okx-pay"),
      source: sourceById("okx-ligopay"),
      targetAmount: 14.231138,
      targetAsset: "USDG",
      penPerUsdt: 50 / 14.38,
    });

    if (calculation.status !== "ok") {
      throw new Error(`El cálculo devolvió error: ${calculation.reason}`);
    }

    const { result } = calculation;
    expect(result.initialPenRequired).toBeCloseTo(50, 2);
    expect(result.acquiredUsdt).toBeCloseTo(14.38, 6);
    expect(result.finalAmountReceived).toBeCloseTo(14.231138, 6);
    expect(result.effectivePenPerUnit).toBeCloseTo(3.513422, 4);
  });
});
