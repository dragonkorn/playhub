import type { RoomRecord, RoomRepository } from "../room-repository";

const KEY = "room";

/** One row per room, so one change costs one write. */
export class DurableObjectRoomRepository implements RoomRepository {
  constructor(private readonly storage: DurableObjectStorage) {}

  async load(): Promise<RoomRecord | null> {
    return (await this.storage.get<RoomRecord>(KEY)) ?? null;
  }

  async save(record: RoomRecord): Promise<void> {
    await this.storage.put(KEY, record);
  }

  async delete(): Promise<void> {
    await this.storage.deleteAll();
  }
}
