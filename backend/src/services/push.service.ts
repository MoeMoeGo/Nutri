import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { pushTokenQueries } from "@/db/queries";
import { logger } from "@/utils/logger";

const expo = new Expo();

export interface PushPayload {
  title: string; body: string;
  data?: Record<string, unknown>; badge?: number;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  const tokenRows = await pushTokenQueries.findAllForUsers(userIds);
  const valid = tokenRows.filter((r) => Expo.isExpoPushToken(r.token));
  if (!valid.length) return;

  const messages: ExpoPushMessage[] = valid.map((r) => ({
    to: r.token, sound: "default", title: payload.title,
    body: payload.body, data: payload.data ?? {}, badge: payload.badge,
  }));

  const tickets: ExpoPushTicket[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try { tickets.push(...await expo.sendPushNotificationsAsync(chunk)); }
    catch (err) { logger.error("Push chunk failed:", err); }
  }

  const receiptIds = tickets.flatMap((t) => (t.status === "ok" && t.id ? [t.id] : []));
  if (!receiptIds.length) return;

  for (const chunk of expo.chunkPushNotificationReceiptIds(receiptIds)) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [, receipt] of Object.entries(receipts)) {
        if (receipt.status === "error" && (receipt.details as any)?.error === "DeviceNotRegistered") {
          const idx = receiptIds.indexOf((receipt as any).id ?? "");
          if (idx !== -1) await pushTokenQueries.deleteByToken(valid[idx]?.token ?? "");
        }
      }
    } catch (err) { logger.error("Receipt check failed:", err); }
  }
}
