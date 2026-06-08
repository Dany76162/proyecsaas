// Mercado Pago Checkout Preferences helper.
// Requires env var: MERCADO_PAGO_ACCESS_TOKEN (from MP panel > Credenciales).
// Uses production API. For sandbox, set MERCADO_PAGO_SANDBOX=true.
//
// Docs: https://www.mercadopago.com.ar/developers/es/reference/preferences/resource

export type MPPreferenceInput = {
  title: string;
  amountARS: number; // amount in full ARS (not cents)
  externalReference: string; // billing record ID — used to correlate with DB
  payerEmail?: string;
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
};

export type MPPreferenceResult = {
  preferenceId: string;
  checkoutUrl: string;
};

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN is not set. " +
        "Get your credentials at https://www.mercadopago.com.ar/developers/panel/app",
    );
  }
  return token;
}

export async function createMercadoPagoPreference(
  input: MPPreferenceInput,
): Promise<MPPreferenceResult> {
  const accessToken = getAccessToken();
  const isSandbox = process.env.MERCADO_PAGO_SANDBOX === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set. Mercado Pago checkout URLs cannot be generated.");
  }

  const body = {
    items: [
      {
        title: input.title,
        quantity: 1,
        unit_price: input.amountARS,
        currency_id: "ARS",
      },
    ],
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    external_reference: input.externalReference,
    back_urls: {
      success: input.backUrls?.success ?? `${appUrl}/platform/billing`,
      failure: input.backUrls?.failure ?? `${appUrl}/platform/billing`,
      pending: input.backUrls?.pending ?? `${appUrl}/platform/billing`,
    },
    auto_return: "approved",
    // Registers the webhook endpoint per-preference so MP knows where to notify.
    // Without this field, MP only uses the global webhook URL configured in the dashboard.
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MercadoPago API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    id: string;
    init_point: string;
    sandbox_init_point: string;
  };

  return {
    preferenceId: data.id,
    checkoutUrl: isSandbox ? data.sandbox_init_point : data.init_point,
  };
}
