import fundingPlatforms from "../data/fundingNetworks";
import type {
  Asset,
  FundingCalculation,
  FundingCost,
  FundingResult,
  FundingRoute,
  FundingSource,
  FundingStep,
  FundingStepResult,
  FundingSummary,
  NetworkChoice,
  NetworkQuote,
  PlatformFees,
} from "./types";

const AUTO_NETWORK = "auto";

export interface FundingInput {
  route: FundingRoute;
  source: FundingSource;
  targetAmount: number | null;
  targetAsset: Asset;
  penPerUsdt: number | null;
  purchasesPerDeposit?: number;
  networkOverride?: string | null;
  platforms?: readonly PlatformFees[];
}

export interface FundingForwardInput {
  route: FundingRoute;
  source: FundingSource;
  pen: number;
  penPerUsdt: number | null;
  networkOverride?: string | null;
  platforms?: readonly PlatformFees[];
}

export interface FundingForwardResult {
  finalAmount: number;
  acquiredUsdt: number;
  steps: FundingStepResult[];
}

export function platformOf(account: string): string {
  const separator = account.indexOf(":");
  return separator === -1 ? account : account.slice(0, separator);
}

export function roundUp(value: number, decimals = 6): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** decimals;
  return Math.ceil(value * factor - 1e-9) / factor;
}

export function requiredBefore(amount: number, cost: FundingCost): number {
  if (cost.type === "fixed") {
    return amount + cost.value;
  }
  return cost.mode === "deducted_from_amount"
    ? amount / (1 - cost.value)
    : amount * (1 + cost.value);
}

export function costAmountForward(
  amount: number,
  cost: FundingCost,
): { output: number; consumed: number } {
  if (cost.type === "fixed") {
    return cost.mode === "deducted_from_amount"
      ? { output: Math.max(0, amount - cost.value), consumed: amount }
      : { output: amount, consumed: amount + cost.value };
  }
  return cost.mode === "deducted_from_amount"
    ? { output: amount * (1 - cost.value), consumed: amount }
    : { output: amount, consumed: amount * (1 + cost.value) };
}

function unusableQuote(
  network: { network: string; networkId: string; asset: "USDT" | "USDT0" },
  networkFee: { withdrawFee: number; minWithdraw: number },
  reason: string,
): NetworkQuote {
  return {
    network: network.network,
    networkId: network.networkId,
    asset: network.asset,
    fee: networkFee.withdrawFee,
    minWithdraw: networkFee.minWithdraw,
    minDeposit: null,
    usable: false,
    reason,
  };
}

export function quoteNetworks(
  from: string,
  to: string,
  amountUsdt: number,
  platforms: readonly PlatformFees[] = fundingPlatforms,
): NetworkQuote[] {
  const sender = platforms.find((platform) => platform.platform === from);
  if (!sender) {
    return [];
  }
  const receiver = platforms.find((platform) => platform.platform === to);
  const quotes: NetworkQuote[] = [];

  for (const network of sender.networks) {
    if (!network.canWithdraw) {
      quotes.push(unusableQuote(network, network, "Retiro deshabilitado en el origen"));
      continue;
    }
    if (!receiver) {
      quotes.push(unusableQuote(network, network, "El destino no tiene tarifas registradas"));
      continue;
    }
    const target = receiver.networks.find(
      (candidate) =>
        candidate.networkId === network.networkId &&
        candidate.asset === network.asset,
    );
    if (!target) {
      const sameNetwork = receiver.networks.find(
        (candidate) => candidate.networkId === network.networkId,
      );
      quotes.push(
        unusableQuote(
          network,
          network,
          sameNetwork
            ? `Activo incompatible: ${network.asset} en origen y ${sameNetwork.asset} en ${receiver.label}`
            : `${receiver.label} no lista ${network.network}`,
        ),
      );
      continue;
    }
    if (!target.canDeposit) {
      quotes.push(unusableQuote(network, network, "Depósito deshabilitado en el destino"));
      continue;
    }

    const reasons: string[] = [];
    if (amountUsdt < network.minWithdraw) {
      reasons.push(`Mínimo de retiro ${network.minWithdraw} USDT`);
    }
    if (target.minDeposit !== null && amountUsdt < target.minDeposit) {
      reasons.push(`Mínimo de depósito ${target.minDeposit} USDT`);
    }

    quotes.push({
      network: network.network,
      networkId: network.networkId,
      asset: network.asset,
      fee: network.withdrawFee + target.depositFee,
      minWithdraw: network.minWithdraw,
      minDeposit: target.minDeposit,
      usable: reasons.length === 0,
      reason: reasons[0],
    });
  }

  return quotes;
}

export function bestNetwork(
  from: string,
  to: string,
  amountUsdt: number,
  platforms: readonly PlatformFees[] = fundingPlatforms,
): NetworkChoice | null {
  const candidates = quoteNetworks(from, to, amountUsdt, platforms);
  const usable = candidates
    .filter((candidate) => candidate.usable)
    .sort(
      (first, second) =>
        first.fee - second.fee || first.minWithdraw - second.minWithdraw,
    );
  const winner = usable[0];
  if (!winner) {
    return null;
  }
  return {
    network: winner.network,
    networkId: winner.networkId,
    asset: winner.asset,
    fee: winner.fee,
    candidates,
  };
}

export function routeAsset(route: FundingRoute): Asset {
  let asset: Asset = route.asset ?? "USDT";
  for (const step of route.steps) {
    if (step.kind === "convert" && step.toAsset) {
      asset = step.toAsset;
    }
  }
  return asset;
}

export function routeDestination(route: FundingRoute, source: FundingSource): string {
  const last = route.steps[route.steps.length - 1];
  return last ? last.to : source.to;
}

function resolveTransfer(
  step: FundingStep,
  outputUSDT: number,
  override: string | null | undefined,
  platforms: readonly PlatformFees[],
): { result: FundingStepResult } | { reason: string } {
  const from = platformOf(step.from);
  const to = platformOf(step.to);
  const requestedNetwork =
    override ?? (step.network === AUTO_NETWORK ? null : step.network ?? null);
  const choice = requestedNetwork
    ? (() => {
        const quotes = quoteNetworks(from, to, outputUSDT, platforms);
        const quote = quotes.find(
          (candidate) =>
            candidate.networkId === requestedNetwork ||
            candidate.network === requestedNetwork,
        );
        if (!quote) {
          return null;
        }
        return quote.usable
          ? {
              network: quote.network,
              networkId: quote.networkId,
              asset: quote.asset,
              fee: quote.fee,
              candidates: quotes,
            }
          : null;
      })()
    : bestNetwork(from, to, outputUSDT, platforms);

  if (!choice) {
    const quotes = quoteNetworks(from, to, outputUSDT, platforms);
    const blocked = requestedNetwork
      ? quotes.find(
          (candidate) =>
            candidate.networkId === requestedNetwork ||
            candidate.network === requestedNetwork,
        )
      : undefined;
    return {
      reason:
        blocked?.reason ??
        `No hay una red compatible entre ${from} y ${to} para ${outputUSDT.toFixed(2)} USDT.`,
    };
  }

  return {
    result: {
      id: step.id,
      label: step.label,
      kind: "transfer",
      from: step.from,
      to: step.to,
      inputAmount: roundUp(outputUSDT + choice.fee, 6),
      outputAmount: outputUSDT,
      costAmount: choice.fee,
      asset: choice.asset,
      network: choice.network,
      notes: step.notes ?? [],
      candidates: choice.candidates,
    },
  };
}

export function calculateFunding(input: FundingInput): FundingCalculation {
  const { route, source } = input;
  const platforms = input.platforms ?? fundingPlatforms;
  const failure = (reason: string): FundingCalculation => ({
    status: "error",
    routeId: route.id,
    reason,
  });

  const target = input.targetAmount;
  if (target === null || !Number.isFinite(target) || target <= 0) {
    return failure("Falta un monto de compra válido para calcular el fondeo.");
  }
  if (routeAsset(route) !== input.targetAsset) {
    return failure(
      `La ruta entrega ${routeAsset(route)} pero el método requiere ${input.targetAsset}.`,
    );
  }

  const penPerUsdt = input.penPerUsdt;
  if (penPerUsdt === null || !Number.isFinite(penPerUsdt) || penPerUsdt <= 0) {
    return failure("El tipo de cambio de la fuente debe ser mayor que cero.");
  }

  const purchases = Math.max(
    1,
    Math.floor(input.purchasesPerDeposit ?? 1),
  );
  const totalTarget = target * purchases;

  let required = roundUp(totalTarget, 6);
  const steps: FundingStepResult[] = [];

  for (let index = route.steps.length - 1; index >= 0; index -= 1) {
    const step = route.steps[index];
    if (!step || step.enabled === false) {
      continue;
    }

    if (step.kind === "transfer") {
      if (step.network === undefined) {
        const before = step.cost
          ? requiredBefore(required, step.cost)
          : required;
        steps.unshift({
          id: step.id,
          label: step.label,
          kind: "transfer",
          from: step.from,
          to: step.to,
          inputAmount: roundUp(before, 6),
          outputAmount: required,
          costAmount: before - required,
          asset: routeAsset(route),
          network: null,
          notes: step.notes ?? [],
          candidates: [],
        });
        required = roundUp(before, 6);
        continue;
      }
      const resolved = resolveTransfer(
        step,
        required,
        input.networkOverride,
        platforms,
      );
      if ("reason" in resolved) {
        return failure(resolved.reason);
      }
      steps.unshift(resolved.result);
      required = resolved.result.inputAmount;
      continue;
    }

    const rate = step.conversionRate ?? 1;
    if (!Number.isFinite(rate) || rate <= 0) {
      return failure(`La tasa de conversión de "${step.label}" debe ser mayor que cero.`);
    }
    const afterRate = required / rate;
    const before = step.cost ? requiredBefore(afterRate, step.cost) : afterRate;
    steps.unshift({
      id: step.id,
      label: step.label,
      kind: "convert",
      from: step.from,
      to: step.to,
      inputAmount: roundUp(before, 6),
      outputAmount: required,
      costAmount: before - afterRate,
      asset: step.toAsset ?? "USDT",
      network: null,
      notes: step.notes ?? [],
      candidates: [],
    });
    required = roundUp(before, 6);
  }

  const gross = source.fee ? requiredBefore(required, source.fee) : required;
  const acquiredUsdt = roundUp(gross, 6);
  const initialPenRequired = roundUp(acquiredUsdt * penPerUsdt, 2);

  const external = steps.find((step) => step.network !== null);
  const conversionCosts = steps
    .filter((step) => step.kind === "convert")
    .reduce((sum, step) => sum + step.costAmount, 0);

  const result: FundingResult = {
    routeId: route.id,
    routeLabel: route.label,
    sourceId: source.id,
    sourceLabel: source.label,
    destinationPlatform: platformOf(routeDestination(route, source)),
    targetAsset: input.targetAsset,
    targetAmount: target,
    initialPenRequired,
    acquiredUsdt,
    finalAmountReceived: totalTarget,
    effectivePenPerUnit: initialPenRequired / totalTarget,
    transferNetwork: external?.network ?? undefined,
    transferFee: external?.costAmount,
    conversionCosts,
    steps,
    purchases,
    penPerUsdt,
  };

  return { status: "ok", result };
}

export function isCardFunding(result: {
  steps: readonly unknown[];
  targetAsset: Asset;
}): boolean {
  return result.steps.length === 0 && result.targetAsset === "USD";
}

export function applyCashback(
  result: FundingResult,
  method: { methodId: string; methodName: string },
  cashbackAmount: number,
  cashbackAsset: string,
  cashbackPenPerUsd: number | null,
): FundingSummary {
  const cashbackValuePen =
    cashbackPenPerUsd === null || !Number.isFinite(cashbackPenPerUsd)
      ? null
      : cashbackAmount * cashbackPenPerUsd;
  const penPerPurchase =
    result.purchases > 0
      ? result.initialPenRequired / result.purchases
      : result.initialPenRequired;
  return {
    ...result,
    methodId: method.methodId,
    methodName: method.methodName,
    cashbackAmount,
    cashbackAsset,
    cashbackValuePen,
    netEconomicCostPen:
      cashbackValuePen === null ? null : penPerPurchase - cashbackValuePen,
    penPerPurchase,
  };
}

export function simulateFunding(input: FundingForwardInput): FundingForwardResult | null {
  const { route, source } = input;
  const platforms = input.platforms ?? fundingPlatforms;
  const penPerUsdt = input.penPerUsdt;
  if (penPerUsdt === null || !Number.isFinite(penPerUsdt) || penPerUsdt <= 0) {
    return null;
  }

  const gross = input.pen / penPerUsdt;
  const acquiredUsdt =
    source.fee
      ? costAmountForward(gross, source.fee).output
      : gross;
  let amount = acquiredUsdt;
  const steps: FundingStepResult[] = [];

  for (const step of route.steps) {
    if (step.enabled === false) {
      continue;
    }
    if (step.kind === "convert") {
      const rate = step.conversionRate ?? 1;
      const afterRate = amount * rate;
      const applied = step.cost
        ? costAmountForward(afterRate, step.cost)
        : { output: afterRate, consumed: afterRate };
      steps.push({
        id: step.id,
        label: step.label,
        kind: "convert",
        from: step.from,
        to: step.to,
        inputAmount: amount,
        outputAmount: applied.output,
        costAmount: applied.consumed - applied.output,
        asset: step.toAsset ?? "USDT",
        network: null,
        notes: step.notes ?? [],
        candidates: [],
      });
      amount = applied.output;
      continue;
    }

    if (step.network === undefined) {
      const applied = step.cost
        ? costAmountForward(amount, step.cost)
        : { output: amount, consumed: amount };
      steps.push({
        id: step.id,
        label: step.label,
        kind: "transfer",
        from: step.from,
        to: step.to,
        inputAmount: amount,
        outputAmount: applied.output,
        costAmount: applied.consumed - applied.output,
        asset: "USDT",
        network: null,
        notes: step.notes ?? [],
        candidates: [],
      });
      amount = applied.output;
      continue;
    }

    const choice = bestNetwork(
      platformOf(step.from),
      platformOf(step.to),
      amount,
      platforms,
    );
    if (!choice) {
      return null;
    }
    const received = Math.max(0, amount - choice.fee);
    steps.push({
      id: step.id,
      label: step.label,
      kind: "transfer",
      from: step.from,
      to: step.to,
      inputAmount: amount,
      outputAmount: received,
      costAmount: choice.fee,
      asset: choice.asset,
      network: choice.network,
      notes: step.notes ?? [],
      candidates: choice.candidates,
    });
    amount = received;
  }

  return { finalAmount: amount, acquiredUsdt, steps };
}
