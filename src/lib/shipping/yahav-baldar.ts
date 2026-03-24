/**
 * Yahav Logistics / Baldar API Client
 * Based on the WordPress plugin: yahav-baldar-integration v1.91
 * 
 * API Endpoints:
 * - Create shipment: POST http://yahavlog.co.il/yahav-baldar-integration/BaldarCode.php
 * - Check status: GET http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails
 */

const BALDAR_CREATE_URL = "http://yahavlog.co.il/yahav-baldar-integration/BaldarCode.php";
const BALDAR_STATUS_URL = "http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails";

// Baldar delivery status codes
export const BALDAR_STATUS_MAP: Record<number, { label: string; status: "pending" | "created" | "in_transit" | "delivered" | "cancelled" | "returned" }> = {
  1:  { label: "פתוח", status: "created" },
  2:  { label: "הועבר לשליח", status: "in_transit" },
  3:  { label: "בוצע", status: "delivered" },
  4:  { label: "נאסף", status: "in_transit" },
  5:  { label: "חזר מכפולה", status: "returned" },
  7:  { label: "אושר ביצוע", status: "in_transit" },
  8:  { label: "מבוטל", status: "cancelled" },
  9:  { label: "שליח שני", status: "in_transit" },
  12: { label: "משלוח בהמתנה", status: "created" },
  13: { label: "במחסן", status: "created" },
  50: { label: "בדרך לנמען", status: "in_transit" },
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
}

export interface BaldarCreateResult {
  success: boolean;
  deliveryNumber?: string;
  driver?: string;
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

/**
 * Create a new shipment in Baldar via Yahav API
 */
export async function createBaldarShipment(params: BaldarCreateParams): Promise<BaldarCreateResult> {
  const config = getConfig();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const body = new URLSearchParams({
    type: "1",
    originAddr: config.originStreet,
    originAddrNum: config.originStreetNum,
    originCity: config.originCity,
    originComp: config.originCompany,
    destComp: params.recipientName,
    destAddr: params.address,
    destAddrNum: params.addressNum || "",
    destCity: params.city,
    contactPerson: "",
    contactPhone: params.phone,
    contactEmail: params.email || "",
    clientCode: config.clientCode,
    orderNum: params.orderNum,
    shippingRemarks: params.remarks || "",
    generalRemarks: "",
    urgent: "1",
    shippingPhysType: "2", // car
    packageNum: String(params.packageCount || 1),
    double: "1", // normal
    palletNum: "0",
    gov: "0",
    date: dateStr,
  });

  const response = await fetch(BALDAR_CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();

  if (data.DeliveryNumber && parseInt(data.DeliveryNumber) > 0) {
    const driver = data.DeliveryNumberString
      ? data.DeliveryNumberString.split(";")[1] || ""
      : "";

    return {
      success: true,
      deliveryNumber: String(data.DeliveryNumber),
      driver,
    };
  }

  return {
    success: false,
    error: typeof data === "string" ? data : JSON.stringify(data),
  };
}

/**
 * Check delivery status from Baldar
 */
export async function getBaldarStatus(trackingNumber: string): Promise<BaldarStatusResult> {
  const config = getConfig();

  const url = `${BALDAR_STATUS_URL}?customerId=${encodeURIComponent(config.clientCode)}&deliveryNumbers=${encodeURIComponent(trackingNumber)}`;

  const response = await fetch(url);
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
