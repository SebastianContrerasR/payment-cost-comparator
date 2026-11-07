# Plan de desarrollo: Comparador de métodos de pago

## 1. Objetivo del proyecto

Desarrollar una aplicación web que permita comparar diferentes métodos de pago para determinar cuál ofrece el menor costo efectivo al realizar una compra.

La comparación considera:

- Tipo de cambio según la red de pago (Visa, Mastercard, PayPay, etc.).
- Comisiones por cambio de divisa (FX Fee).
- Comisiones por conversión de criptomonedas (Crypto Fee).
- Otras comisiones aplicables.
- Cashback ofrecido por cada método.
- Límites de cashback.
- Costo final después de aplicar todas las comisiones y descontar el cashback.

La aplicación inicialmente estará orientada a comparar métodos de pago para compras en Japón, utilizando JPY como moneda de origen y USD como moneda de referencia.

**Plataforma:** GitHub Pages.

**Tipo de aplicación:** SPA (Single Page Application), sin backend en la primera versión.

---

## 2. Alcance de la primera versión (MVP)

La primera versión debe centrarse exclusivamente en la comparación de métodos de pago.

### 2.1. Datos de entrada

La aplicación debe permitir configurar los siguientes valores:

| Concepto | Descripción | Ejemplo |
|---|---|---:|
| Monto JPY | Importe de la compra en yenes japoneses | 50,000 |
| Tipo de cambio Visa | JPY por cada USD según Visa | 157.710157 |
| Tipo de cambio Mastercard | JPY por cada USD según Mastercard | 157.510081 |
| Tipo de cambio PayPay | JPY por cada USD según PayPay | 157.715248 |

Consideraciones:

- El monto JPY debe ser editable.
- Los tipos de cambio deben ser editables.
- Cada método utilizará el tipo de cambio correspondiente a su red de pago.
- Los cambios deben recalcular automáticamente toda la tabla.
- Inicialmente, los tipos de cambio se introducirán manualmente. No se necesita integración con APIs externas.

**Importante:** el tipo de cambio se interpreta como JPY por USD.

Por tanto:

`Monto USD = Monto JPY / Tipo de cambio`

### 2.2. Tabla principal de comparación

La tabla debe presentar todos los métodos de pago configurados y sus respectivos cálculos.

Columnas propuestas:

| Columna | Descripción |
|---|---|
| FORMA DE PAGO | Nombre del método de pago |
| MARCA | Visa, Mastercard, PayPay, etc. |
| TIPO DE CAMBIO | Tipo de cambio utilizado |
| MONTO BASE | Monto convertido a USD |
| FX FEE | Comisión por cambio de divisa |
| MONTO CON FX | Monto después de aplicar FX Fee |
| CRYPTO FEE | Comisión por conversión de criptomonedas |
| OTRAS COMISIONES | Comisiones adicionales |
| MONTO CON COMISIONES | Costo total antes del cashback |
| CASHBACK | Porcentaje de cashback |
| LÍMITE CASHBACK | Límite disponible de cashback |
| CASHBACK POTENCIAL | Cashback que se obtendría sin aplicar el límite |
| CASHBACK EFECTIVO | Cashback realmente aplicable |
| TOTAL | Costo final después del cashback |

La tabla debe permitir:

- Ordenar por costo final.
- Identificar fácilmente el método más económico.
- Consultar el desglose de los cálculos.
- Mostrar los importes y porcentajes de manera consistente.
- Actualizar los resultados automáticamente al modificar los datos de entrada.

El costo final debe ser el principal criterio para comparar los métodos.

### 2.3. Métodos de pago iniciales

Se deben registrar inicialmente los siguientes métodos:

| ID | Método | Marca |
|---|---|---|
| binance-paypay | Binance PayPay | PayPay |
| okx-card | OKX Card | Visa Platinum |
| binance-card | Binance Card | Mastercard |
| bybit-card | Bybit Card | Mastercard |
| io | IO | Visa |
| bitget-card | Bitget Card | Visa |
| mexc-card | MEXC Card | Visa |

Cada método tendrá su propia configuración de cálculo.

### 2.4. Información adicional de cada método

Además de las comisiones y el cashback, cada método debe poder almacenar información complementaria:

- Nombre del método.
- Proveedor.
- Marca o red de pago.
- Disponibilidad geográfica.
- Requisitos de utilización.
- Observaciones.
- Documentación oficial.
- Enlaces de referencia.
- Estado habilitado/deshabilitado.

Esta información puede mostrarse en un panel de detalles al seleccionar un método de pago.

No es necesario mostrar todos estos datos directamente en la tabla principal.

---

## 3. Motor de cálculo

Esta es una de las partes más importantes del proyecto.

El cálculo no debe depender directamente de los métodos de pago. Debe existir un motor genérico que reciba una configuración y calcule el resultado correspondiente.

### 3.1. Flujo de cálculo

El flujo general será:

1. Obtener el monto original en JPY.
2. Identificar el tipo de cambio correspondiente al método.
3. Convertir el monto de JPY a USD.
4. Aplicar las comisiones configuradas.
5. Calcular el cashback potencial.
6. Aplicar el límite disponible de cashback.
7. Obtener el costo final.

### 3.2. Fórmulas

**Paso 1. Conversión de moneda**

`montoBaseUSD = montoJPY / tipoCambio`

**Paso 2. Aplicación de FX Fee**

`montoConFX = montoBaseUSD * (1 + fxFee)`

**Paso 3. Aplicación de Crypto Fee**

`montoConCrypto = montoConFX * (1 + cryptoFee)`

**Paso 4. Aplicación de otras comisiones**

Las comisiones adicionales deben aplicarse según las reglas configuradas para cada método.

Para una comisión porcentual:

`montoFinalComisiones = montoAnterior * (1 + otherFee)`

Para una comisión fija:

`montoFinalComisiones = montoAnterior + fixedFeeUSD`

**Paso 5. Cashback potencial**

`cashbackPotencial = montoFinalComisiones * cashbackRate`

**Paso 6. Cashback efectivo**

`cashbackEfectivo = min(cashbackPotencial, cashbackDisponible)`

**Paso 7. Costo final**

`total = montoFinalComisiones - cashbackEfectivo`

### 3.3. Consideraciones del cashback

El cashback debe ser configurable independientemente para cada método.

Se deben contemplar los siguientes escenarios:

- Cashback porcentual.
- Cashback con límite máximo mensual.
- Cashback ilimitado.
- Cashback condicionado a determinados niveles.
- Cashback condicionado al uso de una criptomoneda específica.

También debemos diferenciar:

- Límite mensual total de cashback.
- Cashback ya consumido durante el mes.
- Cashback restante disponible.

Para el MVP, podemos comenzar utilizando el límite mensual completo como límite disponible. Posteriormente, se puede agregar un campo editable para indicar cuánto cashback ya se consumió.

**Importante:** el cálculo del cashback debe considerar una base configurable. Inicialmente utilizaremos el monto después de las comisiones, para mantener el comportamiento de la hoja Excel actual.

### 3.4. Precisión y redondeo

- Los cálculos internos deben trabajar con precisión suficiente.
- No redondear cada operación intermedia.
- Redondear únicamente para mostrar los resultados.
- Utilizar una estrategia consistente para evitar errores de precisión de punto flotante.

---

## 4. Configuración de métodos de pago

Esta es una decisión arquitectónica importante.

La aplicación debe estar preparada para agregar nuevos métodos de pago sin modificar el motor de cálculo.

### 4.1. ¿Interfaz para agregar métodos o configuración por código?

**Decisión para el MVP: configuración por código.**

No necesitamos construir una interfaz administrativa en la primera versión.

Los métodos se registrarán en un archivo de configuración, por ejemplo:

`src/data/paymentMethods.ts`

Agregar un nuevo método consistirá en registrar su configuración en ese archivo.

El motor de cálculo lo reconocerá automáticamente.

Ventajas:

- Menos complejidad.
- No necesitamos backend.
- No necesitamos base de datos.
- Las reglas quedan versionadas en Git.
- Es sencillo realizar cambios y revisar el historial.
- Podemos incorporar nuevos métodos sin modificar componentes visuales ni fórmulas.

### 4.2. Modelo de configuración propuesto

Ejemplo conceptual:

```ts
type PaymentMethod = {
  id: string;
  name: string;
  provider: string;
  network: string;

  exchangeRateKey: string;

  enabled: boolean;

  fees: {
    fxFee: number;
    cryptoFee: number;
    otherFees: FeeRule[];
  };

  cashback: {
    rate: number;
    cap: number | null;
    currency: string;
    base: "amountAfterFees";
  };

  requirements: string[];
  observations: string[];

  sources: {
    label: string;
    url: string;
  }[];
};

type FeeRule = {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
};
```

Este modelo es una referencia inicial y puede ajustarse durante la implementación.

La idea principal es que cada método tenga declaradas sus propias reglas.

### 4.3. Ejemplo de configuración

```ts
const paymentMethods: PaymentMethod[] = [
  {
    id: "okx-card",
    name: "OKX Card",
    provider: "OKX",
    network: "VISA",

    exchangeRateKey: "visa",

    enabled: true,

    fees: {
      fxFee: 0,
      cryptoFee: 0.001,
      otherFees: [],
    },

    cashback: {
      rate: 0.02,
      cap: 5,
      currency: "USDG",
      base: "amountAfterFees",
    },

    requirements: [
      "Utilizar USDG para realizar las compras",
      "Tener fondos disponibles en OKX Pay",
    ],

    observations: [],

    sources: [
      {
        label: "Comisiones",
        url: "https://www.okx.com/help/what-fees-apply-when-i-am-using-my-okx-card-sg",
      },
    ],
  },
];
```

La configuración debe soportar también:

- Límites de cashback ilimitados (`cap: null`).
- Métodos sin cashback.
- Métodos con varias comisiones adicionales.
- Diferentes redes de pago.
- Diferentes monedas de cashback.
- Métodos habilitados o deshabilitados.

Si posteriormente necesitamos niveles de cashback, se puede ampliar el modelo para soportar condiciones y tiers sin cambiar la estructura general del motor.

### 4.4. Cómo agregar un nuevo método

El procedimiento esperado será:

1. Crear un nuevo objeto `PaymentMethod`.
2. Configurar su red de pago.
3. Configurar sus comisiones.
4. Configurar su cashback y límites.
5. Agregar los requisitos, observaciones y documentación.
6. Registrar el método en `paymentMethods.ts`.

La aplicación deberá mostrar automáticamente el nuevo método en la tabla.

No será necesario modificar el componente de comparación ni el motor de cálculo.

---

## 5. Diseño de interfaz

La aplicación tendrá inicialmente una sola página principal.

### 5.1. Secciones

**A. Encabezado**

- Nombre de la aplicación.
- Descripción breve.
- Monedas utilizadas en la comparación.

**B. Configuración de entrada**

Mostrar un panel con:

- Monto en JPY.
- Tipo de cambio Visa.
- Tipo de cambio Mastercard.
- Tipo de cambio PayPay.

Todos estos valores deben poder editarse directamente.

**C. Tabla comparativa**

Mostrar todos los métodos de pago con sus respectivos resultados.

Características:

- Ordenamiento por columnas.
- Ordenamiento inicial por costo final ascendente.
- Identificación visual del método más económico.
- Formato de importes y porcentajes.
- Scroll horizontal en pantallas pequeñas.

**D. Detalle de método de pago**

Al seleccionar un método, mostrar:

- Información general.
- Marca de pago.
- Comisiones.
- Cashback y condiciones.
- Requisitos.
- Observaciones.
- Documentación oficial.

**E. Desglose del cálculo**

Permitir consultar cómo se obtuvo el total de cada método.

Ejemplo:

```text
OKX CARD

Monto original:             50,000 JPY

Conversión a USD:              317.0373 USD
FX Fee (0%):                     0.0000 USD
Crypto Fee (0.1%):               0.3170 USD

Costo antes de cashback:       317.3543 USD

Cashback potencial (2%):         6.3471 USD
Límite disponible:               5.0000 USD
Cashback efectivo:               5.0000 USD

TOTAL:                          312.3543 USD
```

---

## 6. Arquitectura y tecnologías

### 6.1. Stack recomendado

| Tecnología | Responsabilidad |
|---|---|
| React | Interfaz de usuario |
| TypeScript | Tipado y estructura de datos |
| Vite | Build y desarrollo |
| CSS / Tailwind CSS | Estilos |
| Vitest | Pruebas unitarias |
| GitHub Actions | Despliegue automático |
| GitHub Pages | Hosting |

No se necesita:

- Backend.
- Base de datos.
- Autenticación.
- API propia.
- Servidor.

La aplicación debe funcionar completamente en el navegador.

### 6.2. Estructura propuesta

```text
payment-method-comparator/
│
├── public/
│
├── src/
│   │
│   ├── components/
│   │   ├── InputPanel/
│   │   ├── ComparisonTable/
│   │   ├── PaymentMethodDetails/
│   │   ├── CalculationBreakdown/
│   │   └── ...
│   │
│   ├── data/
│   │   └── paymentMethods.ts
│   │
│   ├── domain/
│   │   ├── types.ts
│   │   └── calculator.ts
│   │
│   ├── hooks/
│   │
│   ├── utils/
│   │   └── currency.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── tests/
│   └── calculator.test.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 6.3. Separación de responsabilidades

La separación más importante será:

**Configuración (`data/paymentMethods.ts`)**

Define qué métodos existen y cuáles son sus características.

**Dominio (`domain/calculator.ts`)**

Contiene todas las fórmulas y reglas de cálculo.

No debe conocer componentes de React ni depender de la interfaz.

**Componentes (`components/`)**

Se encargan de mostrar los datos y permitir la interacción del usuario.

Esta separación permitirá agregar métodos sin alterar la lógica de cálculo.

---

## 7. Validaciones y pruebas

Es importante utilizar los resultados actuales de Excel como referencia para verificar que el motor de cálculo funcione correctamente.

### 7.1. Casos de prueba iniciales

Utilizar los siguientes valores de entrada:

```text
Monto JPY: 50,000

Visa:       157.71015700
Mastercard: 157.51008064
PayPay:     157.71524839
```

Los resultados de referencia del Excel son:

| Método | Total esperado USD |
|---|---:|
| Binance PayPay | 317.0271 |
| OKX Card | 312.3543 |
| Binance Card | 317.6303 |
| Bybit Card | 324.9408 |
| IO | 323.2829 |
| Bitget | 317.0895 |
| MEXC Card | 307.3994 |

Estos resultados deben convertirse en pruebas de regresión para el motor de cálculo.

### 7.2. Validaciones adicionales

- Monto JPY igual a cero.
- Monto JPY negativo.
- Tipo de cambio igual a cero.
- Cashback igual a cero.
- Cashback ilimitado.
- Cashback potencial superior al límite.
- Cashback potencial inferior al límite.
- Método deshabilitado.
- Comisión porcentual y comisión fija.
- Variación del tipo de cambio.
- Variación del monto de compra.

### 7.3. Consideraciones sobre los datos iniciales

Antes de implementar, conviene normalizar algunas diferencias entre los datos documentales y los valores utilizados en Excel:

- **Binance Card:** el Excel utiliza 0.1% de conversión, correspondiente al escenario de pago con USDC, no la comisión general de 0.9%.
- **Bybit Card:** el 1.9% utilizado en Excel combina el 0.9% de conversión y el 1% de FX Padding. Conviene conservar ambos conceptos en la configuración y definir explícitamente cómo se combinan para reproducir el resultado actual.
- **MEXC Card:** el 1% utilizado en Excel corresponde a Transaction Fee, no a Crypto Fee. Debe aparecer como comisión adicional, para evitar clasificarla incorrectamente.
- **Bitget:** el cashback de 3% es el escenario elegido en Excel, aunque la información inicial también contempla un 2% base.
- **Cashback:** para los resultados actuales se considera que el límite mensual está completamente disponible.
- **Monedas:** los resultados de la hoja parecen estar formateados con el símbolo £, pero los cálculos corresponden a USD. La aplicación debe utilizar `$` y distinguir claramente JPY de USD.

El objetivo es que las reglas reflejen las condiciones reales de cada proveedor y que el Excel sirva como referencia de los escenarios iniciales.

---

## 8. Roadmap de desarrollo

### Fase 1 — MVP: Comparador de métodos de pago

**Objetivo:** tener una aplicación funcional desplegada en GitHub Pages.

Incluye:

- Configuración del monto JPY.
- Configuración de los tipos de cambio.
- Registro de los siete métodos iniciales.
- Motor de cálculo independiente.
- Cálculo de comisiones.
- Cálculo de cashback.
- Tabla comparativa.
- Ordenamiento por costo final.
- Detalle de cada método.
- Desglose de cálculos.
- Diseño responsive.
- Pruebas unitarias.
- Despliegue en GitHub Pages.

### Fase 2 — Costos de depósito

Esta fase incorporará el análisis de cuánto cuesta depositar fondos en cada plataforma.

La idea es poder considerar:

- Método de depósito.
- Moneda de origen.
- Moneda de destino.
- Comisión por depósito.
- Tipo de cambio aplicado.
- Costos de conversión.
- Costos adicionales.

El objetivo será calcular el costo completo de utilizar cada método, desde que se depositan los fondos hasta que se realiza el pago.

**Importante:** los costos de depósito deben modelarse como una etapa independiente del pago. No debemos mezclarlos directamente con FX Fee, Crypto Fee o cashback.

### Fase 3 — Configuración avanzada

Evaluar incorporar una interfaz para administrar métodos de pago.

Posibles funcionalidades:

- Agregar métodos desde la aplicación.
- Modificar sus comisiones.
- Modificar sus condiciones de cashback.
- Habilitar y deshabilitar métodos.
- Importar y exportar configuraciones JSON.

Esta fase no requiere necesariamente un backend. Se puede comenzar utilizando almacenamiento local del navegador y exportación/importación de archivos.

### Fase 4 — Mejoras futuras

Posibles funcionalidades:

- Consulta automática de tipos de cambio.
- Historial de tipos de cambio.
- Comparación entre diferentes montos de compra.
- Comparación por escenarios.
- Historial de simulaciones.
- Más monedas.
- Más redes de pago.
- Nuevos métodos de pago.

---

## 9. Decisiones de diseño importantes

1. La aplicación debe ser **configurable y extensible desde el inicio**.
2. Agregar métodos de pago no debe requerir modificar el motor de cálculo.
3. Las comisiones deben modelarse como reglas independientes y no como valores incrustados en los componentes.
4. Cashback debe ser configurable, incluyendo porcentaje, límite y condiciones.
5. Los cálculos deben ser independientes de la interfaz.
6. La primera versión no necesita una interfaz administrativa.
7. La primera versión no debe incorporar todavía los costos de depósito.
8. La aplicación debe funcionar sin backend y poder desplegarse directamente en GitHub Pages.
9. Los datos documentales deben mantenerse asociados a cada método de pago.
10. Los resultados actuales de Excel deben servir como casos de prueba para garantizar la consistencia matemática.

---

## 10. Resultado esperado

Al finalizar la primera fase tendremos una aplicación web en GitHub Pages que permita introducir un monto en JPY, actualizar los tipos de cambio y comparar automáticamente todos los métodos de pago registrados.

La aplicación mostrará cuál es el método más económico, cuánto cuesta utilizar cada uno y cómo influyen las comisiones y el cashback en el resultado final.

La arquitectura permitirá incorporar nuevos métodos de pago mediante configuración, sin tener que reescribir la lógica de comparación.

En una segunda etapa se incorporarán los costos de depósito para evolucionar desde un comparador de tarjetas hacia un comparador del costo total de cada alternativa de pago.