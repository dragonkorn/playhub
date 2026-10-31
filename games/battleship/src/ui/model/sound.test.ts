import { describe, expect, it, vi } from "vitest";
import { SOUND_NAMES, createSoundPlayer, type AudioDriver } from "./sound";

function fakeDriver() {
  const played: string[] = [];
  const driver: AudioDriver = {
    load: vi.fn(async (name: string) => name),
    start: (buffer) => played.push(buffer as string),
    resume: vi.fn(),
  };
  return { driver, played };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("sound player (B35)", () => {
  it("has the 8 sounds from the spec", () => {
    expect(SOUND_NAMES).toEqual(["aim", "launch", "whistle", "splash", "explosion", "explosion-big", "your-turn", "eliminated"]);
  });

  it("stays silent until the player's first tap unlocks audio", async () => {
    const { driver, played } = fakeDriver();
    const player = createSoundPlayer(() => driver);
    player.play("aim");
    expect(played).toEqual([]);

    player.unlock();
    await settle();
    player.play("aim");
    expect(played).toEqual(["aim"]);
    expect(driver.resume).toHaveBeenCalled();
  });

  it("loads each sound once", async () => {
    const { driver } = fakeDriver();
    const player = createSoundPlayer(() => driver);
    player.unlock();
    player.unlock();
    await settle();
    expect(driver.load).toHaveBeenCalledTimes(SOUND_NAMES.length);
  });

  it("plays nothing while muted", async () => {
    const { driver, played } = fakeDriver();
    const player = createSoundPlayer(() => driver);
    player.unlock();
    await settle();
    player.setMuted(true);
    player.play("splash");
    expect(played).toEqual([]);
    player.setMuted(false);
    player.play("splash");
    expect(played).toEqual(["splash"]);
  });

  it("keeps the game running if a sound fails to load", async () => {
    const { driver, played } = fakeDriver();
    driver.load = async (name) => {
      if (name === "aim") throw new Error("offline");
      return name;
    };
    const player = createSoundPlayer(() => driver);
    player.unlock();
    await settle();
    expect(() => player.play("aim")).not.toThrow();
    player.play("splash");
    expect(played).toEqual(["splash"]);
  });
});
