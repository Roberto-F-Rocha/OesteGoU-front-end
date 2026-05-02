import { useEffect, useRef } from "react";

interface LiveRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
  refreshOnFocus?: boolean;
}

export function useLiveRefresh(
  callback: () => void | Promise<void>,
  { intervalMs = 30000, enabled = true, refreshOnFocus = true }: LiveRefreshOptions = {},
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      void callbackRef.current();
    };

    const interval = window.setInterval(run, intervalMs);

    const handleVisibilityChange = () => {
      if (refreshOnFocus && document.visibilityState === "visible") {
        run();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", run);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", run);
    };
  }, [enabled, intervalMs, refreshOnFocus]);
}
