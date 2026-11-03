import { describe, expect, it } from "vitest";
import { TOPIC_COUNT } from "../logic/meta";
import { messages } from "./messages";
import { TOPICS } from "./topics";

describe("messages (I1, I2, N4)", () => {
  it("has the same keys in Thai and English", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort());
  });

  it("covers every rejection code", () => {
    for (const code of ["wrong_phase", "not_your_card", "no_topics"]) expect(messages.th[`error.${code}`]).toBeTruthy();
  });

  it("holds every topic the logic can draw", () => {
    expect(TOPICS).toHaveLength(TOPIC_COUNT);
    for (let i = 0; i < TOPIC_COUNT; i++) {
      for (const part of ["title", "low", "high"]) {
        expect(messages.th[`topic.${i}.${part}`]).toBeTruthy();
        expect(messages.en[`topic.${i}.${part}`]).toBeTruthy();
      }
    }
  });
});
