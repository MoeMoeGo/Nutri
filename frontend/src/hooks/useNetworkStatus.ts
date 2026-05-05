import { useEffect, useRef, useState } from "react";
import * as Network from "expo-network";
import { flushPendingLogs } from "@/services/sync.service";
import { useAuthStore } from "@/store/auth.store";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    Network.getNetworkStateAsync().then((state) => {
      setIsOnline(!!state.isInternetReachable);
    });

    const interval = setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      const online = !!state.isInternetReachable;

      setIsOnline(online);

      if (online && wasOffline.current) {
        wasOffline.current = false;
        flushPendingLogs().catch(() => {});
      } else if (!online) {
        wasOffline.current = true;
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return { isOnline };
}
