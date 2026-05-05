import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { SYNC_TASK_NAME } from "@/constants";
import { flushPendingLogs } from "@/services/sync.service";


TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const result = await flushPendingLogs();
    console.log(`[bg-sync] ${result.synced} synced, ${result.failed} failed`);
    return result.synced > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.error("[bg-sync] Task error:", err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn("[bg-sync] Background fetch not available on this device");
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval: 15 * 60, 
    stopOnTerminate: false,
    startOnBoot: true,
  });

  console.log("[bg-sync] Background sync registered");
}

export async function unregisterBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
  }
}
