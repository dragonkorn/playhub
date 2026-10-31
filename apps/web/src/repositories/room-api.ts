export class ApiError extends Error {}

export interface Admission {
  playerId: string;
  token: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { method: "POST", body: JSON.stringify(body) });
  } catch {
    throw new ApiError("server_busy");
  }
  const json = (await response.json().catch(() => null)) as { code?: string } | null;
  if (!response.ok || !json) throw new ApiError(json?.code ?? "server_busy");
  return json as T;
}

export const createRoom = (gameId: string, name: string) =>
  post<Admission & { code: string }>("/rooms", { gameId, name });

export const joinRoom = (code: string, name: string) =>
  post<Admission>(`/rooms/${encodeURIComponent(code)}/join`, { name });
