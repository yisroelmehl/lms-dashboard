/**
 * src/lib/webhookQueueService.ts
 *
 * In-process webhook queue that serialises concurrent incoming webhooks,
 * persists the log in WebhookLog, and – on failure – saves to WebhookQueue
 * for manual/automatic retry.
 *
 * Usage in an API route:
 *   import { enqueueWebhook } from "@/lib/webhookQueueService";
 *   const result = await enqueueWebhook("lead", payload, sourceIp, async (p) => { ... });
 */

import { prisma } from "./prisma";

// ── Types ──────────────────────────────────────────────────────
export interface WebhookResult {
  success: boolean;
  action?: string;
  entityType?: string;
  entityId?: string;
  error?: string;
  data?: unknown;
}

export type WebhookHandler = (payload: unknown) => Promise<WebhookResult>;

// ── In-memory serial queue ─────────────────────────────────────
let _running = false;
const _queue: Array<() => Promise<void>> = [];

function _drain() {
  if (_running || _queue.length === 0) return;
  _running = true;
  const task = _queue.shift()!;
  task().finally(() => {
    _running = false;
    _drain();
  });
}

// ── Main entry point ───────────────────────────────────────────
/**
 * Enqueue a webhook for serial processing.
 * - Logs every call to WebhookLog (success AND failure).
 * - On failure, saves entry to WebhookQueue for retry.
 * - Returns a Promise that resolves when THIS webhook has been processed.
 */
export function enqueueWebhook(
  webhookType: string,
  payload: unknown,
  sourceIp: string | null,
  handler: WebhookHandler,
): Promise<WebhookResult> {
  return new Promise<WebhookResult>((resolve) => {
    _queue.push(async () => {
      const startedAt = Date.now();
      let result: WebhookResult = { success: false };
      let logId: string | undefined;

      try {
        result = await handler(payload);
      } catch (err) {
        result = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      const elapsed = Date.now() - startedAt;

      // ── Persist WebhookLog ──
      try {
        const log = await prisma.webhookLog.create({
          data: {
            webhookType,
            sourceIp,
            success: result.success,
            action: result.action ?? null,
            errorMessage: result.error ?? null,
            entityType: result.entityType ?? null,
            entityId: result.entityId ?? null,
            processingTimeMs: elapsed,
            rawPayload: JSON.stringify(payload),
            resultData: JSON.stringify(result.data ?? null),
          },
        });
        logId = log.id;
      } catch (logErr) {
        console.error("[webhookQueue] Failed to write WebhookLog:", logErr);
      }

      // ── On failure, save to queue for retry ──
      if (!result.success) {
        try {
          await prisma.webhookQueue.create({
            data: {
              webhookLogId: logId ?? null,
              webhookType,
              status: "pending",
              rawPayload: JSON.stringify(payload),
              sourceIp,
              errorMessage: result.error ?? "Unknown error",
              maxRetries: 3,
              nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // retry in 5 min
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });
        } catch (qErr) {
          console.error("[webhookQueue] Failed to write WebhookQueue:", qErr);
        }
      }

      resolve(result);
    });

    _drain();
  });
}

// ── Retry a queued webhook ─────────────────────────────────────
/**
 * Retry a queue item by ID. Runs it through the provided handler.
 * On success marks status=success; on failure increments retry_count.
 */
export async function retryQueueItem(
  queueId: string,
  handler: WebhookHandler,
): Promise<{ success: boolean; message: string; retryCount?: number }> {
  const item = await prisma.webhookQueue.findUnique({ where: { id: queueId } });
  if (!item) return { success: false, message: "פריט לא נמצא בתור" };
  if (item.status === "success") return { success: true, message: "כבר הצליח" };

  await prisma.webhookQueue.update({
    where: { id: queueId },
    data: { status: "processing" },
  });

  const startedAt = Date.now();
  let result: WebhookResult = { success: false };

  try {
    const payload = item.rawPayload ? JSON.parse(item.rawPayload) : {};
    result = await handler(payload);
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  const elapsed = Date.now() - startedAt;
  const newRetryCount = item.retryCount + 1;

  if (result.success) {
    await prisma.webhookQueue.update({
      where: { id: queueId },
      data: { status: "success", lastRetryAt: new Date() },
    });
    // Update original log if exists
    if (item.webhookLogId) {
      await prisma.webhookLog.update({
        where: { id: item.webhookLogId },
        data: {
          success: true,
          action: result.action ?? undefined,
          entityId: result.entityId ?? undefined,
          errorMessage: null,
          processingTimeMs: elapsed,
        },
      });
    }
    return { success: true, message: "ניסיון חוזר הצליח", retryCount: newRetryCount };
  } else {
    const nextRetry =
      newRetryCount < item.maxRetries
        ? new Date(Date.now() + Math.pow(2, newRetryCount) * 5 * 60 * 1000)
        : null;

    await prisma.webhookQueue.update({
      where: { id: queueId },
      data: {
        status: newRetryCount >= item.maxRetries ? "failed" : "pending",
        retryCount: newRetryCount,
        lastError: result.error ?? "Unknown error",
        lastRetryAt: new Date(),
        nextRetryAt: nextRetry,
      },
    });
    return {
      success: false,
      message: `ניסיון חוזר נכשל (${newRetryCount}/${item.maxRetries})`,
      retryCount: newRetryCount,
    };
  }
}
