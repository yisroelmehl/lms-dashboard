/**
 * Kesher Payment/Clearing API Client
 * REST API integration with https://kesherhk.info
 * 
 * All functions and parameters are Case Sensitive.
 * Amounts are in agorot (pennies) - multiply ILS by 100.
 */

const KESHER_API_URL = "https://kesherhk.info/ConnectToKesher/ConnectToKesher";
const KESHER_PAYMENT_PAGE_BASE = "https://ultra.kesherhk.info/external/paymentPage";

export class KesherApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public rawResponse?: unknown
  ) {
    super(message);
    this.name = "KesherApiError";
  }
}

function getCredentials() {
  const userName = process.env.KESHER_USERNAME;
  const password = process.env.KESHER_PASSWORD;
  if (!userName || !password) {
    throw new Error("KESHER_USERNAME and KESHER_PASSWORD must be set in environment variables");
  }
  return { userName, password };
}

/**
 * Generic Kesher API call
 */
async function callKesherApi<T>(
  func: string,
  params: Record<string, unknown> = {},
  format: string = "json"
): Promise<T> {
  const { userName, password } = getCredentials();

  const body = {
    Json: {
      userName,
      password,
      func,
      format,
      ...params,
    },
    format,
  };

  const response = await fetch(KESHER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new KesherApiError(
      response.status,
      `Kesher API HTTP error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as T;
}

// ============================================================
// Types
// ============================================================

export interface KesherRequestResult {
  Code: number;
  Data: string | null;
  Description: string | null;
  Status: boolean;
}

export interface KesherTranOutput {
  RequestResult: KesherRequestResult;
  NumTransaction: string | null;
  UniqNum: string | null;
  OKNum: string | null;
  ObligationReference: string | null;
  Sum: number;
  Name: string | null;
  Phone: string | null;
  Mail: string | null;
  Token: string | null;
  BitUrl: string | null;
  J5TranId: string | null;
  IssuerCompany: string | null;
  TransactionType: string | null;
  TransactionCreditType: string | null;
  [key: string]: unknown;
}

export interface KesherGetLinkTokenResponse {
  RequestResult: KesherRequestResult;
  Token: string;
}

export interface KesherTransactionData {
  Id: string;
  NumTransaction: string;
  FirstName: string | null;
  LastName: string | null;
  Name: string | null;
  Mail: string | null;
  Phone: string | null;
  Total: number;
  Status: string;
  TranDate: string;
  OKNum: string | null;
  Token: string | null;
  TransactionType: string;
  CreditType: string;
  ProjectName: string | null;
  ProjectNum: string | null;
  ObligationReference: string | null;
  ObligationNumPayment: number;
  PaymentPageName: string | null;
  [key: string]: unknown;
}

export interface SendTransactionParams {
  CreditNum?: string;
  Expiry?: string; // YYMM
  Token?: string; // Alternative to CreditNum+Expiry
  Cvv2?: string;
  Total: number; // In agorot (pennies)!
  Currency?: number; // 1=ILS, 2=USD
  CreditType: number; // 1=regular, 3=immediate, 8=payments, 10=standing order
  NumPayment?: number | null;
  Phone?: string;
  TransactionType: "debit" | "credit";
  ParamJ?: string; // J4=regular, J5=hold
  FirstName?: string;
  LastName?: string;
  Mail?: string;
  Address?: string;
  City?: string;
  ProjectNumber?: string;
  ReceiptName?: string;
  ReceiptFor?: string;
  Details?: string;
  ClientApiIdentity?: string;
  ObligationApiIdentity?: string;
  PaymentPage?: string;
  DynamicFields?: Array<{ FieldReference: string; value: string }>;
}

export interface GetLinkTokenParams {
  PaymentPageId: string;
  Total?: string; // Amount in ILS (not agorot for this endpoint)
  Currency?: number;
  CreditType?: number;
  NumPayment?: number;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Mail?: string;
  Tz?: string;
  Products?: string; // JSON string of products array
  CustomerRef?: string;
  [key: string]: unknown;
}

// ============================================================
// API Functions
// ============================================================

/**
 * Send a credit card transaction
 */
export async function sendTransaction(
  tran: SendTransactionParams
): Promise<KesherTranOutput> {
  return callKesherApi<KesherTranOutput>("SendTransaction", { tran });
}

/**
 * Get transaction data by transaction number
 */
export async function getTranData(
  transactionNum: string
): Promise<KesherTransactionData> {
  return callKesherApi<KesherTransactionData>("GetTranData", { transactionNum });
}

/**
 * Credit (refund) a transaction
 */
export async function creditTransaction(
  transactionNum: string
): Promise<KesherTranOutput> {
  return callKesherApi<KesherTranOutput>("CreditTransaction", { transactionNum });
}

/**
 * Cancel a transaction
 */
export async function cancelTransaction(
  numTransaction: string,
  apiKey: string,
  cancelHok: boolean = false
): Promise<KesherRequestResult> {
  return callKesherApi<KesherRequestResult>("CancelTranByNumTransaction", {
    apiKey,
    numTransaction,
    cancelHok,
  });
}

/**
 * Get a token for a payment page link (for iframe or redirect)
 * This generates a unique link that can be sent to a student
 */
export async function getLinkToken(
  request: GetLinkTokenParams
): Promise<KesherGetLinkTokenResponse> {
  return callKesherApi<KesherGetLinkTokenResponse>("GetLinkToken", { request });
}

/**
 * Build the full payment page URL from a payment page ID and optional token
 */
export function buildPaymentPageUrl(
  paymentPageId: string,
  params?: Record<string, string>
): string {
  const url = new URL(`${KESHER_PAYMENT_PAGE_BASE}/${paymentPageId}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Get transactions for a date range
 */
export async function getTransactions(
  fromDate: string, // yyyy/mm/dd
  toDate: string
): Promise<unknown> {
  return callKesherApi("GetTrans", { fromDate, toDate });
}

/**
 * Get obligations (standing orders) report
 */
export async function getObligations(
  fromDate: string,
  toDate: string
): Promise<unknown> {
  return callKesherApi("GetObligations", { fromDate, toDate });
}

/**
 * Update obligation (standing order) details
 */
export async function updateObligation(obligDetails: {
  ObligationRef: string;
  StartDate?: string | null;
  Sum?: string;
  Day?: string;
  NumPayments?: number;
  status?: string | null;
}): Promise<KesherRequestResult> {
  return callKesherApi<KesherRequestResult>("UpdateObligation", { obligDetails });
}

/**
 * Get error description by code
 */
export async function getErrorValue(code: string): Promise<string> {
  return callKesherApi<string>("GetErrorValue", { Code: code });
}
