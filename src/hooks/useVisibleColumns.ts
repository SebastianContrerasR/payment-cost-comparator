import { useCallback, useEffect, useState } from "react";
import {
  ALL_COLUMN_KEYS,
  DEFAULT_VISIBLE_COLUMNS,
  type SortKey,
} from "../components/ComparisonTable/ComparisonTable";

const STORAGE_KEY = "payment-cost-comparator.visible-columns";

function toSortKeys(values: readonly string[]): SortKey[] {
  const knownKeys = new Set<string>(ALL_COLUMN_KEYS);
  const validated = values.filter(
    (value): value is SortKey => knownKeys.has(value),
  );
  const unique = Array.from(new Set(validated));
  if (!unique.includes("name")) {
    unique.unshift("name");
  }
  return unique;
}

function readStoredVisibleColumns(): SortKey[] {
  if (typeof window === "undefined") {
    return DEFAULT_VISIBLE_COLUMNS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    // Se descartan claves desconocidas (versiones previas del esquema).
    const knownKeys = new Set<string>(ALL_COLUMN_KEYS);
    const cleaned = (parsed as unknown[]).filter(
      (value): value is string =>
        typeof value === "string" && knownKeys.has(value),
    );
    if (cleaned.length === 0) {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    return toSortKeys(cleaned);
  } catch {
    // JSON inválido o almacenamiento no disponible: preferencias por defecto.
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

/**
 * Estado de columnas visibles de la tabla, persistido en localStorage.
 * Devuelve { visibles, alternar columna, seleccionar todas, restablecer }.
 */
export function useVisibleColumns(): {
  visibleColumns: SortKey[];
  toggleColumn: (key: SortKey) => void;
  selectAll: () => void;
  reset: () => void;
} {
  const [visibleColumns, setVisibleColumns] = useState<SortKey[]>(
    readStoredVisibleColumns,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(visibleColumns),
      );
    } catch {
      // Almacenamiento no disponible (navegador privado): no persiste.
    }
  }, [visibleColumns]);

  const toggleColumn = useCallback((key: SortKey) => {
    if (key === "name") {
      return; // La columna del método está siempre visible.
    }
    setVisibleColumns((previous) =>
      previous.includes(key)
        ? previous.filter((column) => column !== key)
        : [...previous, key],
    );
  }, []);

  const reset = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  const selectAll = useCallback(() => {
    setVisibleColumns([...ALL_COLUMN_KEYS]);
  }, []);

  return { visibleColumns, toggleColumn, selectAll, reset };
}
