import type { Env } from "./room/room-object";

export { Room } from "./room/room-object";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;
const CREATE_ATTEMPTS = 5;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

const roomStub = (env: Env, code: string) => env.ROOM.get(env.ROOM.idFromName(code));

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  for (let i = 0; i < CREATE_ATTEMPTS; i++) {
    const code = newCode();
    const response = await roomStub(env, code).fetch(`https://room/create?code=${code}`, { method: "POST", body });
    const result = (await response.clone().json()) as { code?: string };
    if (result.code === "room_taken") continue;
    if (!response.ok) return response;
    return Response.json({ ...result, code });
  }
  return Response.json({ code: "server_busy" }, { status: 503 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/rooms" && request.method === "POST") return createRoom(request, env);

    const match = url.pathname.match(/^\/rooms\/([^/]+)\/(join|ws)$/);
    if (match) {
      const code = (match[1] as string).toUpperCase();
      if (code.length !== CODE_LENGTH) return Response.json({ code: "room_not_found" }, { status: 409 });
      return roomStub(env, code).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
