# AGENTS.md

Estándares del proyecto `payment-cost-comparator`. Léelo antes de
escribir código: cualquier cambio nuevo debe seguir estas convenciones
sin excepciones. Si algo no está definido aquí, pregúntale al usuario
o actualiza este archivo antes de continuar.

## Proyecto

Comparador del costo efectivo de métodos de pago al comprar en Japón
(JPY) contra una referencia en USD. SPA sin backend: React 19 +
TypeScript + Vite, desplegada en GitHub Pages. Los datos son
configuración por código; los tests son regresión contra el Excel de
referencia (`docs/example.md`).

## Comandos

| Comando             | Uso                                                |
| ------------------- | -------------------------------------------------- |
| `npm test`          | Vitest en modo run (todos los tests)               |
| `npm run test:watch`| Vitest en watch                                    |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run build`     | `tsc && vite build` (base depende de CI, ver abajo)|
| `npm run dev`       | Dev server en localhost:5173                       |

## Calidad automática (Husky + Commitlint)

- `.husky/commit-msg`: commitlint valida **Conventional Commits**;
  un commit con formato inválido no se puede crear.
- `.husky/pre-commit`: `npm run typecheck` + `npm test`.
- `.husky/pre-push`: `npm test` + `npm run build` (nada se pushea roto).
- `.gitattributes` fuerza LF en todo el repo (incluido `.husky/*`) para
  que los hooks funcionen en cualquier máquina.
- Los hooks usan scripts no interactivos; no los saltes con
  `--no-verify` (excepción: rewrites de historial ya revisado).

## Git: Conventional Commits (en inglés)

- Formato: `type: subject` o `type(scope): subject`.
- Tipos permitidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`,
  `build`, `ci`, `perf`, `style`, `revert`.
- Subject en inglés, minúscula inicial, sin punto final, ≤ 100 caracteres.
  El cuerpo puede ir en español si aporta, pero el subject es inglés.
- El body explica el **por qué** y los detalles difíciles de ver en el
  diff; una línea por idea, ≤ 90 caracteres por línea.
- Ejemplos: `feat: add column picker with persistence`,
  `fix: prevent iOS input auto-zoom and honor bottom safe area`.
- Ramas de trabajo: `feature/*` desde `main`. Nada se pushea sin
  aprobación del usuario; los PR se abren hacia `main`.

## Estructura y capas

```
src/
├── domain/      Motor de cálculo puro. Sin React, sin imports de UI.
├── data/        Configuración por código (métodos de pago).
├── hooks/       React: estado y recálculo (useComparison, useVisibleColumns).
├── components/  UI. Una carpeta por componente con export nombrado + default.
└── utils/       Formateo (currency.ts) y redondeo estable.
```

Reglas de separación:

- `domain/` nunca imports React ni del navegador; solo objetos concretos
  types.ts → calculator.ts.
- Los errores del motor **nunca se lanzan**: se devuelven como unión
  `{ status: "error", method, reason }` siempre.
- El redondeo se aplica solo al mostrar (`utils/currency.ts`); el motor
  trabaja con precisión completa. Los totales esperados en tests tienen
  4 decimales y deben coincidir con el Excel: no se cambian sin
  re-verificar contra `docs/example.md`.

## Archivos de los agentes y comentarios de código

- **Cero comentarios en el código** (TypeScript, TSX, CSS y configs
  como `vite.config.ts` y `commitlint.config.js`).
  El código debe documentarse solo: nombres claros, funciones pequeñas.
- Las decisiones y reglas que hoy viven en los comentarios deben quedar
  en este archivo, en el README o en `docs/`.
- Markdown sí puede tener comentarios de sección si aportan (no abusa).

## Convenciones de UI

- Idioma de la interfaz: **español**. Nombres de tests: español.
- Identificadores, código y commits: inglés.
- Formatos: `formatUsd` (4 decimales por defecto, como el Excel),
  `formatJpy` (0 decimales), `formatPercent`, `formatRate`.
- Los servicios/APIs de terceros no se agregan sin pedir permiso.

### Paleta por grupos de columna

Los colores son una sola fuente de verdad; se usan en las cabeceras de
la tabla (`th-group-*`), en las filas del desglose (`breakdown-row--*`)
y en la leyenda (`legend-dot--*`):

| Grupo      | Fondo   | Acento  | Texto    |
| ---------- | ------- | ------- | -------- |
| identity   | #f7fafd | —       | neutro   |
| conversion | #e4efff | #2456e6 | #1d4ed8  |
| fees       | #fdf3df | #b45309 | #92400e  |
| cashback   | #e2f4ea | #0d7a4d | #065f46  |
| result     | #1d4ed8 | #163075 | #ffffff  |

### Accesibilidad

- Diálogos/modales: `role="dialog"`, `aria-modal`, `aria-labelledby`,
  cierre con `Esc`, clic fuera y botón ×; bloquear el scroll del body
  y restaurarlo al cerrar.
- Tabla: primera columna fija, `aria-sort` en cabeceras ordenables,
  tooltips en las abreviaturas, `caption` oculta visualmente.

### Móvil

- Sin anchos mínimos forzados en la tabla: el scroll solo crece con las
  columnas visibles.
- Paneles flotantes ≤ 640px: hoja inferior fija con scroll interno y
  acciones sticky.
- Inputs con `font-size: 16px` en móvil (iOS Safari hace auto-zoom
  bajo 16px).
- Respetar `env(safe-area-inset-bottom)` en hojas inferiores y padding
  de página.

### Persistencia

- Claves `localStorage` bajo el prefijo `payment-cost-comparator.` con
  sufijo descriptivo (ej.: `payment-cost-comparator.visible-columns`),
  siempre validadas al leer (esquema guardado puede ser viejo) y con
  escritura protegida (modo privado).

## Agregar un método de pago

1. Configuración en `src/data/paymentMethods.ts` (usa una key de
   tipo de cambio existente, o agrega la nueva en
   `DEFAULT_EXCHANGE_RATES` y en `RATE_FIELDS`).
2. Ficha documental en `docs/payment-methods-info.md` con fuentes
   oficiales.
3. Verifica el total del nuevo método contra el Excel y agrega una
   aserción de regresión en `tests/calculator.test.ts`.
4. `enabled: false` elimina el método de la tabla sin tirar su config.

## Actualizar este archivo

Si introduces una nueva convención o cambia una existente:
`AGENTS.md` es la fuente de verdad; actualízalo en el mismo commit que
el cambio.
