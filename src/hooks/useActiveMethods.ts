import { useCallback, useEffect, useState } from "react";
import type { PaymentMethod } from "../domain/types";

const STORAGE_KEY = "payment-cost-comparator.active-methods";

function defaultActiveMethods(methods: readonly PaymentMethod[]): string[] {
  return methods
    .filter((method) => method.enabled)
    .map((method) => method.id);
}

function readStoredActiveMethods(
  methods: readonly PaymentMethod[],
): string[] {
  const defaults = defaultActiveMethods(methods);
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaults;
    }

    const knownIds = new Set(methods.map((method) => method.id));
    const cleaned = parsed.filter(
      (value): value is string =>
        typeof value === "string" && knownIds.has(value),
    );
    if (parsed.length > 0 && cleaned.length === 0) {
      return defaults;
    }
    return Array.from(new Set(cleaned));
  } catch {
    return defaults;
  }
}

export function useActiveMethods(methods: readonly PaymentMethod[]): {
  activeMethodIds: string[];
  toggleMethod: (id: string) => void;
  selectAllMethods: () => void;
  resetMethods: () => void;
  setActiveMethods: (ids: readonly string[]) => void;
} {
  const [activeMethodIds, setActiveMethodIds] = useState<string[]>(() =>
    readStoredActiveMethods(methods),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(activeMethodIds),
      );
    } catch {
      return;
    }
  }, [activeMethodIds]);

  const toggleMethod = useCallback((id: string) => {
    setActiveMethodIds((previous) =>
      previous.includes(id)
        ? previous.filter((methodId) => methodId !== id)
        : [...previous, id],
    );
  }, []);

  const selectAllMethods = useCallback(() => {
    setActiveMethodIds(methods.map((method) => method.id));
  }, [methods]);

  const resetMethods = useCallback(() => {
    setActiveMethodIds(defaultActiveMethods(methods));
  }, [methods]);

  const setActiveMethods = useCallback(
    (ids: readonly string[]) => {
      const knownIds = new Set(methods.map((method) => method.id));
      setActiveMethodIds(
        Array.from(new Set(ids.filter((id) => knownIds.has(id)))),
      );
    },
    [methods],
  );

  return {
    activeMethodIds,
    toggleMethod,
    selectAllMethods,
    resetMethods,
    setActiveMethods,
  };
}
