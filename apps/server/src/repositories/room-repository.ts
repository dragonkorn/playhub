import type { ConnectionStatus, PlayerId, RoomPhase, SeatStatus } from "@playhub/game-contract";

export interface Seat {
  id: PlayerId;
  name: string;
  /** Secret. Must never reach a snapshot. */
  token: string;
  connection: ConnectionStatus;
  status: SeatStatus;
  disconnectedAt: number | null;
  graceExpired: boolean;
  /** Room version when this seat last became active. Older moves are stale. */
  activeSince: number;
}

export interface RoomRecord {
  code: string;
  gameId: string;
  phase: RoomPhase;
  hostId: PlayerId;
  version: number;
  options: unknown;
  seats: Seat[];
  gameState: unknown | null;
  ranking: PlayerId[][] | null;
  lastActivity: number;
}

export interface RoomRepository {
  load(): Promise<RoomRecord | null>;
  save(record: RoomRecord): Promise<void>;
  delete(): Promise<void>;
}
