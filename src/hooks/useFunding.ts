import { useCallback, useEffect, useMemo, useState } from "react";
import fundingPlatforms, { platformLabel } from "../data/fundingNetworks";
import fundingRoutes from "../data/fundingRoutes";
import fundingSources from "../data/fundingSources";
import {
  applyCashback,
  calculateFunding,
  defaultConversionRates,
  platformOf,
  routeAsset,
  routeDestination,
} from "../domain/funding";
import type {
  Asset,
  CalculationResult,
  FundingCalculation,
  FundingRoute,
  FundingSummary,
  NetworkQuote,
} from "../domain/types";

const STORAGE_KEY = "payment-cost-comparator.funding";

export interface FundingSettings {
  rates: Record<string, number | null>;
  fees: Record<string, number | null>;
  sourcesEnabled: Record<string, boolean>;
  routesEnabled: Record<string, boolean>;
  networkOverrides: Record<string, string | null>;
  conversionRates: Record<string, number | null>;
}

export interface FundingConversionView {
  key: string;
  platformLabel: string;
  fromAsset: Asset;
  toAsset: Asset;
  rate: number | null;
}

export interface FundingSourceView {
  id: string;
  label: string;
  platformLabel: string;
  penPerUsdt: number | null;
  rateLabel?: string;
  feeValue: number | null;
  feeUnit: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface FundingOptionView {
  routeId: string;
  label: string;
  calculation: FundingCalculation;
  networkOverride: string | null;
  candidates: NetworkQuote[];
  overcostPen: number | null;
}

export interface FundingMethodView {
  methodId: string;
  methodName: string;
  platformLabel: string;
  targetAsset: Asset;
  targetAmount: number;
  cashbackTiming: string;
  best: FundingSummary | null;
  options: FundingOptionView[];
}

export interface FundingModel {
  settings: FundingSettings;
  sourceViews: FundingSourceView[];
  methodViews: FundingMethodView[];
  conversionViews: FundingConversionView[];
  winnerMethodId: string | null;
  byMethodId: Record<string, FundingSummary>;
  methodsWithoutRoute: string[];
  setSourceRate: (sourceId: string, value: number | null) => void;
  setSourceFee: (sourceId: string, value: number | null) => void;
  toggleSource: (sourceId: string) => void;
  toggleRoute: (routeId: string) => void;
  setNetworkOverride: (routeId: string, networkId: string | null) => void;
  setConversionRate: (key: string, value: number | null) => void;
  applySettings: (update: Partial<FundingSettings>) => void;
}

function defaultSettings(): FundingSettings {
  return {
    rates: Object.fromEntries(
      fundingSources.map((source) => [source.id, source.penPerUsdt]),
    ),
    fees: Object.fromEntries(
      fundingSources.map((source) => [source.id, source.fee?.value ?? null]),
    ),
    sourcesEnabled: Object.fromEntries(
      fundingSources.map((source) => [source.id, source.enabled]),
    ),
    routesEnabled: Object.fromEntries(
      fundingRoutes.map((route) => [route.id, route.enabled]),
    ),
    networkOverrides: {},
    conversionRates: defaultConversionRates(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumberMap(value: unknown, fallback: Record<string, number | null>) {
  if (!isRecord(value)) {
    return fallback;
  }
  const result: Record<string, number | null> = { ...fallback };
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null) {
      result[key] = null;
    } else if (typeof entry === "number" && Number.isFinite(entry)) {
      result[key] = entry;
    }
  }
  return result;
}

function readBooleanMap(value: unknown, fallback: Record<string, boolean>) {
  if (!isRecord(value)) {
    return fallback;
  }
  const result: Record<string, boolean> = { ...fallback };
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") {
      result[key] = entry;
    }
  }
  return result;
}

function readOverrideMap(value: unknown) {
  if (!isRecord(value)) {
    return {} as Record<string, string | null>;
  }
  const result: Record<string, string | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null) {
      result[key] = null;
    } else if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return result;
}

export function readFundingSettings(): FundingSettings {
  const defaults = defaultSettings();
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return defaults;
    }
    return {
      rates: readNumberMap(parsed.rates, defaults.rates),
      fees: readNumberMap(parsed.fees, defaults.fees),
      sourcesEnabled: readBooleanMap(parsed.sourcesEnabled, defaults.sourcesEnabled),
      routesEnabled: readBooleanMap(parsed.routesEnabled, defaults.routesEnabled),
      networkOverrides: readOverrideMap(parsed.networkOverrides),
      conversionRates: readNumberMap(
        parsed.conversionRates,
        defaults.conversionRates,
      ),
    };
  } catch {
    return defaults;
  }
}

export function useFunding(results: CalculationResult[]): FundingModel {
  const [settings, setSettings] = useState<FundingSettings>(readFundingSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      return;
    }
  }, [settings]);

  const resultByMethodId = useMemo(() => {
    const map = new Map<
      string,
      {
        methodId: string;
        methodName: string;
        platform: string;
        account: string;
        asset: Asset;
        targetAmount: number;
        cashbackAmount: number;
        cashbackAsset: string;
        cashbackTiming: string;
      }
    >();
    for (const result of results) {
      const requirement = result.method.funding;
      if (result.status !== "ok" || !requirement) {
        continue;
      }
      map.set(result.method.id, {
        methodId: result.method.id,
        methodName: result.method.name,
        platform: requirement.account.split(":")[0] ?? requirement.account,
        account: requirement.account,
        asset: requirement.asset,
        targetAmount: result.breakdown.totalBeforeCashbackUSD,
        cashbackAmount: result.breakdown.effectiveCashbackUSD,
        cashbackAsset: result.method.cashback.currency || "USD",
        cashbackTiming: result.method.cashback.timing ?? "",
      });
    }
    return map;
  }, [results]);

  const sourceViews: FundingSourceView[] = useMemo(
    () =>
      fundingSources.map((source) => ({
        id: source.id,
        label: source.label,
        platformLabel: platformLabel(source.platform),
        penPerUsdt: settings.rates[source.id] ?? null,
        rateLabel: source.rateLabel,
        feeValue: settings.fees[source.id] ?? null,
        feeUnit: source.fee?.currency ?? "USDT",
        enabled: settings.sourcesEnabled[source.id] ?? source.enabled,
        updatedAt: source.updatedAt,
      })),
    [settings],
  );

  const conversionViews = useMemo<FundingConversionView[]>(() => {
    const views = new Map<string, FundingConversionView>();
    for (const route of fundingRoutes) {
      for (const step of route.steps) {
        if (step.kind !== "convert" || !step.toAsset) {
          continue;
        }
        const platform = platformOf(step.to);
        const key = `${platform}:${step.toAsset}`;
        if (views.has(key)) {
          continue;
        }
        views.set(key, {
          key,
          platformLabel: platformLabel(platform),
          fromAsset: "USDT",
          toAsset: step.toAsset,
          rate: settings.conversionRates[key] ?? null,
        });
      }
    }
    return Array.from(views.values());
  }, [settings.conversionRates]);

  const methodViews: FundingMethodView[] = useMemo(() => {
    const views: FundingMethodView[] = [];

    for (const method of resultByMethodId.values()) {
      const options: FundingOptionView[] = [];

      for (const route of fundingRoutes) {
        const source = fundingSources.find(
          (candidate) => candidate.id === route.sourceId,
        );
        if (!source) {
          continue;
        }
        if (routeDestination(route, source) !== method.account) {
          continue;
        }
        const routeEnabled = settings.routesEnabled[route.id] ?? route.enabled;
        const sourceEnabled =
          settings.sourcesEnabled[source.id] ?? source.enabled;
        if (!routeEnabled) {
          continue;
        }

        const override = settings.networkOverrides[route.id] ?? null;
        const penPerUsdt = settings.rates[source.id] ?? null;
        const feeValue = settings.fees[source.id] ?? null;
        const sourceWithFee = {
          ...source,
          penPerUsdt: penPerUsdt ?? 0,
          fee: source.fee ? { ...source.fee, value: feeValue ?? 0 } : null,
        };

        if (!sourceEnabled) {
          options.push({
            routeId: route.id,
            label: route.label,
            calculation: {
              status: "error",
              routeId: route.id,
              reason: "La fuente de adquisición está deshabilitada.",
            },
            networkOverride: override,
            candidates: [],
            overcostPen: null,
          });
          continue;
        }

        const routeWithRates: FundingRoute = {
          ...route,
          steps: route.steps.map((step) => {
            if (step.kind !== "convert" || !step.toAsset) {
              return step;
            }
            const rate =
              settings.conversionRates[
                `${platformOf(step.to)}:${step.toAsset}`
              ];
            return {
              ...step,
              conversionRate: rate === undefined || rate === null ? 0 : rate,
            };
          }),
        };

        const deliveredAsset = routeAsset(routeWithRates);
        const destinationPlatform = platformOf(method.account);
        const directRate =
          settings.conversionRates[`${destinationPlatform}:${method.asset}`];
        const reverseRate =
          settings.conversionRates[`${destinationPlatform}:${deliveredAsset}`];
        const conversionRate =
          typeof directRate === "number" &&
          Number.isFinite(directRate) &&
          directRate > 0
            ? directRate
            : typeof reverseRate === "number" &&
                Number.isFinite(reverseRate) &&
                reverseRate > 0
              ? 1 / reverseRate
              : null;
        const routeForMethod: FundingRoute =
          deliveredAsset !== method.asset && conversionRate !== null
            ? {
                ...routeWithRates,
                steps: [
                  ...routeWithRates.steps,
                  {
                    id: `conversion-${route.id}-${method.asset}`,
                    kind: "convert",
                    label: `${deliveredAsset} → ${method.asset}`,
                    from: method.account,
                    to: method.account,
                    conversionRate,
                    toAsset: method.asset,
                    notes: [
                      "Conversión necesaria para llegar al activo que exige este método.",
                    ],
                  },
                ],
              }
            : routeWithRates;

        const base = {
          route: routeForMethod,
          source: sourceWithFee,
          targetAmount: method.targetAmount,
          targetAsset: method.asset,
          penPerUsdt,
          platforms: fundingPlatforms,
        };
        const calculation = calculateFunding({
          ...base,
          networkOverride: override,
        });
        const automatic = calculateFunding({ ...base, networkOverride: null });
        const candidates =
          automatic.status === "ok"
            ? automatic.result.steps.find((step) => step.network !== null)
                ?.candidates ?? []
            : [];

        options.push({
          routeId: route.id,
          label: route.label,
          calculation,
          networkOverride: override,
          candidates,
          overcostPen:
            calculation.status === "ok" && automatic.status === "ok"
              ? calculation.result.initialPenRequired -
                automatic.result.initialPenRequired
              : null,
        });
      }

      let best: FundingSummary | null = null;
      for (const option of options) {
        if (option.calculation.status !== "ok") {
          continue;
        }
        const result = option.calculation.result;
        if (!best || result.initialPenRequired < best.initialPenRequired) {
          best = applyCashback(
            result,
            { methodId: method.methodId, methodName: method.methodName },
            method.cashbackAmount,
            method.cashbackAsset,
            null,
          );
        }
      }

      views.push({
        methodId: method.methodId,
        methodName: method.methodName,
        platformLabel: platformLabel(method.platform),
        targetAsset: method.asset,
        targetAmount: method.targetAmount,
        cashbackTiming: method.cashbackTiming,
        best,
        options,
      });
    }

    return views;
  }, [resultByMethodId, settings]);

  const winnerMethodId = useMemo(() => {
    let winner: { methodId: string; score: number } | null = null;
    for (const view of methodViews) {
      if (!view.best) {
        continue;
      }
      const score = view.best.penPerPurchase;
      if (!Number.isFinite(score)) {
        continue;
      }
      if (!winner || score < winner.score) {
        winner = { methodId: view.methodId, score };
      }
    }
    return winner ? winner.methodId : null;
  }, [methodViews]);

  const byMethodId = useMemo(() => {
    const map: Record<string, FundingSummary> = {};
    for (const view of methodViews) {
      if (view.best) {
        map[view.methodId] = view.best;
      }
    }
    return map;
  }, [methodViews]);

  const methodsWithoutRoute = useMemo(
    () =>
      methodViews
        .filter((view) => view.best === null)
        .map((view) => view.methodName),
    [methodViews],
  );

  const update = useCallback(
    (patch: (previous: FundingSettings) => FundingSettings) => {
      setSettings((previous) => patch(previous));
    },
    [],
  );

  const setSourceRate = useCallback(
    (sourceId: string, value: number | null) => {
      update((previous) => ({
        ...previous,
        rates: { ...previous.rates, [sourceId]: value },
      }));
    },
    [update],
  );

  const setSourceFee = useCallback(
    (sourceId: string, value: number | null) => {
      update((previous) => ({
        ...previous,
        fees: { ...previous.fees, [sourceId]: value },
      }));
    },
    [update],
  );

  const toggleSource = useCallback(
    (sourceId: string) => {
      update((previous) => ({
        ...previous,
        sourcesEnabled: {
          ...previous.sourcesEnabled,
          [sourceId]: !(previous.sourcesEnabled[sourceId] ?? true),
        },
      }));
    },
    [update],
  );

  const toggleRoute = useCallback(
    (routeId: string) => {
      update((previous) => ({
        ...previous,
        routesEnabled: {
          ...previous.routesEnabled,
          [routeId]: !(previous.routesEnabled[routeId] ?? true),
        },
      }));
    },
    [update],
  );

  const setConversionRate = useCallback(
    (key: string, value: number | null) => {
      update((previous) => ({
        ...previous,
        conversionRates: { ...previous.conversionRates, [key]: value },
      }));
    },
    [update],
  );

  const setNetworkOverride = useCallback(
    (routeId: string, networkId: string | null) => {
      update((previous) => ({
        ...previous,
        networkOverrides: { ...previous.networkOverrides, [routeId]: networkId },
      }));
    },
    [update],
  );

  const applySettings = useCallback((update: Partial<FundingSettings>) => {
    setSettings((previous) => ({ ...previous, ...update }));
  }, []);

  return {
    settings,
    sourceViews,
    methodViews,
    conversionViews,
    winnerMethodId,
    byMethodId,
    methodsWithoutRoute,
    setSourceRate,
    setSourceFee,
    toggleSource,
    toggleRoute,
    setNetworkOverride,
    setConversionRate,
    applySettings,
  };
}


