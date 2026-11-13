# AGENTS.md

Estándares del proyecto `payment-cost-comparator`. Léelo antes de
escribir código: cualquier cambio nuevo debe seguir estas convenciones
sin excepciones. Si algo no está definido aquí, pregúntale al usuario
o actualiza este archivo antes de continuar.

## Proyecto

Comparador del costo efectivo de métodos de pago al comprar en Japón
(JPY) o en dólares (USD), contra una referencia en USD. SPA sin
backend: React 19 + TypeScript + Vite, desplegada en GitHub Pages. Los
datos son configuración por código; los tests de regresión del Excel
(`docs/example.md`) cubren el escenario JPY.

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
├── hooks/       React: estado y recálculo (useComparison, useVisibleColumns,
│               useActiveMethods, usePurchaseInputs).
├── components/  UI. Una carpeta por componente con export nombrado + default.
└── utils/       Formateo (currency.ts) y redondeo estable.
```

Reglas de compra:

- El motor recibe `PurchaseInput` (`currency` + `amount`), no un
  monto suelto. `JPY` exige tipo de cambio; `USD` usa el monto como
  base y no aplica FX fee ni cross-border. Crypto fee y otras
  comisiones sí aplican.
- El monto de compra convertido a USD (`baseAmountUSD`) selecciona el
  rango de cashback cuando el método declara `cashback.tiers`. Sin
  tiers se usa `rate` y `cap`; el nivel no altera la base ni las
  comisiones.
- Binance Card se declara como tres métodos según el activo de pago:
  `binance-card` (USDC, crypto fee 0.1%), `binance-card-usdt` (USDT,
  crypto fee 0.9%) y `binance-card-u` (U, FX fee 0% y crypto fee 0%
  por las tarifas especiales del token U). Comparten red y rangos de
  cashback; su fondeo es la ruta `binance-p2p-binance-card-u`.
- Cashback de Binance: Nivel 1 (<100 USD) 1.5% sin límite; Nivel 2
  (100 a <1,000 USD) 2% sin límite; Nivel 3 (≥1,000 USD) 3% con límite
  de 100 USD.
- Cada método declara `supportedCurrencies`; PayPay es solo `JPY` y se
  excluye de la comparación en USD.
- `useActiveMethods` controla qué métodos entran a la comparación. Por
  defecto activa los que tienen `enabled: true`; el usuario puede
  activar los inactivos y la selección se persiste en
  `payment-cost-comparator.active-methods`. Los métodos no soportados
  por la moneda se muestran bloqueados.
- La regresión de los 7 totales del Excel corresponde solo a `JPY`.

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
  Excepción: las directivas funcionales del compilador como
  `/// <reference>` en `.d.ts` no son comentarios.
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
| cashback   | #e2f4ea | #0d7a4d | #065f46  || funding    | #efe9ff | #6d28d9 | #5b21b6  |
| result     | #1d4ed8 | #163075 | #ffffff |

### Accesibilidad

- Diálogos/modales: `role="dialog"`, `aria-modal`, `aria-labelledby`,
  cierre con `Esc`, clic fuera y botón ×; bloquear el scroll del body
  y restaurarlo al cerrar.
- Tabla: primera columna fija, `aria-sort` en cabeceras ordenables,
  tooltips en las abreviaturas, `caption` oculta visualmente.

### Móvil

- Sin anchos mínimos forzados en la tabla: el scroll solo crece con las
  columnas visibles y la tabla debe caber sin scroll horizontal desde
  344px hacia arriba; por debajo de 344px el scroll interno de la tabla
  es aceptable. Los ajustes van en dos tramos: compactado general a
  ≤640px y micro-ajustes extra a ≤356px.
- El override `.table-card { padding: 0 }` debe declararse después de
  `.card` dentro de la misma media query, o el padding genérico le roba
  32px de ancho a la tabla.
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
- `payment-cost-comparator.purchase-inputs` guarda moneda, montos
  JPY/USD y tipos de cambio. Los montos admiten `null` (campo vacío);
  los valores inválidos caen al default por campo, no descartan todo
  el objeto.

### Editor JSON de inputs

- Toda tarjeta con inputs de configuración tiene el toggle
  **Individual/JSON** (Configuración de entrada y Fondeo). Al entrar a
  JSON serializa sus inputs y cada cambio válido se aplica al instante;
  los errores se muestran sin tocar el estado
  (`aria-invalid`, `role="alert"`, badge de validez).
- El editor JSON reemplaza solo las secciones de input del card; el
  resto del contenido (tablas de resultados, resúmenes) sigue visible
  en modo JSON.
- El JSON cubre exactamente los inputs visibles del card, nada más:
  valores que no se editan en la UI no van en el JSON, y aplicar el JSON
  preserva el resto del estado. En cards que mezclan configuración y
  resultados (Fondeo), el JSON cubre solo las secciones de input
  (Fuentes de adquisición y Conversiones de activo); la tabla de rutas
  y sus selects de red no entran en el JSON.
- La serialización y validación viven en un `json.ts` junto al
  componente: `InputPanel/inputJson.ts` y `FundingInputs/fundingJson.ts`.
- El parseo es estricto: JSON malformado, tipos inválidos, IDs o claves
  desconocidas y claves faltantes devuelven error visible. Nunca se
  aplica un estado parcial ni se inventan defaults silenciosos.
- **Regla:** todo input nuevo se agrega junto con su serialización, su
  validación y sus tests en el editor JSON del card correspondiente, en
  el mismo commit.
- Las claves y campos del JSON van en inglés; los mensajes de error, en
  español.

## Agregar un método de pago

1. Configuración en `src/data/paymentMethods.ts` (usa una key de
   tipo de cambio existente, o agrega la nueva en
   `DEFAULT_EXCHANGE_RATES` y en `RATE_FIELDS`) y declara sus monedas en
   `supportedCurrencies`.
2. Ficha documental en `docs/payment-methods-info.md` con fuentes
   oficiales.
3. Si el cashback depende del monto de compra, declara
   `cashback.tiers` con umbrales ascendentes y elige el último cuyo
   `minAmountUSD` no supere el monto convertido a USD.
4. Verifica el total del nuevo método contra el Excel y agrega una
   aserción de regresión en `tests/calculator.test.ts`.
5. `enabled: false` elimina el método de la tabla sin tirar su config.

## Actualizar este archivo

Si introduces una nueva convención o cambia una existente:
`AGENTS.md` es la fuente de verdad; actualízalo en el mismo commit que
el cambio.
