import { describe, expect, it, vi } from "vitest";
import { createSoundPlayer, type AudioDriver } from "./sound";

const NAMES = ["aim", "splash"] as const;

function fakeDriver() {
  const played: string[] = [];
  const driver: AudioDriver<string> = {
    load: vi.fn(async (name: string) => name),
    start: (buffer) => played.push(buffer as string),
    resume: vi.fn(),
  };
  return { driver, played };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("sound player (B35, F21)", () => {
  it("stays silent until the player's first tap unlocks audio", async () => {
    const { driver, played } = fakeDriver();
    const player = createSoundPlayer(NAMES, () => driver);
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
    const player = createSoundPlayer(NAMES, () => driver);
    player.unlock();
    player.unlock();
    await settle();
    expect(driver.load).toHaveBeenCalledTimes(NAMES.length);
  });

  it("plays nothing while muted", async () => {
    const { driver, played } = fakeDriver();
    const player = createSoundPlayer(NAMES, () => driver);
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
    const player = createSoundPlayer(NAMES, () => driver);
    player.unlock();
    await settle();
    expect(() => player.play("aim")).not.toThrow();
    player.play("splash");
    expect(played).toEqual(["splash"]);
  });
});
