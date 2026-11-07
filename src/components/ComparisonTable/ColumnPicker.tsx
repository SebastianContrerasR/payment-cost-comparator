import { useEffect, useRef, useState } from "react";
import type { SortKey } from "./ComparisonTable";

export interface ColumnPickerTarget {
  key: SortKey;
  label: string;
  description?: string;
}

interface ColumnPickerProps {
  columns: readonly ColumnPickerTarget[];
  visible: readonly SortKey[];
  onToggle: (key: SortKey) => void;
  onReset: () => void;
}

/** Selector de columnas de la tabla: botón con panel de checkboxes. */
export function ColumnPicker({
  columns,
  visible,
  onToggle,
  onReset,
}: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        containerRef.current &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="column-picker" ref={containerRef}>
      <button
        type="button"
        className="column-picker-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((previous) => !previous)}
      >
        Columnas <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="column-picker-panel">
          <ul className="column-picker-list">
            <li className="column-picker-item column-picker-item--locked">
              <input type="checkbox" checked disabled aria-hidden="true" tabIndex={-1} />
              <span>Método · siempre visible</span>
              <span className="column-picker-lock" aria-hidden="true">
                🔒
              </span>
            </li>
            {columns.map((column) => (
              <li key={column.key}>
                <label className="column-picker-item" title={column.description}>
                  <input
                    type="checkbox"
                    checked={visible.includes(column.key)}
                    onChange={() => onToggle(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="column-picker-reset"
            onClick={() => onReset()}
          >
            Restablecer
          </button>
        </div>
      ) : null}
    </div>
  );
}
