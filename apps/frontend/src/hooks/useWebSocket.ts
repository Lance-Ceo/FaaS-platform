import { useEffect, useCallback } from 'react';
import { wsClient } from '@/lib/websocket';
import type { WsEventType } from '@faas/shared-types';

/**
 * Subscribe to a WebSocket event type.
 * Returns an unsubscribe function automatically on unmount.
 */
export function useWsEvent(type: WsEventType, handler: (payload: unknown) => void) {
  const stableHandler = useCallback(handler, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsub = wsClient.on(type, stableHandler);
    return unsub;
  }, [type, stableHandler]);
}

/**
 * Subscribe to live logs for a specific function.
 */
export function useFunctionLogs(
  functionId: string | undefined,
  onLog: (log: unknown) => void
) {
  useEffect(() => {
    if (!functionId) return;
    wsClient.subscribe(functionId);
    const unsub = wsClient.on('log', onLog);
    return () => {
      wsClient.unsubscribe(functionId);
      unsub();
    };
  }, [functionId, onLog]);
}
