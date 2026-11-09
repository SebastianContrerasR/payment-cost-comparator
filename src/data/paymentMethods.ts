import type { PaymentMethod } from "../domain/types";

const paymentMethods: PaymentMethod[] = [
  {
    id: "binance-paypay",
    name: "Binance PayPay",
    provider: "Binance",
    network: "PayPay",
    exchangeRateKey: "paypay",
    enabled: true,
    fees: {
      fxFee: 0,
      cryptoFee: 0,
      otherFees: [],
    },
    cashback: {
      rate: 0,
      cap: null,
      currency: "",
      base: "amountAfterFees",
    },
    requirements: [
      "Disponible únicamente en Japón.",
      "Utilizable solo en tiendas que acepten PayPay (que muestren el icono de PayPay).",
      "Según la información recopilada, disponible únicamente para extranjeros.",
    ],
    observations: [
      "Sin cashback ni comisiones configuradas: el costo depende del tipo de cambio de PayPay.",
      "Existe Binance Japan, pero queda pendiente investigar qué relación tiene con este servicio y si ofrece alguna alternativa.",
    ],
    sources: [
      {
        label: "Binance PayPay - FAQ",
        url: "https://www.binance.com/en/support/faq/detail/7e1aa76f8d0e497e9ab46a3976718377",
      },
    ],
  },
  {
    id: "okx-card",
    name: "OKX Card",
    provider: "OKX",
    network: "Visa Platinum",
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
      "Utilizar USDG para realizar las compras.",
      "Convertir previamente los fondos a USDG.",
      "Tener los fondos disponibles en OKX Pay.",
      "Transferir los USDG desde OKX Exchange hacia OKX Pay (la transferencia podría tener una comisión, pendiente de confirmar).",
    ],
    observations: [
      "Tarjeta Visa Platinum (así aparece al utilizarla con Google Pay).",
      "La comisión de conversión de 0.1% corresponde al spread de conversión a tasa de mercado.",
      "Cashback del nivel no VIP: 2% con límite mensual de 5 USDG.",
      "Gasto mensual necesario para aprovechar todo el cashback: 250 USD.",
    ],
    sources: [
      {
        label: "Comisiones de OKX Card",
        url: "https://www.okx.com/help/what-fees-apply-when-i-am-using-my-okx-card-sg",
      },
      {
        label: "OKX Pay",
        url: "https://www.okx.com/pay",
      },
      {
        label: "OKX Card Cashback Program FAQ",
        url: "https://www.okx.com/help/okx-card-cashback-program-faq",
      },
      {
        label: "OKX Card 2026 Campaign",
        url: "https://www.okx.com/campaigns/okx-card-2026",
      },
    ],
  },
  {
    id: "binance-card",
    name: "Binance Card",
    provider: "Binance",
    network: "Mastercard",
    exchangeRateKey: "mastercard",
    enabled: true,
    fees: {
      fxFee: 0.02,

      cryptoFee: 0.001,
      otherFees: [],
    },
    cashback: {
      rate: 0.02,
      cap: 100,
      currency: "",
      base: "amountAfterFees",
    },
    requirements: [
      "Pagar con USDC para aplicar la comisión de conversión preferencial de 0.1%.",
      "Mantener un gasto mensual mínimo de 100 USD para calificar al nivel de cashback esperado (Nivel 2).",
    ],
    observations: [
      "FX Fee de 2% adicional al tipo de cambio de Mastercard.",
      "La conversión general de criptomonedas es de 0.9%; el 0.1% del escenario aplica al pagar con USDC en los países disponibles y Nueva Zelanda.",
      "Niveles de cashback: Nivel 1 (gasto menor a 100 USD): 1.5%; Nivel 2 (100 a 1,000 USD): 2%; Nivel 3 (más de 1,000 USD): 3%.",
      "Se considera que se califica al Nivel 2, con 2% de cashback.",
    ],
    sources: [
      {
        label: "Comisiones de Binance Card",
        url: "https://www.binance.com/es-LA/support/faq/detail/f34b3138d61a4f79b594bb7290ac09b3",
      },
      {
        label: "Binance Card Cashback",
        url: "https://www.binance.com/es-LA/support/faq/detail/48e903b7cc8841e293bfd2486be4d025",
      },
    ],
  },
  {
    id: "bybit-card",
    name: "Bybit Card",
    provider: "Bybit",
    network: "Mastercard",
    exchangeRateKey: "mastercard",
    enabled: true,
    fees: {
      fxFee: 0.02,

      cryptoFee: 0.019,
      otherFees: [],
    },
    cashback: {
      rate: 0.02,
      cap: 5,
      currency: "USDT",
      base: "amountAfterFees",
    },
    requirements: [
      "Convertir los fondos mediante Bybit One-Click Sell antes de la compra.",
      "La conversión mínima es de 1 USD.",
    ],
    observations: [
      "FX Fee de 2% adicional al tipo de cambio de la red (Mastercard).",
      "El 1.9% del escenario se compone de la comisión de conversión de criptomonedas (0.9%, adicional al tipo de cambio de Bybit One-Click Sell) y del FX Padding (1%), aplicados juntos.",
      "Cashback del Tier 1 - Base: 2%, con límite mensual de 5 USDT.",
    ],
    sources: [
      {
        label: "Comisiones y límites de Bybit Card (EN)",
        url: "https://www.bybit.com/en/help-center/article/Fees-and-Spending-Limits-Bybit-Card",
      },
      {
        label: "Comisiones y límites de Bybit Card (ES)",
        url: "https://www.bybit.com/es-ES/help-center/article/Fees-and-Spending-Limits-Bybit-Card",
      },
      {
        label: "Bybit Card Rewards",
        url: "https://www.bybit.com/en/pay-rewards/promo/rewards-details/",
      },
    ],
  },
  {
    id: "io",
    name: "IO",
    provider: "IO",
    network: "Visa",
    exchangeRateKey: "visa",
    enabled: true,
    fees: {
      fxFee: 0.03,
      cryptoFee: 0,
      otherFees: [],
    },
    cashback: {
      rate: 0.01,
      cap: null,
      currency: "",
      base: "amountAfterFees",
    },
    requirements: [],
    observations: [
      "La comisión por conversión de moneda (3%) aplica cuando la transacción se realiza en una moneda distinta del sol peruano o del dólar americano.",
      "Cashback de 1% con límite ilimitado, disponible para nuestro perfil.",
      "El seguro de desgravamen (0.3% sobre el saldo deudor promedio, máximo S/ 20 mensuales) aplica al saldo de la tarjeta y no forma parte del cálculo de la compra.",
      "Única tarjeta tradicional del comparador: no requiere convertir criptomonedas.",
    ],
    sources: [
      {
        label: "Tarifario de gastos y comisiones",
        url: "https://assets.ctfassets.net/rct0309xw2p8/3ygDPRQI3L0JD7iaM14FxF/270ced0683c91d4c3a7168d625fefefa/tarjeta_de_credito_io_tarifario_de_gastos_y_comisiones.pdf",
      },
      {
        label: "Hoja resumen",
        url: "https://assets.ctfassets.net/rct0309xw2p8/2s212gxxGuvq7yNl8yeJEn/0eeb68df8e7759020b417b25c5b13bcb/HR_-_WEB_Julio_2025.pdf",
      },
      {
        label: "Información sobre cashback",
        url: "https://www.io.pe/blog/que-es-el-cashback/",
      },
    ],
  },
  {
    id: "bitget-card",
    name: "Bitget Card",
    provider: "Bitget",
    network: "Visa",
    exchangeRateKey: "visa",
    enabled: true,
    fees: {
      fxFee: 0.01,
      cryptoFee: 0.009,
      otherFees: [],
    },
    cashback: {

      rate: 0.03,
      cap: 6,
      currency: "",
      base: "amountAfterFees",
    },
    requirements: [
      "Gastar más de 100 USD al mes para alcanzar el cashback del 3%; el cashback base es 2%.",
    ],
    observations: [
      "FX Fee de 1% adicional al tipo de cambio de la red (Visa) y comisión de conversión de criptomonedas de 0.9%.",
      "Límite estimado: entre 200 y 600 USD de gasto mensual, lo que equivale a un cashback máximo estimado entre 6 y 18 USD.",
      "En Bitget el cashback se denomina Assetback.",
      "La reputación de esta plataforma es mala. Se recomienda investigar más antes de utilizarla.",
    ],
    sources: [
      {
        label: "Comisiones de Bitget Card",
        url: "https://www.bitget.com/support/articles/12560603803519",
      },
      {
        label: "Assetback / Rewards",
        url: "https://web3.bitget.com/helpCenter/867",
      },
    ],
  },
  {
    id: "mexc-card",
    name: "MEXC Card",
    provider: "MEXC",
    network: "Visa Platinum",
    exchangeRateKey: "visa",
    enabled: true,
    fees: {
      fxFee: 0,
      cryptoFee: 0,
      otherFees: [
        {
          id: "transaction-fee",
          name: "Transaction Fee",
          type: "percentage",
          value: 0.01,
          description:
            "Comisión por transacción de la tarjeta. El 1% del escenario del Excel corresponde a esta comisión, no a una conversión de criptomonedas.",
        },
      ],
    },
    cashback: {
      rate: 0.04,
      cap: 100,
      currency: "USDT",
      base: "amountAfterFees",
    },
    requirements: [
      "Mantener el nivel Standard (M-Score entre 350 y 599) para acceder al cashback del 4%.",
    ],
    observations: [
      "FX Fee 0% y conversión de criptomonedas 0% en el escenario del Excel.",
      "Niveles de cashback: Standard (M-Score 350 a 599): 4% con límite de 100 USDT; Premier (600 a 799): 6% con límite de 300 USDT; Elite (800 o más): 10% con límite de 800 USDT.",
      "Las transacciones menores a 1 USD tienen una comisión de 0.10 USD; no aplica en el escenario del Excel y no se incluye en el cálculo.",
      "La reputación de esta plataforma es mala. Se recomienda investigar más antes de utilizarla.",
    ],
    sources: [
      {
        label: "Comisiones de MEXC Card",
        url: "https://www.mexc.com/support/article/understanding-the-mexc-card-446453561133852672",
      },
      {
        label: "Cashback de MEXC Card",
        url: "https://www.mexc.com/learn/article/what-is-the-mexc-global-card-cashback-7-apr-fees-limits-and-how-to-apply/1#cashback-of-4-to-10-paid-in-usdt",
      },
    ],
  },
];

export default paymentMethods;
