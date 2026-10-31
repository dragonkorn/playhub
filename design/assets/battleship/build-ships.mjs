// Generates top-down ship SVGs into ./svg. One cell = 100 units. Bow faces right.
// Run: node build-ships.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "svg");

const INTACT = {
  hull: "#8FA9BC", deck: "#B7C8D4", line: "#22384C", dark: "#33495E",
  top: "#D7E2E9", house: "#E4ECF1", flight: "#4C6478", mark: "#FFC83D", sub: "#5C7A8C",
};
const SUNK = {
  hull: "#4B535B", deck: "#5E666E", line: "#15191E", dark: "#24292F",
  top: "#767E86", house: "#7E858C", flight: "#3A4047", mark: "#FF6B4A", sub: "#3F474E",
};

const hullPath = (w, t, b, bow) =>
  `M12 ${t + 18}Q12 ${t} 32 ${t}L${w - bow} ${t}Q${w - 46} ${t + 2} ${w - 6} 50Q${w - 46} ${b - 2} ${w - bow} ${b}L32 ${b}Q12 ${b} 12 ${b - 18}Z`;

const hull = (w, t, b, bow, p, deck = p.deck) => `
  <path d="${hullPath(w, t, b, bow)}" transform="translate(3 4)" fill="#000" opacity=".3"/>
  <path d="${hullPath(w, t, b, bow)}" fill="${p.hull}" stroke="${p.line}" stroke-width="3"/>
  <path d="${hullPath(w - 20, t + 7, b - 7, bow)}" transform="translate(6 0)" fill="${deck}"/>`;

const turret = (x, p, { scale = 1, aft = false } = {}) => `
  <g transform="translate(${x} 50) rotate(${aft ? 180 : 0}) scale(${scale})">
    <rect x="4" y="-9" width="32" height="5" rx="2" fill="${p.dark}"/>
    <rect x="4" y="4" width="32" height="5" rx="2" fill="${p.dark}"/>
    <circle r="16" fill="${p.dark}"/><circle r="12" fill="${p.top}"/><circle r="4" fill="${p.dark}"/>
  </g>`;

const house = (x, w, t, b, p) => `
  <rect x="${x}" y="${t}" width="${w}" height="${b - t}" rx="7" fill="${p.house}" stroke="${p.line}" stroke-width="2.5"/>
  <rect x="${x + 7}" y="${t + 7}" width="${w - 14}" height="${b - t - 14}" rx="3" fill="${p.dark}"/>`;

const funnel = (x, p) => `
  <ellipse cx="${x}" cy="50" rx="15" ry="11" fill="${p.dark}" stroke="${p.line}" stroke-width="2.5"/>
  <ellipse cx="${x}" cy="50" rx="9" ry="6" fill="#0B1A2B"/>`;

const plane = (x, y, p) => `
  <path transform="translate(${x} ${y})" d="M22 0L6 -3L-2 -17H-8L-5 -3L-16 -2L-20 -8H-24L-22 0L-24 8H-20L-16 2L-5 3L-8 17H-2L6 3Z" fill="${p.top}" stroke="${p.line}" stroke-width="1.5"/>`;

const SHIPS = {
  carrier: {
    title: "Carrier", cells: 5,
    draw: (p) => `${hull(500, 8, 92, 90, p, p.flight)}
      <path d="M40 50H420" stroke="${p.top}" stroke-width="3" stroke-dasharray="20 14"/>
      <path d="M300 22L440 42" stroke="${p.mark}" stroke-width="3"/>
      ${plane(90, 34, p)}${plane(160, 66, p)}${plane(370, 66, p)}
      <rect x="238" y="12" width="84" height="20" rx="6" fill="${p.house}" stroke="${p.line}" stroke-width="2.5"/>
      <rect x="248" y="17" width="64" height="10" rx="3" fill="${p.dark}"/>`,
  },
  battleship: {
    title: "Battleship", cells: 4,
    draw: (p) => `${hull(400, 12, 88, 110, p)}
      ${turret(62, p, { aft: true, scale: 1.1 })}${turret(114, p, { aft: true })}
      ${funnel(166, p)}${house(192, 66, 30, 70, p)}
      ${turret(290, p)}${turret(334, p, { scale: 1.1 })}`,
  },
  cruiser: {
    title: "Cruiser", cells: 3,
    draw: (p) => `${hull(300, 18, 82, 100, p)}
      ${turret(58, p, { aft: true, scale: 0.9 })}
      ${funnel(108, p)}${house(130, 52, 32, 68, p)}
      ${turret(214, p, { scale: 0.9 })}`,
  },
  submarine: {
    title: "Submarine", cells: 3,
    draw: (p) => `
      <rect x="11" y="31" width="280" height="46" rx="23" fill="#000" opacity=".3"/>
      <path d="M8 50L26 30V70Z" fill="${p.dark}" stroke="${p.line}" stroke-width="3"/>
      <rect x="16" y="27" width="278" height="46" rx="23" fill="${p.sub}" stroke="${p.line}" stroke-width="3"/>
      <path d="M44 50H270" stroke="${p.dark}" stroke-width="3" stroke-dasharray="14 12"/>
      <rect x="128" y="37" width="62" height="26" rx="13" fill="${p.house}" stroke="${p.line}" stroke-width="2.5"/>
      <circle cx="176" cy="50" r="5" fill="${p.mark}"/><circle cx="150" cy="50" r="5" fill="${p.dark}"/>`,
  },
  destroyer: {
    title: "Destroyer", cells: 2,
    draw: (p) => `${hull(200, 22, 78, 80, p)}
      ${funnel(52, p)}${house(74, 40, 36, 64, p)}
      ${turret(144, p, { scale: 0.75 })}`,
  },
};

const flame = (x, y) => `
  <g transform="translate(${x} ${y})">
    <path d="M0 -22C10 -8 17 -2 13 10C9 21 -9 21 -13 10C-17 0 -6 -6 0 -22Z" fill="#FF6B4A" stroke="#15191E" stroke-width="2"/>
    <path d="M0 -8C5 -2 8 1 6 7C3 12 -4 12 -6 7C-8 2 -3 -1 0 -8Z" fill="#FFC83D"/>
  </g>`;

const damage = (cells) =>
  Array.from({ length: cells }, (_, i) => {
    const x = 50 + i * 100;
    const y = i % 2 ? 60 : 42;
    return `
  <ellipse cx="${x}" cy="${y + 6}" rx="26" ry="16" fill="#15191E" opacity=".75"/>${flame(x, y)}`;
  }).join("");

const svg = (ship, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ship.cells * 100} 100" width="${ship.cells * 100}" height="100">
  <title>${ship.title}</title>${body}
</svg>
`;

mkdirSync(OUT, { recursive: true });
for (const [id, ship] of Object.entries(SHIPS)) {
  writeFileSync(join(OUT, `${id}.svg`), svg(ship, ship.draw(INTACT)));
  writeFileSync(join(OUT, `${id}-sunk.svg`), svg(ship, ship.draw(SUNK) + damage(ship.cells)));
}
