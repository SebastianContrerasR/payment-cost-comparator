# Comparador de métodos de pago

Aplicación web que compara el **costo efectivo** de tarjetas y métodos de pago al
comprar en Japón. Introduces el monto de la compra en JPY, actualizas los tipos
de cambio de cada red (Visa, Mastercard, PayPay) y la aplicación muestra, por
cada método, cómo influyen las comisiones (FX, cripto y otras) y el cashback en
el costo final, destacando el método más económico.

- **Moneda origen:** JPY · **Moneda de referencia:** USD
- SPA sin backend: todo corre en el navegador, los datos son configuración por código.
- Tabla configurable: columnas ocultables desde el botón **Columnas** (con *Seleccionar todo*/*Restablecer*, preferencia persistida) y cabeceras agrupadas por color con **leyenda** al pie: identidad, conversión, comisiones, cashback y resultado.
- Optimizada para móvil: tabla compacta con la columna del método fija, el selector de columnas como hoja inferior y el desglose del cálculo en un modal/hoja inferior; la información del método se muestra debajo de la tabla.
- Desplegada en **GitHub Pages**.

---

## Qué calcula

Para cada método habilitado se aplica el flujo del plan (fase 1 - MVP):

| Paso | Descripción | Fórmula |
| --- | --- | --- |
| 1 | Conversión de moneda | `montoBaseUSD = montoJPY / tipoCambio` |
| 2 | FX fee | `montoConFX = montoBaseUSD × (1 + fxFee)` |
| 3 | Crypto fee | `montoConCrypto = montoConFX × (1 + cryptoFee)` |
| 4 | Otras comisiones | `%` → `× (1 + valor)` · fija → `+ valor USD` |
| 5 | Cashback potencial | `montoConComisiones × cashbackRate` |
| 6 | Cashback efectivo | `min(cashbackPotencial, límiteDisponible)` |
| 7 | Total | `montoConComisiones − cashbackEfectivo` |

El tipo de cambio se interpreta como **JPY por USD**. Los cálculos internos no
redondean nada intermedio; el redondeo ocurre solo al mostrar resultados.

### Escenario por defecto (hoja Excel de referencia)

Con el monto y tipos de cambio del Excel (`docs/example.md`), la tabla comprueba
estos totales como **pruebas de regresión** (véase `tests/calculator.test.ts`):

| Método | Total esperado USD |
| --- | ---: |
| Binance PayPay | 317.0271 |
| OKX Card | 312.3543 |
| Binance Card | 317.6303 |
| Bybit Card | 324.9408 |
| IO | 323.2829 |
| Bitget Card | 317.0895 |
| MEXC Card | 307.3994 |

MEXC Card es el método más barato en este escenario, y por eso la última suite
también verifica el banner "más económico" de la interfaz.

### Supuestos del escenario documentados en la configuración

- **Binance Card:** se usa la conversión de **0.1%** (escenario de pago con
  USDC), no la comisión general de 0.9%.
- **Bybit Card:** la conversión de criptomonedas (**0.9%**) y el FX Padding
  (**1%**) se combinan de forma aditiva (1.9%) y se aplican como un único
  multiplicador tras el FX Fee, igual que en el Excel.
- **MEXC Card:** el **1%** del Excel es la **Transaction Fee**, modelada como
  regla de "otras comisiones" (no crypto fee).
- **Bitget:** cashback de **3%** (gasto mensual > 100 USD); la base es 2%.
- El límite mensual de cashback se considera **completamente disponible**.

---

## Empezar

```bash
npm install
npm run dev
```

Vite sirve la app en <http://localhost:5173>.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Verificación de tipos (`tsc`) + build de producción en `dist/` |
| `npm run typecheck` | Solo verificación de tipos |
| `npm run preview` | Sirve el build de producción localmente |
| `npm test` | Ejecuta las pruebas unitarias una vez |
| `npm run test:watch` | Pruebas en modo watch |

## Pruebas

La suite cubre:

- **Regresión del Excel:** los 7 totales del escenario de referencia, paso a paso
  (conversión, FX, crypto, cashback limitado/ilimitado/cero).
- **Validaciones de entrada:** monto cero, negativo, indefinido; tipo de cambio
  cero o faltante; el error solo afecta a los métodos de la red involucrada.
- **Comportamiento del motor:** comisión porcentual y fija, cashback con y sin
  límite, variaciones de tipo de cambio y monto, exclusión de métodos
  deshabilitados y selección del método más barato.
- **Humo de UI:** renderizado inicial con `react-dom/server` (sin navegador).

```bash
npm test
```

---

## Cómo agregar un método de pago

La configuración vive en `src/data/paymentMethods.ts`; el motor y los
componentes **no** se modifican al agregar métodos. Seis pasos:

1. Crea un objeto `PaymentMethod` con un `id` único.
2. Configura su red (`network`) y su clave de tipo de cambio (`exchangeRateKey`:
   `visa`, `mastercard`, `paypay`...).
3. Configura las comisiones: `fees.fxFee`, `fees.cryptoFee` y, si aplica,
   reglas en `fees.otherFees` (`percentage` o `fixed`).
4. Configura el cashback: `rate`, `cap` (`null` = ilimitado), `currency` y la
   base (`amountAfterFees`).
5. Agrega requisitos, observaciones y fuentes (documentación oficial).
6. Registra el objeto en el arreglo `paymentMethods`.

Con `enabled: false` el método desaparece de la tabla. Si el método usa una red
nueva, agrega su tipo de cambio en `App.tsx` (`DEFAULT_EXCHANGE_RATES`) y en
`InputPanel.tsx` (`RATE_FIELDS`).

---

## Estructura

```text
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                  Base path para Pages + config de tests
├── src/
│   ├── components/
│   │   ├── InputPanel/             Monto JPY + tipos de cambio editables
│   │   ├── ComparisonTable/        Tabla: columnas configurables, orden y cabeceras por grupo
│   │   ├── MethodDetailModal/      Modal con la info y el desglose del método
│   │   ├── PaymentMethodDetails/   Info del método: fees, cashback, requisitos...
│   │   └── CalculationBreakdown/   Desglose paso a paso del total
│   ├── data/
│   │   └── paymentMethods.ts       Registro de métodos (configuración por código)
│   ├── domain/
│   │   ├── types.ts                Modelo de dominio
│   │   └── calculator.ts           Motor de cálculo genérico (sin React)
│   ├── hooks/
│   │   └── useComparison.ts        Recalcula la comparación al cambiar entradas
│   ├── utils/
│   │   └── currency.ts             Formateo JPY/USD/% y redondeo estable
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── tests/
│   ├── calculator.test.ts          Regresión Excel + validaciones + motor
│   └── app-render.test.tsx         Smoke test de render inicial
├── docs/                           Hoja de referencia y fichas de cada método
└── .github/workflows/              ci.yml (PRs) y deploy.yml (main → Pages)
```

La separación clave: `domain/` conoce fórmulas pero no React; `data/` declara
métodos sin lógica de cálculo; `components/` solo muestra resultados.

---

## Desplegar en GitHub Pages

El repositorio ya contiene todo, salvo un ajuste manual.

### Ajuste único del repositorio

1. Abre **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions** (no "Deploy
   from a branch": el sitio se publica con el workflow).

Tras el primer deploy la página queda en:

```text
https://<usuario>.github.io/payment-cost-comparator/
```

### Deploys automáticos

- `.github/workflows/deploy.yml`: en cada push a `main` (o manualmente con
  *Run workflow*): pruebas → build de producción → deploy.
- `.github/workflows/ci.yml`: pruebas + build en cada pull request.

### Cómo se resuelve el base path

`vite.config.ts` lee la variable `GITHUB_REPOSITORY` que GitHub Actions define
automáticamente y de ahí deriva la ruta base:

- en CI → `base: "/payment-cost-comparator/"` (correcto para
  `https://<usuario>.github.io/<repo>/`)
- localmente → `base: "./"` (rutas relativas; el build funciona en cualquier
  subcarpeta o servidor local)

---

## Roadmap

- **Fase 1 (lista):** comparador con 7 métodos, orden por costo final, detalle y
  desglose por método, pruebas y deploy en GitHub Pages.
- **Fase 2:** costos de depósito por plataforma (etapa independiente del pago).
- **Fase 3:** administración avanzada (editar métodos desde la app,
  import/export JSON, consumo de cashback del mes).
- **Fase 4:** tipos de cambio automáticos, historial, más monedas y redes.

## Referencias

- `docs/example.md`: tabla Excel de referencia (inputs y totales esperados).
- `docs/payment-methods-info.md`: fichas documentales por método (comisiones,
  cashback, requisitos y enlaces oficiales).
- `plan.md`: plan de desarrollo del proyecto.
