/**
 * Yahav Logistics / Baldar API Client
 * Based on official Baldar SOAP Web Service documentation (WSToBaldar)
 * 
 * API Endpoints:
 * - Create shipment: SOAP POST http://212.150.254.6/Baldarp/Service.asmx (SaveData)
 * - Check status: GET http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails
 */

const BALDAR_SERVICE_URL = "http://212.150.254.6/Baldarp/Service.asmx";
const BALDAR_STATUS_URL = `${BALDAR_SERVICE_URL}/ListDeliveryDetails`;

// Baldar delivery status codes (from official docs)
export const BALDAR_STATUS_MAP: Record<number, { label: string; status: "pending" | "created" | "in_transit" | "delivered" | "cancelled" | "returned" }> = {
  1:  { label: "פתוח", status: "created" },
  2:  { label: "הועבר לשליח", status: "in_transit" },
  3:  { label: "בוצע", status: "delivered" },
  4:  { label: "נאסף", status: "in_transit" },
  5:  { label: "חזר מכפולה", status: "returned" },
  7:  { label: "קיבלתי", status: "in_transit" },
  8:  { label: "מבוטל", status: "cancelled" },
  9:  { label: "שליח שני", status: "in_transit" },
  10: { label: "שליח שלישי", status: "in_transit" },
  11: { label: "קיבל 2", status: "in_transit" },
  12: { label: "משלוח בהמתנה", status: "created" },
  25: { label: "במחסן", status: "created" },
  50: { label: "יצא למסירה", status: "in_transit" },
};

export interface BaldarCreateParams {
  recipientName: string;
  address: string;
  addressNum?: string;
  city: string;
  phone: string;
  email?: string;
  orderNum: string;
  remarks?: string;
  packageCount?: number;
  contactName?: string;
}

export interface BaldarCreateResult {
  success: boolean;
  deliveryNumber?: string;
  error?: string;
}

export interface BaldarStatusResult {
  success: boolean;
  deliveryStatus?: number;
  statusLabel?: string;
  mappedStatus?: string;
  receiver?: string;
  exeTime?: string;
  rawData?: Record<string, unknown>;
  error?: string;
}

function getConfig() {
  const clientCode = process.env.YAHAV_CLIENT_CODE;
  const originCity = process.env.YAHAV_ORIGIN_CITY || "";
  const originStreet = process.env.YAHAV_ORIGIN_STREET || "";
  const originStreetNum = process.env.YAHAV_ORIGIN_STREET_NUM || "";
  const originCompany = process.env.YAHAV_ORIGIN_COMPANY || "למען ילמדו";

  if (!clientCode) {
    throw new Error("YAHAV_CLIENT_CODE is not configured");
  }

  return { clientCode, originCity, originStreet, originStreetNum, originCompany };
}

/** Sanitize a field value: remove semicolons which would break the parameter string */
function sanitize(val: string): string {
  return val.replace(/;/g, ",");
}

/**
 * Build the semicolon-separated pParam string for SaveData.
 * 28 fields as per official Baldar API docs, with a trailing semicolon.
 */
function buildPParam(params: BaldarCreateParams, config: ReturnType<typeof getConfig>): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const fields: string[] = [
    /* 1  shipment type */       "1",                                        // 1=shipping, 2=collection, 3=transfer
    /* 2  origin street */       sanitize(config.originStreet),
    /* 3  origin house num */    sanitize(config.originStreetNum),
    /* 4  origin city */         sanitize(config.originCity),
    /* 5  dest street */         sanitize(params.address),
    /* 6  dest house num */      sanitize(params.addressNum || ""),
    /* 7  dest city */           sanitize(params.city),
    /* 8  origin company */      sanitize(config.originCompany),
    /* 9  dest company */        sanitize(params.recipientName),
    /* 10 instructions */        sanitize(params.remarks || ""),
    /* 11 urgency */             "0",                                        // 0=regular
    /* 12 today/tomorrow */      "0",                                        // 0=default
    /* 13 vehicle type */        "1",                                        // 1=regular, 4=motorcycle
    /* 14 num packages */        String(params.packageCount || 1),
    /* 15 is go and return */    "0",                                        // 0=no
    /* 16 cartons (not used) */  "0",
    /* 17 your order number */   sanitize(params.orderNum),
    /* 18 customer code */       config.clientCode,
    /* 19 barcode */             "0",
    /* 20 more comments */       "",
    /* 21 num ramps */           "0",
    /* 22 origin city code */    "",
    /* 23 dest city code */      "",
    /* 24 contact name */        sanitize(params.contactName || params.recipientName),
    /* 25 contact phone */       sanitize(params.phone),
    /* 26 email */               sanitize(params.email || ""),
    /* 27 execution date */      dateStr,
    /* 28 guvaina (weight) */    "0",
  ];

  // Trailing semicolon as shown in the official example
  return fields.join(";") + ";";
}

/**
 * Build the SOAP XML envelope for SaveData
 */
function buildSoapEnvelope(pParam: string): string {
  // Escape XML special characters in the parameter string
  const escaped = pParam
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SaveData xmlns="http://tempuri.org/">
      <pParam>${escaped}</pParam>
    </SaveData>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Create a new shipment in Baldar via official SOAP Web Service
 */
export async function createBaldarShipment(params: BaldarCreateParams): Promise<BaldarCreateResult> {
  const config = getConfig();
  const pParam = buildPParam(params, config);
  const soapBody = buildSoapEnvelope(pParam);

  console.log("[Baldar] Sending SOAP request to SaveData");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(BALDAR_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/SaveData",
      },
      body: soapBody,
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return { success: false, error: `Network error: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return { success: false, error: `HTTP ${response.status}: ${response.statusText} - ${errText.slice(0, 300)}` };
  }

  const xmlText = await response.text();
  console.log("[Baldar] SaveData response:", xmlText.slice(0, 500));

  // Parse the SOAP response - extract the SaveDataResult
  const resultMatch = xmlText.match(/<SaveDataResult>([^<]*)<\/SaveDataResult>/);
  if (!resultMatch) {
    return { success: false, error: `Could not parse SaveData response: ${xmlText.slice(0, 300)}` };
  }

  const resultValue = resultMatch[1].trim();
  const deliveryNum = parseInt(resultValue);

  if (isNaN(deliveryNum)) {
    return { success: false, error: `Unexpected result value: ${resultValue}` };
  }

  // Positive number = success (delivery number)
  if (deliveryNum > 0) {
    return {
      success: true,
      deliveryNumber: String(deliveryNum),
    };
  }

  // Negative number = error
  const errorMessages: Record<number, string> = {
    [-999]: "שגיאת מערכת כללית",
    [-100]: "מספר לקוח לא קיים במערכת",
  };

  // -200 = error in param 1, -210 = error in param 10, etc.
  if (deliveryNum <= -200 && deliveryNum > -300) {
    const paramNum = Math.abs(deliveryNum) - 200;
    return { success: false, error: `שגיאה בפרמטר מספר ${paramNum === 0 ? "ראשון" : paramNum * 10}` };
  }

  // If it's a large negative number, it might be a duplicate (e.g., -4289333)
  if (deliveryNum < -1000) {
    return { 
      success: false, 
      error: `חשד לכפול - משלוח קיים מספר ${Math.abs(deliveryNum)}` 
    };
  }

  return {
    success: false,
    error: errorMessages[deliveryNum] || `שגיאה מבלדר: קוד ${deliveryNum}`,
  };
}

/**
 * Check delivery status from Baldar
 */
export async function getBaldarStatus(trackingNumber: string): Promise<BaldarStatusResult> {
  const config = getConfig();

  const url = `${BALDAR_STATUS_URL}?customerId=${encodeURIComponent(config.clientCode)}&deliveryNumbers=${encodeURIComponent(trackingNumber)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return { success: false, error: `Network error: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }
  const xmlText = await response.text();

  // Parse XML response - extract key fields
  const deliveryStatusMatch = xmlText.match(/<DeliveryStatus>(\d+)<\/DeliveryStatus>/);
  const receiverMatch = xmlText.match(/<Receiver>([^<]*)<\/Receiver>/);
  const exeTimeMatch = xmlText.match(/<ExeTime>([^<]*)<\/ExeTime>/);

  if (!deliveryStatusMatch) {
    return { success: false, error: "Could not parse delivery status from response" };
  }

  const statusCode = parseInt(deliveryStatusMatch[1]);
  const statusInfo = BALDAR_STATUS_MAP[statusCode];

  return {
    success: true,
    deliveryStatus: statusCode,
    statusLabel: statusInfo?.label || `סטטוס ${statusCode}`,
    mappedStatus: statusInfo?.status || "created",
    receiver: receiverMatch?.[1] || undefined,
    exeTime: exeTimeMatch?.[1] || undefined,
    rawData: { xmlText: xmlText.substring(0, 2000) }, // truncate for storage
  };
}
