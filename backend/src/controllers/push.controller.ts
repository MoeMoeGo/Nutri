import { Response } from "express";
import { Expo } from "expo-server-sdk";
import { AuthRequest } from "@/middleware/auth.middleware";
import { pushTokenQueries } from "@/db/queries";
import { sendPushToUsers } from "@/services/push.service";
import { config } from "@/config";

export async function registerPushToken(req: AuthRequest, res: Response): Promise<void> {
  const { token, platform } = req.body;
  if (!Expo.isExpoPushToken(token)) { res.status(400).json({ message: "Invalid Expo push token" }); return; }
  const row = await pushTokenQueries.upsert(req.userId!, token, platform);
  res.status(201).json({ id: row?.id, registered: true });
}

export async function testPush(req: AuthRequest, res: Response): Promise<void> {
  if (config.nodeEnv === "production") { res.status(404).json({ message: "Not found" }); return; }
  await sendPushToUsers([req.userId!], { title: "Test notification", body: "Push is working! ✅", data: { test: true } });
  res.json({ sent: true });
}
