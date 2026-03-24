/**
 * DHL Express MyDHL API Client
 * API Documentation: https://developer.dhl.com/api-reference/dhl-express-mydhl-api
 *
 * Endpoints used:
 * - POST /shipments           — Create shipment + get label
 * - GET  /tracking             — Track shipment by tracking number
 * - POST /rates                — Get shipping rates
 */

// ─── Configuration ──────────────────────────────────────────
function getConfig() {
  const apiKey = process.env.DHL_API_KEY;
  const apiSecret = process.env.DHL_API_SECRET;
  const accountNumber = process.env.DHL_ACCOUNT_NUMBER;
  const baseUrl = process.env.DHL_BASE_URL || "https://express.api.dhl.com/mydhlapi/test";

  if (!apiKey || !apiSecret) {
    throw new Error("DHL_API_KEY and DHL_API_SECRET must be configured");
  }
  if (!accountNumber) {
    throw new Error("DHL_ACCOUNT_NUMBER must be configured");
  }

  return { apiKey, apiSecret, accountNumber, baseUrl };
}

function getAuthHeader(apiKey: string, apiSecret: string): string {
  const encoded = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

// ─── Types ──────────────────────────────────────────────────
export interface DhlShipmentParams {
  recipientName: string;
  recipientCompany?: string;
  address: string;
  city: string;
  postalCode?: string;
  countryCode: string;    // ISO 2-letter (e.g. "US", "DE")
  phone: string;
  email?: string;
  weight: number;         // in KG
  length?: number;        // cm
  width?: number;         // cm
  height?: number;        // cm
  description: string;    // content description for customs
  declaredValue?: number; // USD value for customs
  packageCount?: number;
  reference?: string;     // your order reference
}

export interface DhlShipmentResult {
  success: boolean;
  trackingNumber?: string;
  shipmentId?: string;
  labelBase64?: string;     // PDF label in base64
  labelFormat?: string;     // e.g. "PDF"
  error?: string;
  rawResponse?: unknown;
}

export interface DhlTrackingResult {
  success: boolean;
  status?: string;
  statusCode?: string;
  description?: string;
  estimatedDelivery?: string;
  events?: Array<{
    date: string;
    description: string;
    location?: string;
  }>;
  error?: string;
}

export interface DhlRateResult {
  success: boolean;
  rates?: Array<{
    productName: string;
    productCode: string;
    totalPrice: number;
    currency: string;
    estimatedDelivery?: string;
  }>;
  error?: string;
}

// ─── DHL Tracking status → our ShipmentStatus mapping ──────
export const DHL_STATUS_MAP: Record<string, "pending" | "created" | "in_transit" | "delivered" | "cancelled" | "returned"> = {
  "pre-transit": "created",
  "transit": "in_transit",
  "delivered": "delivered",
  "failure": "returned",
  "unknown": "created",
};

// ─── API Call Helper ────────────────────────────────────────
async function dhlFetch(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const config = getConfig();
  const { method = "GET", body, params } = options;

  let url = `${config.baseUrl}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": getAuthHeader(config.apiKey, config.apiSecret),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[DHL] ${method} ${path} → HTTP ${response.status}:`, errText.slice(0, 500));
      let errJson;
      try { errJson = JSON.parse(errText); } catch { /* not JSON */ }
      const detail = errJson?.detail || errJson?.message || errText.slice(0, 300);
      return { ok: false as const, error: `HTTP ${response.status}: ${detail}`, status: response.status };
    }

    const data = await response.json();
    return { ok: true as const, data };
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return { ok: false as const, error: `Network error: ${msg}`, status: 0 };
  }
}

// ─── Shipper (our company) details ──────────────────────────
function getShipperAddress() {
  return {
    postalAddress: {
      postalCode: "5120149",
      cityName: "Bnei Brak",
      countryCode: "IL",
      addressLine1: "Jabotinsky 9, Hachsharat Hayishuv Towers",
    },
    contactInformation: {
      phone: process.env.YAHAV_ORIGIN_COMPANY ? "+972-3-0000000" : "+972-3-0000000",
      companyName: "Lemaan Yilmedu",
      fullName: "Lemaan Yilmedu Shipping",
      email: process.env.DHL_SHIPPER_EMAIL || "shipping@example.com",
    },
  };
}

// ─── Create Shipment ────────────────────────────────────────
export async function createDhlShipment(params: DhlShipmentParams): Promise<DhlShipmentResult> {
  const config = getConfig();
  const today = new Date().toISOString().split("T")[0];

  const requestBody = {
    plannedShippingDateAndTime: `${today}T10:00:00 GMT+03:00`,
    pickup: { isRequested: false },
    productCode: "P",  // DHL Express Worldwide
    accounts: [
      {
        typeCode: "shipper",
        number: config.accountNumber,
      },
    ],
    outputImageProperties: {
      imageOptions: [
        {
          typeCode: "label",
          templateName: "ECOM26_84_001",
        },
      ],
      splitTransportAndWaybillDocLabels: false,
      allDocumentsInOneImage: true,
      encodingFormat: "pdf",
    },
    customerDetails: {
      shipperDetails: getShipperAddress(),
      receiverDetails: {
        postalAddress: {
          postalCode: params.postalCode || "00000",
          cityName: params.city,
          countryCode: params.countryCode,
          addressLine1: params.address,
        },
        contactInformation: {
          phone: params.phone,
          companyName: params.recipientCompany || params.recipientName,
          fullName: params.recipientName,
          email: params.email || "",
        },
      },
    },
    content: {
      packages: Array.from({ length: params.packageCount || 1 }, (_, i) => ({
        weight: params.weight || 1,
        dimensions: {
          length: params.length || 20,
          width: params.width || 15,
          height: params.height || 10,
        },
        customerReferences: [
          { value: params.reference || `PKG-${i + 1}`, typeCode: "CU" },
        ],
      })),
      isCustomsDeclarable: true,
      declaredValue: params.declaredValue || 10,
      declaredValueCurrency: "USD",
      description: params.description,
      unitOfMeasurement: "metric",
      exportDeclaration: {
        lineItems: [
          {
            number: 1,
            description: params.description,
            price: params.declaredValue || 10,
            priceCurrency: "USD",
            quantity: {
              value: params.packageCount || 1,
              unitOfMeasurement: "PCS",
            },
            manufacturerCountry: "IL",
            weight: {
              netValue: params.weight || 1,
              grossValue: params.weight || 1,
            },
          },
        ],
        invoice: {
          number: params.reference || "INV-001",
          date: today,
        },
        exportReason: "permanent",
        exportReasonType: "permanent",
      },
    },
    shipmentNotification: params.email
      ? [
          {
            typeCode: "email",
            receiverId: params.email,
            languageCode: "eng",
          },
        ]
      : undefined,
    customerReferences: params.reference
      ? [{ value: params.reference, typeCode: "CU" }]
      : undefined,
  };

  console.log("[DHL] Creating shipment...");
  const result = await dhlFetch("/shipments", { method: "POST", body: requestBody });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const data = result.data;

  // Extract tracking number
  const trackingNumber = data.shipmentTrackingNumber ||
    data.packages?.[0]?.trackingNumber;

  // Extract label (base64 PDF)
  let labelBase64: string | undefined;
  if (data.documents?.length > 0) {
    labelBase64 = data.documents[0].content;
  }

  return {
    success: true,
    trackingNumber,
    shipmentId: data.dispatchConfirmationNumber || data.shipmentTrackingNumber,
    labelBase64,
    labelFormat: "PDF",
    rawResponse: data,
  };
}

// ─── Track Shipment ─────────────────────────────────────────
export async function getDhlTracking(trackingNumber: string): Promise<DhlTrackingResult> {
  const result = await dhlFetch(`/tracking`, {
    params: {
      shipmentTrackingNumber: trackingNumber,
    },
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const data = result.data;
  const shipment = data.shipments?.[0];

  if (!shipment) {
    return { success: false, error: "No tracking data found" };
  }

  const events = shipment.events?.map((e: { date: string; description: string; serviceArea?: Array<{ description: string }> }) => ({
    date: e.date,
    description: e.description,
    location: e.serviceArea?.[0]?.description,
  })) || [];

  return {
    success: true,
    status: shipment.status,
    statusCode: shipment.statusCode,
    description: shipment.description || shipment.events?.[0]?.description,
    estimatedDelivery: shipment.estimatedTimeOfDelivery,
    events,
  };
}

// ─── Get Rates ──────────────────────────────────────────────
export async function getDhlRates(params: {
  countryCode: string;
  cityName: string;
  postalCode?: string;
  weight: number;
}): Promise<DhlRateResult> {
  const config = getConfig();

  const requestBody = {
    customerDetails: {
      shipperDetails: {
        postalCode: "5120149",
        cityName: "Bnei Brak",
        countryCode: "IL",
      },
      receiverDetails: {
        postalCode: params.postalCode || "00000",
        cityName: params.cityName,
        countryCode: params.countryCode,
      },
    },
    accounts: [
      {
        typeCode: "shipper",
        number: config.accountNumber,
      },
    ],
    plannedShippingDateAndTime: new Date().toISOString().split("T")[0] + "T10:00:00 GMT+03:00",
    unitOfMeasurement: "metric",
    isCustomsDeclarable: true,
    packages: [
      {
        weight: params.weight || 1,
        dimensions: { length: 20, width: 15, height: 10 },
      },
    ],
  };

  const result = await dhlFetch("/rates", { method: "POST", body: requestBody });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const products = result.data.products || [];
  const rates = products.map((p: { productName: string; productCode: string; totalPrice: Array<{ price: number; priceCurrency: string }>; deliveryCapabilities?: { estimatedDeliveryDateAndTime?: string } }) => ({
    productName: p.productName,
    productCode: p.productCode,
    totalPrice: p.totalPrice?.[0]?.price || 0,
    currency: p.totalPrice?.[0]?.priceCurrency || "USD",
    estimatedDelivery: p.deliveryCapabilities?.estimatedDeliveryDateAndTime,
  }));

  return { success: true, rates };
}
