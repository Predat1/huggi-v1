import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type CollabMessage = {
  type: string;
  path?: string;
  content?: string;
  userId?: string;
  online?: number;
  _from?: string;
};

/**
 * Real-time collaboration over WebSocket.
 * Connects to the project room, broadcasts file edits, and receives peer changes.
 */
export function useCollaboration(
  projectId: string | null,
  userId: string | undefined,
  studioMode: boolean,
  onFileUpdate: (path: string, content: string) => void,
) {
  const [onlineUsers, setOnlineUsers] = useState(1);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId || !userId || !studioMode) return;

    let cancelled = false;
    let ws: WebSocket | null = null;

    (async () => {
      // Retrieve Supabase session token for server-side JWT verification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      if (cancelled) return;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const params = new URLSearchParams({ projectId, userId, token });
      ws = new WebSocket(`${proto}//${host}?${params}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        let msg: CollabMessage;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (
          msg.type === 'connected' ||
          msg.type === 'peer_joined' ||
          msg.type === 'peer_left'
        ) {
          setOnlineUsers(msg.online ?? 1);
        } else if (msg.type === 'file_update' && msg.path && msg.content !== undefined) {
          onFileUpdate(msg.path, msg.content);
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => { wsRef.current = null; };
    })();

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
      setOnlineUsers(1);
    };
  }, [projectId, userId, studioMode]);

  const broadcastFileUpdate = (path: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'file_update', path, content }));
    }
  };

  return { onlineUsers, broadcastFileUpdate };
}
