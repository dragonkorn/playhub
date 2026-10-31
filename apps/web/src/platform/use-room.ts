import type { ClientMessage, RoomSnapshot, ServerMessage } from "@playhub/game-contract";
import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";

const PING_MS = 15_000;
const MAX_RETRIES = 12;
const isTerminal = (code: number) => code >= 4001 && code <= 4003;

export interface RoomConnection {
  snapshot: RoomSnapshot | null;
  online: boolean;
  /** The room or seat is gone, and retrying won't help. */
  ended: boolean;
  rejection: { code: string; at: number } | null;
  send: (message: ClientMessage) => void;
}

export function useRoom(code: string, token: string | null): RoomConnection {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [online, setOnline] = useState(false);
  const [ended, setEnded] = useState(false);
  const [rejection, setRejection] = useState<RoomConnection["rejection"]>(null);
  const socket = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${location.host}/rooms/${code}/ws?token=${token}`;
    const ws = new ReconnectingWebSocket(url, undefined, {
      maxEnqueuedMessages: 1,
      maxRetries: MAX_RETRIES,
      shouldReconnectOnClose: (event) => !isTerminal(event.code),
    });
    socket.current = ws;

    ws.addEventListener("open", () => setOnline(true));
    ws.addEventListener("close", (event) => {
      setOnline(false);
      if (isTerminal(event.code) || ws.retryCount >= MAX_RETRIES) setEnded(true);
    });
    ws.addEventListener("message", (event) => {
      if (event.data === "pong") return;
      const message = JSON.parse(event.data as string) as ServerMessage;
      if (message.type === "snapshot") setSnapshot(message.snapshot);
      else setRejection({ code: message.code, at: Date.now() });
    });

    const ping = setInterval(() => {
      if (ws.readyState === ws.OPEN) ws.send("ping");
    }, PING_MS);

    return () => {
      clearInterval(ping);
      socket.current = null;
      ws.close();
    };
  }, [code, token]);

  const send = useCallback((message: ClientMessage) => {
    socket.current?.send(JSON.stringify(message));
  }, []);

  return { snapshot, online, ended, rejection, send };
}
