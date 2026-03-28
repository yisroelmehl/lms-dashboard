/**
 * Yahav Logistics / Baldar API Client
 * Based on official Baldar SOAP Web Service documentation (WSToBaldar)
 * 
 * API Endpoints:
 * - Create shipment: SOAP POST http://212.150.254.6/Baldarp/Service.asmx (SaveData)
 * - Check status: GET http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails
 */

interface ServerCarrierLog {
  shipmentId: string;
  carrier: "baldar";
  timestamp: string;
  request: {
    body: string;
    endpoint: string;
  };
  response: {
    status: number | null;
    body: string;
    error?: string;
  };
}

// Store server-side logs in memory (simple approach - in prod use database)
const serverLogs: ServerCarrierLog[] = [];
const MAX_SERVER_LOGS = 100;

function logServerRequest(log: ServerCarrierLog) {
  serverLogs.push(log);
  if (serverLogs.length > MAX_SERVER_LOGS) {
    serverLogs.shift();
  }
  console.log(`[Baldar Log] ${log.shipmentId}:`, {
    timestamp: log.timestamp,
    status: log.response.status,
    error: log.response.error,
  });
}

export function getBaldarServerLogs() {
  return serverLogs;
}

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

  // Fallback: extract house number from address if addressNum is empty
  let finalAddress = params.address;
  let finalAddressNum = params.addressNum || "";
  if (!finalAddressNum.trim() && finalAddress) {
    const numbers = finalAddress.match(/\d+/g);
    if (numbers) {
      finalAddressNum = numbers.join("/");
      finalAddress = finalAddress.replace(/\d+/g, "").replace(/\s+/g, " ").trim();
    }
  }

  const fields: string[] = [
    /* 1  shipment type */       "1",                                        // 1=shipping, 2=collection, 3=transfer
    /* 2  origin street */       sanitize(config.originStreet),
    /* 3  origin house num */    sanitize(config.originStreetNum),
    /* 4  origin city */         sanitize(config.originCity),
    /* 5  dest street */         sanitize(finalAddress),
    /* 6  dest house num */      sanitize(finalAddressNum),
    /* 7  dest city */           sanitize(params.city),
    /* 8  origin company */      sanitize(config.originCompany),
    /* 9  dest company */        sanitize(params.recipientName),
    /* 10 instructions */        sanitize(params.remarks || ""),
    /* 11 urgency */             "1",                                        // 1=urgent
    /* 12 today/tomorrow */      "0",                                        // 0=default
    /* 13 vehicle type */        "2",                                        // 2=car, 1=motorcycle (per PHP reference)
    /* 14 num packages */        String(params.packageCount || 1),
    /* 15 shipping type */       "1",                                        // 1=normal, 2=double, 5=govaina
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
 * Also logs all request/response data for debugging
 */
export async function createBaldarShipment(params: BaldarCreateParams, shipmentId?: string): Promise<BaldarCreateResult> {
  const config = getConfig();
  const pParam = buildPParam(params, config);
  const soapBody = buildSoapEnvelope(pParam);
  const id = shipmentId || `local-${Date.now()}`;

  console.log("[Baldar] Creating shipment", id);
  console.log("[Baldar] pParam (28 fields):", pParam);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  let responseText = "";
  
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
    responseText = await response.text();
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const errorMsg = `Network error: ${msg}`;
    
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: null, body: "", error: errorMsg },
    });
    
    return { success: false, error: errorMsg };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: response.status, body: responseText.slice(0, 1000), error: errorMsg },
    });
    return { success: false, error: `${errorMsg} - ${responseText.slice(0, 300)}` };
  }

  console.log("[Baldar] Response status:", response.status);
  console.log("[Baldar] Response body (first 1000 chars):", responseText.slice(0, 1000));

  // Parse the SOAP response
  const resultMatch = responseText.match(/<SaveDataResult>([^<]*)<\/SaveDataResult>/);
  
  if (!resultMatch) {
    const errorMsg = `Could not parse SaveData response`;
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: 200, body: responseText.slice(0, 1000), error: errorMsg },
    });
    return { success: false, error: `${errorMsg}: ${responseText.slice(0, 300)}` };
  }

  const resultValue = resultMatch[1].trim();
  const deliveryNum = parseInt(resultValue);

  if (isNaN(deliveryNum)) {
    const errorMsg = `Unexpected result value: ${resultValue}`;
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: 200, body: responseText, error: errorMsg },
    });
    return { success: false, error: errorMsg };
  }

  // Log successful response
  logServerRequest({
    shipmentId: id,
    carrier: "baldar",
    timestamp: new Date().toISOString(),
    request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
    response: { status: 200, body: responseText },
  });

  // Positive number = success (delivery number)
  if (deliveryNum > 0) {
    console.log("[Baldar] ✅ Success! Delivery number:", deliveryNum);
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
    const msg = `שגיאה בפרמטר מספר ${paramNum === 0 ? "ראשון" : paramNum}`;
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: 200, body: responseText, error: msg },
    });
    return { success: false, error: msg };
  }

  // If it's a large negative number, it might be a duplicate
  if (deliveryNum < -1000) {
    const msg = `חשד לכפול - משלוח קיים מספר ${Math.abs(deliveryNum)}`;
    logServerRequest({
      shipmentId: id,
      carrier: "baldar",
      timestamp: new Date().toISOString(),
      request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
      response: { status: 200, body: responseText, error: msg },
    });
    return { 
      success: false, 
      error: msg
    };
  }

  const finalError = errorMessages[deliveryNum] || `שגיאה מבלדר: קוד ${deliveryNum}`;
  logServerRequest({
    shipmentId: id,
    carrier: "baldar",
    timestamp: new Date().toISOString(),
    request: { body: pParam, endpoint: BALDAR_SERVICE_URL },
    response: { status: 200, body: responseText, error: finalError },
  });

  return {
    success: false,
    error: finalError,
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
