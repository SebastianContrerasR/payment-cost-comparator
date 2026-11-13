# Plan: Optimizador de fondeo de criptomonedas (Fase 2)

**Estado:** implementado (F1–F7).

Código: `src/domain/funding.ts` (motor, costos y resolución de redes), `src/data/fundingNetworks.ts` (43 tarifas con `networkId`, compatibilidad y `checkedAt`), `src/data/fundingSources.ts`, `src/data/fundingRoutes.ts`, `src/hooks/useFunding.ts` (persistencia y optimizador), `src/components/FundingInputs/` + `src/components/FundingResults/` + `src/components/FundingBreakdown/`.

Desviaciones conocidas:

- La aritmética usa punto flotante con redondeo hacia arriba a 6 decimales (cripto) y 2 (PEN) en cada paso, en lugar de una librería decimal. No se agregó ninguna dependencia; los tests verifican que el saldo final nunca quede por debajo del objetivo.
- El plazo de acreditación del cashback se muestra como referencia por plataforma y no altera el cálculo.
- La tabla de fondeo muestra el costo **por compra** con las comisiones fijas del depósito repartidas; el depósito completo para N compras aparece en el detalle y en la fila de cada ruta.
- Los módulos sugeridos en §15 se agruparon en `domain/funding.ts` para seguir la estructura actual del repositorio.

**Objetivo:** implementar un módulo independiente que calcule y recomiende la forma más económica de fondear Binance, OKX y MEXC, utilizando las tasas de adquisición ingresadas manualmente, las tarifas de transferencia entre exchanges y las conversiones necesarias para disponer del saldo que requiere cada tarjeta cripto.

La tabla principal de comparación de métodos de pago ya está implementada. Esta mejora la complementa; no debe reconstruirla ni modificar su motor de cálculo.

---

# 1. Concepto general

El proceso debe funcionar en dos etapas:

### Etapa 1 — Adquisición de fondos (PEN → USDT)

Representa el costo de conseguir USDT utilizando alguno de los métodos disponibles:

| Plataforma | Método de adquisición |
|---|---|
| Binance | P2P |
| OKX | P2P |
| OKX | LigoPay |

El usuario ingresará manualmente las tasas de cambio PEN/USDT y las comisiones correspondientes.

Una misma fuente de adquisición puede alimentar múltiples rutas. Por ejemplo, Binance P2P puede servir para fondear Binance directamente o enviar USDT a OKX y MEXC.

Por eso, las tasas deben almacenarse como fuentes compartidas y no duplicarse dentro de cada ruta.

MEXC no tendrá adquisición P2P directa debido a su poca liquidez y a que sus ofertas no son competitivas. Siempre se fondeará mediante depósitos de criptomonedas desde Binance u OKX.

### Etapa 2 — Adecuación del saldo

Representa los movimientos necesarios para conseguir el activo y saldo final que requiere cada tarjeta.

Puede incluir:

- Transferencias internas entre cuentas de una plataforma.
- Transferencias externas entre exchanges.
- Conversiones de criptomonedas.
- Requisitos específicos para utilizar una tarjeta o acceder a promociones.

Ejemplos:

**Binance**
- Adquirir USDT mediante Binance P2P.
- Obtener saldo en Binance.
- Convertir a USDC cuando corresponda para aprovechar las condiciones de Binance Card.

**OKX**
- Adquirir USDT mediante OKX P2P o LigoPay.
- Convertir USDT a USDG.
- Transferir internamente USDG a OKX Pay.
- Utilizar el saldo para OKX Card y sus condiciones de cashback.

**MEXC**
- Adquirir USDT mediante Binance P2P u OKX P2P/LigoPay.
- Transferir los USDT a MEXC.
- Disponer del saldo en la cuenta correspondiente para MEXC Card.

### Selección de red

Cuando exista una transferencia externa, la red utilizada debe determinarse automáticamente a partir de las redes habilitadas y compatibles entre el exchange de origen y el destino.

No se deben escribir las tarifas de red directamente en las rutas.

---

# 2. Relación con la tabla principal existente

Esta es una de las decisiones más importantes de la implementación.

La tabla principal ya calcula cuánto cuesta realizar una compra en JPY utilizando cada método de pago. El optimizador debe aprovechar ese resultado.

La tabla principal debe proporcionar al módulo de fondeo:

- Identificador del método de pago.
- Plataforma de destino.
- Cuenta o producto donde debe estar disponible el saldo.
- Activo necesario para pagar (USDT, USDC, USDG, etc.).
- Cantidad requerida antes de aplicar el cashback.
- Cashback esperado.
- Moneda en la que se recibe el cashback.
- Información de límites y elegibilidad cuando corresponda.

El dato más importante es la **cantidad de criptomoneda necesaria antes del cashback**.

## 2.1. Saldo antes del cashback

El cashback se recibe después de realizar la compra, por lo que no debe reducir la cantidad de fondos que necesitamos tener disponible inicialmente.

Ejemplo ilustrativo:

| Concepto | Importe |
|---|---:|
| Saldo necesario antes del cashback | 100 USDG |
| Cashback esperado | 2 USDG |
| Costo económico neto equivalente | 98 USDG |

El optimizador debe conseguir 100 USDG, no 98 USDG.

## 2.2. Costo económico después del cashback

Una vez calculado cuánto PEN se necesita para obtener el saldo requerido, se descuenta el valor estimado del cashback para calcular el costo económico neto.

Mantener dos resultados independientes:

- **PEN iniciales:** desembolso necesario para conseguir el saldo antes de comprar.
- **PEN netos:** costo económico estimado después de recibir el cashback.

El cashback no debe reducir el saldo requerido inicialmente.

## 2.3. Tratamiento según plataforma

La fecha de acreditación debe ser configurable por plataforma.

Configuración inicial basada en la experiencia del usuario:

| Plataforma | Acreditación del cashback |
|---|---|
| OKX | Aproximadamente un día después del pago |
| MEXC | Durante el mes siguiente |
| Binance | Según las condiciones vigentes |

Estos plazos son referencias iniciales, no reglas permanentes.

El optimizador debe utilizar el importe de cashback calculado por la tabla principal, respetando sus límites y condiciones.

Si el cashback está expresado en otra criptomoneda, utilizar una tasa de valoración configurable para estimar su equivalente en PEN.

Si no existe una tasa de valoración disponible, mostrar el cashback en su moneda original y no inventar un costo neto en PEN.

---

# 3. Inputs de adquisición: FundingSource

Crear una sección de inputs para registrar las cotizaciones de adquisición.

Inicialmente existirán tres fuentes:

| ID | Plataforma | Método | Moneda recibida |
|---|---|---|---|
| binance-p2p | Binance | P2P | USDT |
| okx-p2p | OKX | P2P | USDT |
| okx-ligopay | OKX | LigoPay | USDT |

El usuario podrá modificar:

- Tipo de cambio PEN/USDT.
- Comisión por operación.
- Estado habilitado/deshabilitado.
- Fecha de actualización.
- Notas o fuente de referencia.

La tasa representa cuántos soles cuesta adquirir 1 USDT.

Valores iniciales de comisiones según la información proporcionada:

| Fuente | Comisión inicial |
|---|---:|
| Binance P2P | 0.07 USDT por orden |
| OKX P2P | 0 USDT |
| OKX LigoPay | 0 USDT |

Estos valores deben ser configurables; no deben quedar hardcodeados en el motor.

La tasa y comisión de una fuente deben ingresarse una sola vez y actualizar automáticamente todas las rutas que la utilicen.

No agregar un spread adicional cuando el tipo de cambio ingresado ya representa el precio efectivo de compra.

## 3.1. FundingSource: modelo de datos

```ts
type Asset =
  | "PEN"
  | "USD"
  | "USDT"
  | "USDT0"
  | "USDC"
  | "USDG";

interface FundingSource {
  id: string;
  platform: string;
  label: string;

  penPerUsdt: DecimalValue;

  fee?: FundingCost;

  to: string;

  enabled: boolean;
  updatedAt?: string;

  notes?: string[];

  source?: {
    label: string;
    url: string;
  };
}
```

`DecimalValue` representa el tipo decimal que se utilice en el proyecto. No es obligatorio crear este tipo si se reutiliza una implementación existente.

Ejemplos de cuentas de destino:

```text
binance:spot:USDT
okx:exchange:USDT
```

La fuente determina dónde se reciben originalmente los fondos. Las rutas posteriores determinan cómo se llega a la cuenta final necesaria.

---

# 4. Tarifas de transferencia entre exchanges

Las tarifas de retiro deben mantenerse en un catálogo centralizado.

Crear:

```text
src/data/fundingNetworks.ts
```

Este módulo contendrá las tarifas proporcionadas para Binance, OKX y MEXC.

**Decisión:** las tarifas de redes serán constantes tipadas, no inputs editables de la interfaz.

Se actualizarán en el código cuando cambien las condiciones de las plataformas. Cada registro tendrá su fuente y fecha real de verificación (`checkedAt`).

Esto evita duplicar tarifas en cada ruta y reduce los errores al modificar mínimos o comisiones.

## 4.1. Modelo de datos

```ts
interface NetworkFee {
  network: string;
  networkId: string;

  asset: "USDT" | "USDT0";

  depositFee: DecimalValue;
  minDeposit: DecimalValue | null;

  withdrawFee: DecimalValue;
  minWithdraw: DecimalValue;

  canDeposit: boolean;
  canWithdraw: boolean;

  feeTreatment: "deducted_from_amount" | "charged_on_top";
}

interface PlatformFees {
  platform: string;

  checkedAt: string;

  source: {
    label: string;
    url: string;
  };

  networks: NetworkFee[];
}
```

El modelo debe permitir configurar la compatibilidad de depósito y retiro por separado.

Las tablas proporcionadas contienen principalmente tarifas y mínimos de retiro. No se debe asumir que el mínimo de retiro de una plataforma también representa el mínimo de depósito.

Según la información proporcionada, las comisiones de depósito son 0 en las tres plataformas. Se pueden inicializar en 0, pero deben quedar configurables.

Cuando no exista información confirmada sobre un mínimo de depósito, representarlo como `null` y mostrarlo como no especificado, no como un mínimo cero confirmado.

## 4.2. Reglas de compatibilidad

Para que una transferencia externa sea válida:

1. El exchange de origen debe permitir retirar el activo por esa red.
2. El exchange de destino debe permitir depositar el activo por esa red.
3. Deben coincidir la red y la variante del token, salvo que exista una compatibilidad explícita y verificada.
4. Debe cumplirse el mínimo de retiro del exchange de origen.
5. Debe cumplirse el mínimo de depósito del exchange de destino, cuando esté especificado.

**USDT y USDT0 no deben tratarse automáticamente como el mismo activo.**

No basta con que dos exchanges tengan una red con el mismo nombre. Es necesario verificar que admitan el mismo activo y representación del token.

Una red que no tenga compatibilidad confirmada debe quedar descartada.

## 4.3. Resolución automática de redes

Implementar dos funciones puras:

```ts
function quoteNetworks(
  from: string,
  to: string,
  amountUsdt: DecimalValue
): NetworkQuote[];

function bestNetwork(
  from: string,
  to: string,
  amountUsdt: DecimalValue
): {
  network: string;
  asset: Asset;
  fee: DecimalValue;
  candidates: NetworkQuote[];
} | null;
```

Modelo de resultado:

```ts
interface NetworkQuote {
  network: string;
  asset: Asset;

  fee: DecimalValue;
  minWithdraw: DecimalValue;

  usable: boolean;
  reason?: string;
}
```

La función debe devolver todas las redes candidatas, incluidas las descartadas, con el motivo correspondiente:

- No soportada por el origen.
- No soportada por el destino.
- Activo incompatible.
- Variante de token incompatible.
- Mínimo de retiro no alcanzado.
- Mínimo de depósito no alcanzado.
- Red temporalmente deshabilitada.

La red ganadora será la que tenga menor costo total de transferencia entre las opciones válidas.

Criterios de desempate:

1. Activo nativo compatible antes que una variante que requiera conversión o representación alternativa.
2. Menor mínimo de retiro cuando los demás costos sean iguales.

La interfaz debe permitir seleccionar manualmente otra red compatible. En ese caso, mostrar el sobrecosto frente a la opción más económica.

Si no existe ninguna red compatible, devolver `null` y marcar la ruta como no disponible. Nunca devolver costo cero silenciosamente.

### Importante sobre los mínimos

El mínimo de retiro pertenece al exchange de origen; el mínimo de depósito pertenece al destino.

Ejemplo:

- Binance → OKX: para determinar si se puede retirar, se consulta el mínimo de Binance.
- OKX → MEXC: se consulta el mínimo de retiro de OKX y, cuando exista, el mínimo de depósito de MEXC.

El mínimo de retiro de MEXC no debe utilizarse para validar un depósito entrante a MEXC.

---

# 5. Rutas de fondeo: FundingRoute

Las rutas deben construirse con fuentes compartidas y pasos configurables.

No duplicar tasas de adquisición ni comisiones de redes dentro de las rutas.

## 5.1. Modelo de datos

```ts
type FundingStepKind =
  | "transfer"
  | "convert";

interface FundingStep {
  id: string;

  kind: FundingStepKind;

  label: string;

  from: string;
  to: string;

  network?: "auto" | string;

  cost?: FundingCost;

  conversionRate?: DecimalValue;

  enabled?: boolean;

  notes?: string[];

  source?: {
    label: string;
    url: string;
  };
}

interface FundingRoute {
  id: string;
  label: string;

  sourceId: string;

  steps: FundingStep[];

  enabled: boolean;

  notes?: string[];
}
```

Una transferencia externa debe obtener su comisión desde `fundingNetworks.ts`, no declarar otra comisión dentro de la ruta.

Las transferencias internas pueden tener una comisión propia configurada.

Las conversiones deben tener una tasa efectiva de salida y sus costos correspondientes.

El destino final será el `to` del último paso o el destino de la fuente cuando no existan pasos adicionales.

## 5.2. Métodos de pago y cuenta requerida

Cada método de pago debe poder declarar qué activo y cuenta necesita para realizar el pago.

Modelo conceptual:

```ts
interface FundingRequirement {
  account: string;
  asset: Asset;
}
```

Ejemplos:

```text
Binance Card:
  account: binance:spot
  asset: USDC

OKX Card:
  account: okx:pay
  asset: USDG

MEXC Card:
  account: mexc:wallet
  asset: USDT
```

Los identificadores son ejemplos y deben adaptarse a las cuentas reales utilizadas por las tarjetas en la implementación actual.

Una ruta sirve a un método cuando su destino coincide con la cuenta requerida y entrega el activo necesario.

No crear reglas especiales para MEXC. Su ausencia de adquisición directa se resuelve mediante rutas que utilizan fuentes de Binance u OKX.

---

# 6. Rutas iniciales que se deben configurar

Para el MVP, permitir como máximo una transferencia externa entre exchanges por ruta.

No implementar todavía un optimizador general que descubra automáticamente caminos arbitrarios entre todas las plataformas. Las rutas posibles deben estar declaradas en configuración y el motor debe evaluarlas.

## 6.1. Binance

Evaluar:

1. Binance P2P → Binance.
2. OKX P2P → Binance mediante transferencia cripto.
3. OKX LigoPay → Binance mediante transferencia cripto.

Considerar la preparación de USDC cuando resulte necesaria para utilizar Binance Card.

## 6.2. OKX

Evaluar:

1. OKX P2P → OKX.
2. OKX LigoPay → OKX.
3. Binance P2P → OKX mediante transferencia cripto.

Cuando corresponda, realizar:

```text
USDT en OKX Exchange
       ↓
Conversión USDT → USDG
       ↓
Transferencia interna
       ↓
USDG en OKX Pay
```

## 6.3. MEXC

Evaluar exclusivamente:

1. Binance P2P → MEXC mediante transferencia cripto.
2. OKX P2P → MEXC mediante transferencia cripto.
3. OKX LigoPay → MEXC mediante transferencia cripto.

No implementar MEXC P2P.

---

# 7. Costos y operaciones: FundingCost

El motor debe soportar diferentes tipos de costos porque no todas las comisiones funcionan igual.

Modelo conceptual:

```ts
type FundingCostType =
  | "fixed"
  | "percent";

type FundingCostMode =
  | "deducted_from_amount"
  | "charged_on_top";

interface FundingCost {
  type: FundingCostType;

  value: DecimalValue;

  currency: Asset;

  mode: FundingCostMode;
}
```

Ejemplos:

- Comisión fija de 0.07 USDT por orden P2P.
- Comisión porcentual sobre el importe adquirido.
- Comisión fija de retiro en USDT.
- Comisión por conversión.
- Comisión cobrada adicionalmente o descontada del saldo.

No asumir que todas las comisiones se descuentan de la misma manera.

El modo de aplicación de la comisión debe poder configurarse por operación y según las condiciones reales de la plataforma.

---

# 8. Matemática del motor de fondeo

Crear un motor independiente del motor de pagos existente.

Debe permitir simular una ruta en dos direcciones:

- Hacia adelante: dado un importe en PEN, calcular cuánto saldo final se obtiene.
- Hacia atrás: dado un saldo final requerido, calcular cuánto PEN se necesita para conseguirlo.

El cálculo hacia atrás es especialmente importante porque la tabla principal proporciona una cantidad de cripto que necesitamos alcanzar.

## 8.1. Etapa 1: adquisición PEN → USDT

Sea:

- `P`: PEN desembolsados.
- `R`: tipo de cambio en PEN por USDT.
- `F`: comisión fija en USDT.
- `c`: comisión porcentual.

Sin comisiones:

```text
USDT bruto = P / R
```

Comisión porcentual descontada:

```text
USDT neto = USDT bruto × (1 - c)
```

Cálculo inverso:

```text
USDT bruto necesario = USDT requerido / (1 - c)
```

Comisión fija descontada:

```text
USDT neto = USDT bruto - F
```

Cálculo inverso:

```text
USDT bruto necesario = USDT requerido + F
```

Ejemplo de Binance P2P:

Si se necesitan 318.75 USDT y se aplica una comisión de 0.07 USDT descontada del importe adquirido:

```text
Compra necesaria = 318.75 + 0.07
                 = 318.82 USDT
```

La comisión debe aplicarse una sola vez por orden de adquisición.

## 8.2. Etapa 2: transferencias y conversiones

Las transferencias y conversiones deben calcularse considerando el tipo de comisión.

Para una comisión porcentual descontada:

```text
output = input × (1 - c)
```

Cálculo inverso:

```text
input = output / (1 - c)
```

Para una comisión fija descontada:

```text
output = input - F
```

Cálculo inverso:

```text
input = output + F
```

Para una comisión cobrada adicionalmente:

```text
saldo_consumido = importe_operacion + comisión
```

En una conversión, también debe existir un factor de conversión:

```text
output = input × conversionRate
```

Si existen comisiones adicionales, deben aplicarse en el orden definido para esa operación.

No asumir que USDT → USDG equivale necesariamente a una conversión 1:1.

## 8.3. Transferencias externas

La comisión de retiro puede:

- Descontarse de la cantidad enviada.
- Cobrarse adicionalmente al saldo de origen.

Esta condición debe modelarse mediante `feeTreatment`.

El cálculo inverso debe determinar cuánto saldo se necesita en el exchange de origen para que llegue exactamente la cantidad requerida al destino.

El mínimo de retiro se debe validar usando la regla publicada por la plataforma de origen. Cuando la documentación distinga entre importe solicitado y cantidad neta recibida, esa diferencia también debe quedar configurada.

## 8.4. Precisión y redondeo

Utilizar aritmética decimal para los importes monetarios.

No depender directamente de operaciones de punto flotante de JavaScript para calcular resultados financieros.

Antes de devolver el resultado:

- Aplicar la precisión permitida por la plataforma.
- Redondear según las reglas de adquisición, retiro y conversión.
- Volver a validar mínimos después del redondeo.
- Comprobar que el saldo final recibido alcanza el objetivo.

No devolver una ruta como válida si el redondeo provoca que falte saldo para pagar.

---

# 9. Resultado del cálculo: FundingResult

Cada ruta simulada debe generar un resultado independiente.

Modelo conceptual:

```ts
interface FundingResult {
  routeId: string;

  destinationPlatform: string;

  targetAsset: Asset;
  targetAmount: DecimalValue;

  initialPenRequired: DecimalValue;

  acquiredUsdt: DecimalValue;

  finalAmountReceived: DecimalValue;

  effectivePenPerUnit: DecimalValue;

  transferNetwork?: string;

  transferFee?: DecimalValue;

  conversionCosts: DecimalValue;

  cashbackAmount?: DecimalValue;
  cashbackAsset?: Asset;

  cashbackValuePen?: DecimalValue;

  netEconomicCostPen?: DecimalValue;

  feasible: boolean;

  failureReason?: string;
}
```

Separar claramente:

- Importe requerido.
- PEN iniciales.
- Cantidad final recibida.
- Cashback esperado.
- Valor del cashback.
- Costo económico neto.

## 9.1. Desembolso inicial

El desembolso inicial es el importe real en PEN que se necesita para ejecutar la ruta completa.

Debe incluir:

- La adquisición de USDT.
- La comisión de adquisición.
- Las comisiones de retiro.
- Las conversiones necesarias.
- Los demás costos configurados.

No debe confundirse con el costo adicional o spread respecto al valor de mercado.

## 9.2. Costo respecto al mercado

Agregar un input opcional de referencia:

```text
Tasa de referencia de mercado: S/ por USDT
```

Este input sirve para estimar cuánto representa el costo adicional de fondear respecto a un valor de referencia.

Calcular:

```text
valorMercadoPen =
  targetAmountEquivalentUSDT × marketPenPerUsdt

fundingPremiumPen =
  initialPenRequired - valorMercadoPen
```

El valor equivalente en USDT debe obtenerse mediante la tasa de conversión o paridad configurada para el activo final.

La tasa de mercado es solamente una referencia para calcular spread, prima y efectividad. No debe reemplazar las tasas reales de adquisición que ingresa el usuario.

El optimizador debe seleccionar la ruta con el menor desembolso inicial para alcanzar el objetivo, no la de mayor efectividad teórica.

## 9.3. Costo neto después del cashback

Calcular:

```text
netEconomicCostPen =
  initialPenRequired - cashbackValuePen
```

El valor del cashback se obtiene convirtiendo su moneda a una valoración de referencia en PEN.

El cashback debe ser el importe que ya calcula la tabla principal, respetando límites y condiciones.

No utilizar cashback no elegible o hipotético como beneficio confirmado.

Cuando el cashback se acredita con posterioridad, identificarlo como beneficio esperado, no como dinero disponible al momento de pagar.

## 9.4. Evitar doble contabilización

La nueva tabla debe calcular el desembolso real en PEN necesario para conseguir el saldo requerido.

No sumar nuevamente el importe de compra en USD a ese desembolso, porque el saldo adquirido ya representa ese importe.

Si se quiere mostrar el costo adicional del fondeo, calcularlo como `fundingPremiumPen` respecto a la referencia de mercado.

No sumar un costo ya incluido en el tipo de cambio como otra comisión.

---

# 10. Cashback y operaciones de preparación: evitar doble conteo

El motor actual de pagos ya incorpora comisiones de tarjeta y cashback.

Antes de agregar una conversión en la ruta de fondeo, revisar qué comisión representa cada campo del motor actual.

Ejemplo: Binance.

Si la comisión crypto de 0.1% del motor de pagos representa el costo de conversión al momento de pagar con USDC, no volver a cobrar ese mismo 0.1% como una comisión de preparación USDT → USDC, a menos que se trate de una operación distinta que realmente tenga otro costo.

Ejemplo: OKX.

La conversión de USDT a USDG debe tener una tasa de salida configurable basada en la cotización real. No asumir que su costo es exactamente 0.1%.

El registro histórico del usuario muestra una diferencia distinta, por lo que es importante conservar la operación observada como prueba y no reemplazarla por una tarifa genérica.

El principio general es:

**Cada operación real se contabiliza una sola vez, en la etapa donde efectivamente ocurre.**

---

# 11. Ejemplo histórico: OKX LigoPay

Mantener este registro como caso de prueba de regresión.

Fecha: 7 de octubre de 2025.

| Operación | Entrada | Salida |
|---|---:|---:|
| Adquisición LigoPay | S/ 50.00 | 14.38 USDT |
| Conversión USDT → USDG | 14.38 USDT | 14.231138 USDG |
| Transferencia interna a OKX Pay | 14.231138 USDG | 14.231138 USDG |

Datos derivados:

```text
PEN desembolsados:
50.00

Tasa efectiva de adquisición:
50 / 14.38 = 3.477051 PEN/USDT

Factor de conversión observado:
14.231138 / 14.38 ≈ 0.989648

Equivalencia observada:
989.648 USDG por cada 1,000 USDT

Pérdida relativa observada:
aproximadamente 1.0352%

Saldo final:
14.231138 USDG

Costo efectivo:
50 / 14.231138 ≈ 3.513422 PEN/USDG
```

El usuario también había registrado una cotización de 988.90 USDG por cada 1,000 USDT, pero aplicada a 14.38 USDT no reproduce el resultado histórico de 14.231138 USDG.

Por tanto:

- Mantener los importes reales de entrada y salida del registro histórico.
- Guardar la cotización de 988.90 como un dato de referencia independiente.
- No modificar el resultado histórico usando esa cotización.
- No asumir que la conversión actual tiene el mismo comportamiento.

La transferencia interna a OKX Pay no generó una pérdida de saldo según el registro.

---

# 12. Inputs de fondeo y almacenamiento

Crear una nueva sección de inputs, independiente de los inputs de pago existentes.

### A. Fuentes de adquisición

Tabla editable:

| Entrada | Plataforma | Tipo de cambio | Comisión | Actualizada |
|---|---|---:|---:|---|
| Binance P2P | Binance | Editable | Editable | Fecha |
| OKX P2P | OKX | Editable | Editable | Fecha |
| OKX LigoPay | OKX | Editable | Editable | Fecha |

Una modificación en una fuente debe actualizar todas las rutas que dependen de ella.

### B. Parámetros generales

Incluir:

- Tasa de referencia de mercado PEN/USDT, opcional.
- Fecha de actualización de la referencia.
- Número de compras cubiertas por un depósito, si se habilita la simulación mensual.

### C. Tarifas de redes

Mantenerlas en:

```text
src/data/fundingNetworks.ts
```

No crear una tabla editable de todas las redes en la interfaz.

Mostrar las redes disponibles y descartadas dentro del detalle de cada ruta.

### D. Persistencia

Guardar en `localStorage`:

- Tasas de adquisición.
- Comisiones de fuentes.
- Parámetros generales.
- Rutas habilitadas/deshabilitadas.
- Preferencias de red manual, si existen.

No guardar los resultados calculados como fuente de verdad. Recalcularlos a partir de los inputs actuales.

Mantener los datos históricos de prueba separados de las cotizaciones actuales.

---

# 13. Interfaz: resultados del optimizador

La mejora tendrá dos partes visibles: inputs y resultados.

## 13.1. Inputs

Después del panel de inputs existente, agregar una sección denominada **Fondeo** con:

1. Tasa de referencia de mercado PEN/USDT.
2. Número de compras cubiertas por depósito, inicialmente 1.
3. Tabla editable de fuentes de adquisición.

No mostrar una tabla editable de todas las tarifas de red.

## 13.2. Nueva tabla de mejor ruta de fondeo

Crear una tabla independiente que muestre la mejor forma de conseguir saldo en cada plataforma.

Ejemplo ilustrativo:

| Destino | Saldo requerido | Ruta elegida | Red | PEN iniciales | Cashback | PEN netos |
|---|---:|---|---|---:|---:|---:|
| Binance | X USDC | Binance P2P | — | S/ X | S/ X | S/ X |
| OKX | X USDG | OKX LigoPay | — | S/ X | S/ X | S/ X |
| MEXC | X USDT | Binance P2P → MEXC | BEP20 | S/ X | S/ X | S/ X |

Todos los valores deben calcularse con los inputs reales. Los valores de ejemplo no son cotizaciones.

La cantidad de saldo requerido debe provenir de la tabla principal, utilizando el importe anterior al cashback.

La tabla debe mostrar:

- Plataforma destino.
- Activo requerido.
- Cantidad requerida antes del cashback.
- Fuente de adquisición.
- Exchange de origen.
- Método de adquisición.
- Exchange de destino.
- Red utilizada, cuando exista transferencia.
- Comisión de transferencia.
- Conversiones realizadas.
- Cantidad final recibida.
- Tipo de cambio efectivo PEN por unidad de activo final.
- PEN iniciales.
- Cashback esperado.
- Fecha o plazo estimado de acreditación.
- Costo neto después del cashback.

Marcar la ruta más económica para cada plataforma.

## 13.3. Alternativas y detalles de las rutas

Al expandir cada plataforma, mostrar las rutas alternativas:

- Rutas factibles.
- Costo de cada ruta.
- Red utilizada.
- Comisiones.
- Mínimos.
- Conversiones.
- Saldo neto recibido.
- Motivos por los que otras redes o rutas fueron descartadas.

La red automática debe estar identificada claramente.

Si el usuario selecciona una red manualmente, mostrar cuánto más cuesta respecto a la opción automática.

Una plataforma sin ruta válida debe mostrar:

```text
Sin ruta de fondeo disponible
```

Nunca presentar costo cero cuando realmente no se haya podido calcular una ruta.

En móvil, usar tarjetas o una distribución adaptable sin exigir scroll horizontal.

---

# 14. Integración con la tabla principal existente

La tabla principal debe conservar su cálculo original.

Agregar información de fondeo como un grupo independiente.

Columnas sugeridas:

| Columna | Contenido |
|---|---|
| Saldo requerido | Activo y cantidad antes del cashback |
| Ruta de fondeo | Mejor ruta seleccionada |
| PEN iniciales | Desembolso para conseguir los fondos |
| Cashback estimado | Beneficio posterior convertido a PEN |
| Costo neto PEN | Costo económico final estimado |

El optimizador debe devolver los resultados de fondeo al componente principal.

**No calcular el costo final sumando el total USD de la tabla principal y los PEN de fondeo.** Son cantidades que representan distintas unidades y el desembolso de fondeo ya contempla el capital necesario para la compra.

El resultado final de comparación económica debe expresarse en PEN:

```text
Costo neto PEN =
  PEN iniciales de fondeo
  - valor PEN del cashback esperado
```

Mostrar los resultados originales en USD y las comisiones de pago como información de desglose, pero no sumarlos nuevamente al desembolso en PEN.

El banner de método más económico podrá utilizar el costo neto estimado en PEN cuando todas las rutas relevantes estén disponibles y el cashback esté valorado con criterios comparables.

Si una plataforma no tiene una ruta de fondeo válida, no debe ganar la comparación por tener un costo de fondeo cero.

---

# 15. Arquitectura técnica sugerida

Mantener módulos de dominio separados de los componentes de interfaz.

```text
src/
  data/
    acquisitionMethods.ts
    fundingNetworks.ts
    fundingRoutes.ts
    preparationRoutes.ts
    cashbackRules.ts

  domain/
    fundingTypes.ts
    fundingCosts.ts
    fundingAcquisition.ts
    fundingNetworkResolver.ts
    fundingTransfer.ts
    fundingPreparation.ts
    fundingRouteCalculator.ts
    fundingOptimizer.ts
    fundingCostCalculator.ts

  components/
    FundingInputs.tsx
    FundingSourceTable.tsx
    FundingOptimizerTable.tsx
    FundingRouteDetails.tsx
    FundingRouteAlternatives.tsx
    FundingCostBreakdown.tsx
```

Responsabilidades:

| Módulo | Responsabilidad |
|---|---|
| `fundingTypes.ts` | Tipos y estructuras del dominio |
| `fundingCosts.ts` | Aplicación de comisiones y costos |
| `fundingAcquisition.ts` | PEN → USDT |
| `fundingNetworkResolver.ts` | Compatibilidad y elección de red |
| `fundingTransfer.ts` | Transferencias y comisiones |
| `fundingPreparation.ts` | Conversiones y movimientos internos |
| `fundingRouteCalculator.ts` | Simulación completa de una ruta |
| `fundingOptimizer.ts` | Comparación y selección de rutas |
| `fundingCostCalculator.ts` | PEN iniciales y costo neto después del cashback |

Los nombres son sugeridos y pueden adaptarse a la estructura real del repositorio.

Evitar duplicar lógica que ya exista en el motor principal.

---

# 16. Cómo no romper la regresión del Excel

La tabla principal actual ya tiene cálculos y resultados esperados.

Reglas obligatorias:

1. `calculateMethod` no debe cambiar de firma ni modificar sus resultados actuales.
2. `CalculationBreakdown` debe mantenerse compatible.
3. Los siete resultados de referencia del Excel deben seguir siendo idénticos.
4. El cálculo de fondeo debe vivir en módulos independientes.
5. El resultado de fondeo debe ser un objeto independiente (`FundingResult`).
6. Un método sin configuración de fondeo debe mostrar "sin ruta configurada", no un costo cero.
7. La integración debe realizarse después de obtener los resultados existentes de pago.

Si se necesita modificar algún tipo compartido, hacerlo de forma compatible y con pruebas de regresión.

---

# 17. Pruebas unitarias

El motor debe poder probarse sin React ni interacción con la interfaz.

### A. Fuentes de adquisición

- Binance P2P.
- OKX P2P.
- OKX LigoPay.
- Comisión fija de Binance.
- Cambios de tasa y propagación hacia todas las rutas que utilizan una fuente.

### B. Transferencias

- Binance → OKX.
- OKX → Binance.
- Binance → MEXC.
- OKX → MEXC.
- Selección automática de la red más económica.
- Red incompatible.
- Token USDT frente a USDT0.
- Comisión descontada y comisión cobrada adicionalmente.
- Mínimos de retiro del exchange de origen.
- Mínimos de depósito del destino.
- Par sin redes compatibles.

### C. Casos de redes

Tomar como casos de prueba los siguientes comportamientos:

1. Binance → OKX con 3 USDT: TRC20 debe descartarse porque el mínimo de retiro de Binance es 5 USDT. Optimism puede resultar elegible si se verifica la compatibilidad del activo y el depósito en OKX.
2. OKX → MEXC con 9 USDT: TRC20 debe descartarse porque el mínimo de retiro de OKX es 10 USDT. El mínimo de retiro de MEXC para Solana no debe utilizarse para validar una transferencia entrante.
3. Una red que no tenga compatibilidad de activo confirmada debe quedar descartada.
4. Un par sin redes compatibles debe devolver `null`, nunca una ruta de costo cero.

### D. Conversiones

- USDT → USDG.
- USDT → USDC.
- Transferencias internas sin costo.
- Conversiones con tasa diferente de 1:1.
- Conversión con comisiones porcentuales y fijas.
- Evitar doble contabilización de comisiones que ya existan en el motor de pagos.

### E. Cálculo inverso

- Obtener el saldo requerido exacto.
- Calcular los USDT que deben adquirirse.
- Calcular los PEN necesarios.
- Respetar mínimos de retiro.
- Respetar redondeos de cada plataforma.
- Asegurar que el saldo final sea igual o superior al objetivo.

### F. Cashback

- El saldo requerido siempre debe utilizar el importe anterior al cashback.
- El cashback no debe disminuir los PEN iniciales necesarios.
- El cashback se debe valorar por separado.
- Los plazos de acreditación deben mostrarse correctamente.
- Un cashback no elegible no debe contabilizarse.

### G. Regresión histórica

Reproducir exactamente la operación de OKX LigoPay del 7 de octubre de 2025:

```text
S/ 50.00
  ↓
14.38 USDT
  ↓
14.231138 USDG
  ↓
14.231138 USDG en OKX Pay
```

---

# 18. Tarifas iniciales de redes (USDT)

Las siguientes tarifas son el conjunto inicial proporcionado para la implementación. No deben presentarse como tarifas verificadas en tiempo real.

Registrar la fecha real de verificación en `checkedAt` cuando se actualice la información.

En las tres plataformas se reportaron depósitos gratuitos. `mín.` representa el mínimo de retiro de la plataforma correspondiente, no el mínimo de depósito.

## Binance

Fuente: https://www.binance.com/en/fee/cryptoFee

| Red | Retiro USDT | Mínimo |
|---|---:|---:|
| BEP20 | 0.01 | 5 |
| Plasma | 0.012 | 5 |
| opBNB | 0.015 | 5 |
| Kaia | 0.02 | 5 |
| Polygon POS | 0.03 | 3 |
| AVAX C-Chain | 0.04 | 5 |
| Optimism | 0.04 | 3 |
| CELO | 0.05 | 5 |
| Aptos | 0.1 | 3 |
| Asset Hub Polkadot | 0.1 | 5 |
| Scroll | 0.1 | 5 |
| Tezos | 0.1 | 5 |
| NEAR | 0.2 | 3 |
| KAVAEVM | 0.2 | 5 |
| Arbitrum One | 0.3 | 3 |
| TON | 0.3 | 3 |
| ERC20 | 0.6 | 5 |
| Solana | 0.7 | 5 |
| TRC20 | 2 | 5 |

## OKX

Fuente: https://www.okx.com/fees/withdrawal-info

| Red | Retiro USDT | Mínimo |
|---|---:|---:|
| Plasma (USDT0) | 0.000003 | 5 |
| Berachain (USDT0) | 0.000026 | 2 |
| Tempo | 0.000061 | 2 |
| Monad (USDT0) | 0.00052 | 2 |
| Aptos | 0.00071 | 2 |
| X Layer (USDT0) | 0.0022 | 0.004 |
| Arbitrum One (USDT0) | 0.0033 | 2 |
| Polygon (USDT0) | 0.0083 | 2 |
| Unichain (USDT0) | 0.0096 | 2 |
| TON | 0.013 | 2 |
| Optimism | 0.018 | 2 |
| Optimism (USDT0) | 0.018 | 2 |
| Avalanche C-Chain | 0.2 | 2 |
| Solana | 0.24 | 2 |
| ERC20 | 0.3 | 2 |
| TRC20 | 2 | 10 |

## MEXC

Fuente: https://www.mexc.com/fee

| Red | Retiro USDT | Mínimo |
|---|---:|---:|
| BEP20 | 0.01 | 0.2 |
| Conflux eSpace | 0.01 | 1 |
| Arbitrum | 0.05 | 1 |
| Solana | 0.26 | 10 |
| ERC20 | 0.3 | 8 |
| Polkadot AssetHub | 1 | 2 |
| Kaia | 1 | 2 |
| TRC20 | 1.2 | 2 |

### Reglas al cargar las tarifas

- Cada tarifa debe indicar el activo exacto.
- Las redes con USDT0 deben distinguirse de las que utilizan USDT.
- La disponibilidad de depósito y retiro debe configurarse por separado.
- No convertir automáticamente los nombres de redes en equivalencias de activos.
- No utilizar el mínimo de retiro del destino para validar una transferencia entrante.
- La tabla resumen de mejores tramos proporcionada anteriormente no debe codificarse como autoridad. El motor debe calcular las mejores redes utilizando las tarifas detalladas y la matriz de compatibilidad verificada.

---

# 19. Frecuencia mensual y depósitos

El caso de uso contempla que el usuario puede actualizar las tasas y realizar un depósito para cubrir las compras del mes.

Las comisiones fijas de adquisición y transferencia se cobran por operación de fondeo, no por cada compra individual.

Por eso, el motor debe contabilizar cada comisión fija una sola vez por depósito.

Incluir el parámetro:

```ts
purchasesPerDeposit: number;
```

Valor inicial: `1`.

En esta primera versión, calcular el costo completo del depósito necesario para alcanzar el saldo objetivo indicado.

Si se habilita una simulación con varias compras iguales cubiertas por un solo depósito, se podrá multiplicar el objetivo por el número de compras y repartir el costo fijo para mostrar un costo promedio por compra.

No repartir automáticamente las comisiones entre compras independientes cuando no se conozca el volumen o la cantidad real de operaciones.

---

# 20. Fases de implementación

| Fase | Alcance | Criterio de aceptación |
|---|---|---|
| F1 — Dominio | Tipos, fuentes, rutas, pasos, costos y requisitos de fondeo | Modelo independiente y compatible con el motor existente |
| F2 — Datos | Las 43 tarifas de redes, fuentes, fechas, compatibilidad y rutas iniciales | Todas las redes tienen fuente y configuración; no hay rutas basadas en incompatibilidades no verificadas |
| F3 — Motor | Adquisición, transferencias, conversiones, simulación hacia adelante y cálculo inverso | Pruebas puras superadas y caso histórico de OKX reproducido |
| F4 — Optimización | Evaluación de rutas y selección de la más económica | Selecciona la ruta de menor desembolso para cada saldo objetivo |
| F5 — Inputs e interfaz | Fuentes editables, persistencia y tabla de mejores rutas | Las tasas se ingresan una vez y actualizan todas las rutas |
| F6 — Integración | Conectar los resultados con la tabla principal | Los PEN iniciales y el costo neto se muestran correctamente, sin modificar los cálculos originales |
| F7 — Validación | Pruebas de regresión, redes, cashback, redondeos y escenarios | Los siete resultados del Excel permanecen idénticos |

---

# 21. Restricciones y decisiones definitivas

- Mantener React + TypeScript + Vite.
- Mantener la tabla principal existente.
- IO se modela como pago directo de tarjeta: su saldo requerido es el total con comisiones de la tabla principal y el cashback del 1%, que se abona a la deuda, se descuenta en el costo neto.
- No implementar APIs externas ni scraping.
- No crear backend ni base de datos.
- Las tasas de adquisición deben ser inputs manuales.
- Las fuentes iniciales serán Binance P2P, OKX P2P, OKX LigoPay y el pago de tarjeta IO.
- No implementar MEXC P2P.
- MEXC se fondea exclusivamente mediante depósitos cripto desde Binance u OKX.
- Las tarifas de redes estarán en constantes tipadas, no en una tabla editable.
- La selección de redes debe respetar compatibilidad de tokens y mínimos.
- Las rutas serán configurables y limitadas a una transferencia externa en esta versión.
- El optimizador debe calcular hacia atrás desde la cantidad requerida por la tarjeta.
- El saldo requerido debe ser siempre anterior al cashback.
- El cashback se considera posteriormente para calcular el costo económico neto.
- No modificar `calculateMethod` ni romper la regresión del Excel.
- No duplicar spreads, comisiones o conversiones.
- No sumar importes en USD y PEN sin una conversión explícita.
- Mostrar un estado de ruta no disponible cuando no exista una alternativa válida.

---

# 22. Criterios finales de aceptación

La mejora estará terminada cuando:

1. Pueda ingresar las tasas PEN/USDT de Binance P2P, OKX P2P y OKX LigoPay.
2. Pueda modificar las comisiones de adquisición y guardar mis configuraciones.
3. El sistema pueda evaluar las rutas para fondear Binance, OKX y MEXC.
4. Las transferencias utilicen redes compatibles y seleccionen automáticamente la más económica.
5. Se respeten los mínimos de retiro y depósito.
6. Se ejecuten las conversiones y transferencias internas necesarias para obtener el activo final.
7. La tabla principal proporcione el saldo necesario antes del cashback.
8. El optimizador calcule cuánto PEN necesito para obtener exactamente ese saldo.
9. La nueva tabla me muestre la mejor ruta para cada plataforma, el saldo final y el desembolso inicial.
10. El cashback se muestre como beneficio posterior y se descuente únicamente al calcular el costo económico neto.
11. Pueda consultar las rutas alternativas y entender por qué fueron descartadas.
12. Los cálculos actuales de la tabla principal y sus siete resultados de regresión permanezcan intactos.

**Resultado esperado:** ingresar las cotizaciones de adquisición y disponer de una compra de determinado importe en JPY. La aplicación debe indicarme cuánto saldo cripto necesito antes del cashback, dónde me conviene adquirirlo, a qué plataforma transferirlo, qué red utilizar, cuánto PEN debo desembolsar y cuál será el costo económico estimado después de recibir el cashback.