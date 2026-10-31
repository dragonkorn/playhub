import type { ClientMessage } from "@playhub/game-contract";
import { CloseCode } from "@playhub/game-contract";
import { DurableObject } from "cloudflare:workers";
import { games } from "../games";
import { DurableObjectRoomRepository } from "../repositories/durable-object/room-repository";
import { RoomEngine, type Outbound } from "./engine";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
}

interface Attachment {
  playerId: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Thin shell: sockets and alarms only. Room rules live in engine.ts. */
export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private engine() {
    return new RoomEngine({
      repository: new DurableObjectRoomRepository(this.ctx.storage),
      games,
      now: Date.now,
      random: Math.random,
      token: () => crypto.randomUUID().replaceAll("-", ""),
      id: () => crypto.randomUUID(),
    });
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/ws")) return this.acceptSocket(request, url);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ code: "invalid_request" }, 400);

    const engine = this.engine();
    const code = url.searchParams.get("code") ?? "";
    const result = url.pathname.endsWith("/join")
      ? await engine.join(body.name)
      : await engine.create(code, String(body.gameId), body.name);
    await this.syncAlarm();
    return result.ok ? json(result) : json(result, 409);
  }

  private async acceptSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response(null, { status: 426 });

    const result = await this.engine().connect(url.searchParams.get("token") ?? "");
    if (!result.ok) return new Response(null, { status: 401 });

    if (result.replaceExisting) {
      for (const old of this.ctx.getWebSockets(result.playerId)) old.close(CloseCode.replaced, "replaced");
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [result.playerId]);
    server.serializeAttachment({ playerId: result.playerId } satisfies Attachment);

    this.deliver(result.out);
    await this.syncAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const { playerId } = ws.deserializeAttachment() as Attachment;
    const message = parseMessage(raw);
    this.deliver((await this.engine().message(playerId, message)).out);
    await this.syncAlarm();
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.socketGone(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.socketGone(ws);
  }

  private async socketGone(ws: WebSocket) {
    const { playerId } = ws.deserializeAttachment() as Attachment;
    const open = this.ctx.getWebSockets(playerId).filter((s) => s !== ws && s.readyState === WebSocket.OPEN);
    if (open.length > 0) return;
    this.deliver((await this.engine().disconnect(playerId)).out);
    await this.syncAlarm();
  }

  override async alarm(): Promise<void> {
    this.deliver((await this.engine().alarm()).out);
    await this.syncAlarm();
  }

  private deliver(out: Outbound[]) {
    for (const item of out) {
      for (const socket of this.ctx.getWebSockets(item.to)) {
        if (item.kind === "send") socket.send(JSON.stringify(item.message));
        else socket.close(item.code, "closed");
      }
    }
  }

  private async syncAlarm() {
    const at = await this.engine().nextAlarm();
    if (at === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(at);
  }
}

function parseMessage(raw: string | ArrayBuffer): ClientMessage {
  try {
    return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;
  } catch {
    return { type: "invalid" } as unknown as ClientMessage;
  }
}
