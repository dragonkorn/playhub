import { MAX_NAME_GRAPHEMES } from "@playhub/game-contract";

const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });

/** Spec R6: keeps typing within the name limit, counting a Thai letter and its marks as one. */
export function clampName(value: string): string {
  return [...segmenter.segment(value)]
    .slice(0, MAX_NAME_GRAPHEMES)
    .map((s) => s.segment)
    .join("");
}
