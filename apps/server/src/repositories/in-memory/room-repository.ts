import type { RoomRecord, RoomRepository } from "../room-repository";

export class InMemoryRoomRepository implements RoomRepository {
  private json: string | null = null;

  async load(): Promise<RoomRecord | null> {
    return this.json === null ? null : (JSON.parse(this.json) as RoomRecord);
  }

  async save(record: RoomRecord): Promise<void> {
    this.json = JSON.stringify(record);
  }

  async delete(): Promise<void> {
    this.json = null;
  }
}
