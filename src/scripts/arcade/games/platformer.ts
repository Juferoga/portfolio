// 2025 · clean-arch.nes — plataformas old school (inspirado en los clásicos de 8 bits, todo original).
// Las 4 capas de Clean Architecture son las zonas del nivel (UI → Infra → Aplicación → Dominio);
// las ideas 💡 del second brain hacen de monedas; bugs, código espagueti y acoplamiento son los enemigos;
// el power-up REFACTOR te agranda (aguantas un golpe) y la bandera del release v1.0 cierra el nivel.
// La física va en unidades de baldosa (tile): el tamaño en pantalla sale de E.H, así un resize no pierde estado.

import { clamp, rand, type Engine, type GameMeta, type Scene } from "../engine";

export const meta: GameMeta = {
  name: { es: "CAPA POR CAPA", en: "LAYER BY LAYER" },
  story: {
    es: "Un 2025 callado en GitHub (19 commits), no quieto: cloud developer en Banco de Bogotá, Clean Architecture (\"¿Cómo funciona? buena pregunta…\") y un second brain para las ideas.",
    en: "A quiet 2025 on GitHub (19 commits), not an idle one: cloud developer at Banco de Bogotá, Clean Architecture (\"how does it work? good question…\") and a second brain for ideas.",
  },
  goal: {
    es: "Cruza las 4 capas (UI → Infra → Aplicación → Dominio) y toca la bandera del release v1.0.",
    en: "Cross the 4 layers (UI → Infra → Application → Domain) and touch the release v1.0 flag.",
  },
  tip: {
    es: "Golpea los bloques ? desde abajo: sueltan 💡 ideas y el REFACTOR (aguantas un golpe) · pisa a los bugs · pierdes ♥ si te tocan o caes a un hueco",
    en: "Hit ? blocks from below: they drop 💡 ideas and the REFACTOR (take one extra hit) · stomp the bugs · you lose ♥ if they touch you or you fall in a pit",
  },
  ctrl: {
    desktop: { es: "←/→ o A/D correr · Espacio/W/↑ saltar (mantén = más alto)", en: "←/→ or A/D run · Space/W/↑ jump (hold = higher)" },
    touch: { es: "◀ ▶ correr · SALTA (mantén = más alto)", en: "◀ ▶ run · JUMP (hold = higher)" },
  },
};

// ── mapa ────────────────────────────────────────────────────────────────────────
const ROWS = 15, G = 12, COLS = 215; // G = fila donde empieza el suelo
const FLAG = 202, CASTLE = 205, DOOR = 207.1;
const ZONE_AT = [0, 55, 108, 160];
const CHECKPOINTS = [2, 55, 108, 160];
// baldosas
const EMPTY = 0, GROUND = 1, BRICK = 2, QI = 3, QR = 4, USED = 5, STONE = 6, PTL = 7, PTR = 8, PBL = 9, PBR = 10;
// enemigos
const BUG = 0, SPAG = 1, BLOB = 2;

type I18n = [string, string];
interface Spawn { k: number; c: number }
interface Sign { c: number; lines: I18n[]; z: number; big: boolean }
interface PipeLabel { c: number; h: number; txt: string }

function buildLevel() {
  const tiles = new Uint8Array(COLS * ROWS), ideas = new Uint8Array(COLS * ROWS);
  const foes: Spawn[] = [], pipes: PipeLabel[] = [];
  const set = (c: number, r: number, t: number) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) tiles[r * COLS + c] = t; };
  const ground = (a: number, b: number) => { for (let c = a; c < b; c++) for (let r = G; r < ROWS; r++) set(c, r, GROUND); };
  const KEY: Record<string, number> = { B: BRICK, "?": QI, R: QR, X: STONE };
  const row = (c: number, r: number, s: string) => { for (let i = 0; i < s.length; i++) if (KEY[s[i]]) set(c + i, r, KEY[s[i]]); };
  const pipe = (c: number, h: number, txt: string) => {
    set(c, G - h, PTL); set(c + 1, G - h, PTR);
    for (let r = G - h + 1; r < G; r++) { set(c, r, PBL); set(c + 1, r, PBR); }
    pipes.push({ c, h, txt });
  };
  const step = (c: number, h: number) => { for (let r = G - h; r < G; r++) set(c, r, STONE); };
  const pillar = (c: number, h: number) => { for (let r = G - h; r < ROWS; r++) set(c, r, STONE); };
  const idea = (c: number, r: number) => { ideas[r * COLS + c] = 1; };
  const line = (c: number, r: number, n: number) => { for (let i = 0; i < n; i++) idea(c + i, r); };
  const arc = (c: number) => { idea(c, G - 4); idea(c + 1, G - 5); idea(c + 2, G - 4); };
  const foe = (k: number, c: number) => foes.push({ k, c });

  // capa 1 · UI: aprender a correr, saltar y golpear bloques
  ground(0, 34); ground(37, 69);
  line(10, G - 2, 3);
  row(11, G - 4, "?");
  row(15, G - 4, "B?R?B"); row(17, G - 8, "?"); idea(15, G - 5); idea(19, G - 5);
  foe(BUG, 21);
  pipe(24, 2, "fetch()"); foe(BUG, 27); pipe(30, 3, "http");
  arc(34);
  row(40, G - 4, "BBBB"); line(40, G - 5, 4);
  foe(BUG, 45); foe(BUG, 47);
  line(50, G - 2, 3);

  // capa 2 · INFRAESTRUCTURA: tuberías de datos y código espagueti
  pipe(63, 2, "ETL"); pipe(66, 3, "Kafka"); idea(66, G - 4); idea(67, G - 4);
  arc(69);
  ground(72, 85);
  row(74, G - 3, "XXXX"); line(74, G - 4, 4);
  foe(SPAG, 79); row(80, G - 4, "B?B"); foe(SPAG, 83);
  pillar(87, 2); idea(87, G - 3); idea(87, G - 4);
  ground(90, 125);
  pipe(93, 3, "CI/CD"); foe(SPAG, 96); pipe(99, 2, "S3");
  row(102, G - 4, "BRB"); line(104, G - 2, 2); foe(BUG, 106);

  // capa 3 · APLICACIÓN: casos de uso en dos pisos y bloques acoplados que saltan
  row(115, G - 3, "X?X?X"); row(116, G - 7, "?B?"); idea(115, G - 4); idea(119, G - 4); line(116, G - 8, 3);
  foe(BLOB, 121); foe(BLOB, 123);
  arc(125);
  ground(128, 134); for (let i = 0; i < 4; i++) step(130 + i, i + 1);
  idea(134, G - 6); idea(135, G - 6);
  ground(136, 152); for (let i = 0; i < 4; i++) step(136 + i, 4 - i);
  foe(BLOB, 142); foe(BUG, 144);
  row(145, G - 4, "B?B?B");
  foe(BLOB, 149);
  pipe(150, 2, "DTO");
  arc(152);

  // capa 4 · DOMINIO: el grafo del second brain, la escalera final y el release
  ground(155, 181);
  idea(169, G - 2); idea(170, G - 3); idea(171, G - 2);
  row(172, G - 4, "?B?"); line(172, G - 5, 3);
  idea(175, G - 2); idea(176, G - 3); idea(177, G - 2);
  foe(BLOB, 166); foe(SPAG, 178);
  arc(181);
  ground(184, COLS);
  foe(BUG, 188); foe(BUG, 190);
  for (let i = 0; i < 8; i++) step(192 + i, i + 1);

  const signs: Sign[] = [
    { c: 2, z: 0, big: true, lines: [["CAPA 1/4 · UI", "LAYER 1/4 · UI"], ["¿Cómo funciona? buena pregunta…", "How does it work? good question…"]] },
    { c: 43, z: 0, big: false, lines: [["🐛 bugs: písalos desde arriba", "🐛 bugs: stomp them from above"]] },
    { c: 56.6, z: 1, big: true, lines: [["CAPA 2/4 · INFRAESTRUCTURA", "LAYER 2/4 · INFRASTRUCTURE"], ["terraform apply ☁ · Banco de Bogotá", "terraform apply ☁ · Banco de Bogotá"]] },
    { c: 78, z: 1, big: false, lines: [["🍝 código espagueti", "🍝 spaghetti code"]] },
    { c: 109.6, z: 2, big: true, lines: [["CAPA 3/4 · APLICACIÓN", "LAYER 3/4 · APPLICATION"], ["casos de uso · puertos y adaptadores", "use cases · ports & adapters"]] },
    { c: 141, z: 2, big: false, lines: [["🔗 acoplamiento alto: ¡desacopla!", "🔗 tight coupling: decouple it!"]] },
    { c: 161.6, z: 3, big: true, lines: [["CAPA 4/4 · DOMINIO", "LAYER 4/4 · DOMAIN"], ["second-brain: your brain is for having ideas", "second-brain: your brain is for having ideas"]] },
    { c: 185, z: 3, big: false, lines: [["2025 · 19 commits: callado, no quieto", "2025 · 19 commits: quiet, not idle"]] },
  ];
  return { tiles, ideas, foes, pipes, signs };
}

// ── pixel art ──────────────────────────────────────────────────────────────────
type Pal = Record<string, string>;
function sprite(rows: string[], pal: Pal, flip = false): HTMLCanvasElement {
  const w = rows[0].length, h = rows.length;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = pal[rows[y][x]];
    if (!col) continue;
    g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }
  return c;
}
/** baldosa 16×16 generada pixel a pixel */
function tile(f: (x: number, y: number) => string | null): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = 16; c.height = 16;
  const g = c.getContext("2d")!;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const col = f(x, y); if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
  return c;
}
const hash = (x: number, y: number, s: number) => ((Math.imul(x + 31, 73856093) ^ Math.imul(y + 17, 19349663) ^ Math.imul(s + 7, 83492791)) >>> 0) % 100;
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// el dev: capucha, audífonos y portátil mental
const HEAD = [
  "...pppppp...",
  "..pHHHHHHp..",
  ".PpHHHHHHpP.",
  ".PPHsssssPP.",
  ".PPskssksPP.",
  "..Hsssssss..",
  "...ssssss...",
];
const TORSO = ["..hhhhhhhh..", ".hhhwhhwhhh.", ".hhhwhhwhhh.", "shhhhhhhhhhs", "..hhhhhhhh.."];
const TORSO_UP = ["s.hhhhhhhh.s", ".hhhwhhwhhh.", ".hhhwhhwhhh.", ".hhhhhhhhhh.", "..hhhhhhhh.."];
const LEGS = [
  ["..jjj..jjj..", "..jjj..jjj..", "..jj....jj..", ".bbb....bbb."],
  ["..jjj.jjj...", ".jjj...jjj..", ".jj.....jj..", "bbb......bb."],
  ["...jjjjj....", "....jjj.....", "....jjj.....", "...bbbb....."],
  ["..jjj..jjj..", ".jjj....jjj.", ".bb......bb.", "............"],
];
const DEV_PAL: Pal = { p: "#ff8cc6", P: "#ff3d9a", H: "#3b2414", s: "#d79a6a", k: "#141414", h: "#7b5cff", w: "#e8e2ff", j: "#3a64e0", b: "#f4f4f4" };

const BUG_ROWS = [
  "..k......k..", "...k....k...", "...rrrrrr...", "..rwkrrwkr..", ".rrrrrrrrrr.",
  ".rRrrRRrrRr.", ".rrrrrrrrrr.", "..rRrrrrRr..", "...rrrrrr...",
];
const BUG_PAL: Pal = { r: "#ff5555", R: "#a8202a", w: "#ffffff", k: "#1a0a0a" };
const SPAG_ROWS = [
  "..yy.yyy....", ".y..y...yy..", "y.yy.yyy..y.", "y.y.wk.wk.y.", ".yy.yy.yy.yy", "y..y..y..y.y",
  ".yy.yy.yy.y.", "y..yy..yy..y", ".yy..yy..yy.", "y..y..y..y..", ".y..yy.yy.y.", "..yy..y..yy.",
];
const SPAG_PAL: Pal = { y: "#ffcc33", w: "#ffffff", k: "#1a0a0a" };
const BLOB_ROWS = [
  "..vv....vv..", ".vvvv..vvvv.", "vvvvvvvvvvvv", "vwkvvvvvwkvv", "vvvvccccvvvv",
  "vvvvvvvvvvvv", "vVvvvvvvvVvv", ".vvvv..vvvv.", "..vv....vv..",
];
const BLOB_PAL: Pal = { v: "#a970ff", V: "#6d3fc4", c: "#e0e6ff", w: "#ffffff", k: "#1a0a0a" };
const BULB_ROWS = ["..yyyy..", ".yWWyyy.", "yWyyyyyy", "yyyyyyyy", "yyyyyyyy", ".yyyyyy.", "..yyyy..", "..gggg..", "..gGgg..", "...gg..."];
const BULB_PAL: Pal = { y: "#ffe14d", W: "#ffffff", g: "#9aa3b5", G: "#d6dbe6" };
const CHIP_ROWS = [
  "c.c.cc.c.c", "cccccccccc", "cCkkCCkkCc", "cCkCCCCkCc", "ckCCCCCCkc",
  "cCkCCCCkCc", "cCkkCCkkCc", "cccccccccc", "c.c.cc.c.c",
];
const CHIP_PAL: Pal = { c: "#0e7c72", C: "#3dd9ff", k: "#ffffff" };
const Q_GLYPH = [".kkkk.", "kk..kk", "....kk", "...kk.", "..kk..", "..kk..", "......", "..kk.."];

const ZONES = [
  { es: "UI", en: "UI", sub: ["componentes y vistas", "components & views"] as I18n, top: "#ff3d9a", hi: "#ffa6d2", dk: "#9c1f5c", dirt: "#33142b", dot: "#4f2142" },
  { es: "INFRAESTRUCTURA", en: "INFRASTRUCTURE", sub: ["adaptadores, nube y datos", "adapters, cloud & data"] as I18n, top: "#a970ff", hi: "#d9c2ff", dk: "#5d36a8", dirt: "#1e1838", dot: "#2f2756" },
  { es: "APLICACIÓN", en: "APPLICATION", sub: ["casos de uso", "use cases"] as I18n, top: "#33ff66", hi: "#b4ffc6", dk: "#1f9943", dirt: "#0e2a1a", dot: "#184329" },
  { es: "DOMINIO", en: "DOMAIN", sub: ["entidades · el núcleo", "entities · the core"] as I18n, top: "#ffcc33", hi: "#fff0a8", dk: "#b07d10", dirt: "#30220a", dot: "#4d3812" },
];

interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; ground: boolean }
interface Foe extends Body { k: number; c0: number; dir: number; st: number; t: number; on: boolean; hop: number }
interface Item extends Body { rise: number; r0: number; on: boolean }
interface Pop { x: number; y: number; vy: number; t: number }
interface Txt { x: number; y: number; txt: string; col: string; t: number }

export function create(E: Engine): Scene {
  const { ctx, C } = E;
  const LV = buildLevel();
  const { tiles, ideas } = LV;
  const idx = (c: number, r: number) => r * COLS + c;
  const zoneOf = (c: number) => (c >= ZONE_AT[3] ? 3 : c >= ZONE_AT[2] ? 2 : c >= ZONE_AT[1] ? 1 : 0);
  const solid = (c: number, r: number) => (c < 0 || c >= COLS ? true : r < 0 || r >= ROWS ? false : tiles[idx(c, r)] !== EMPTY);

  // ── sprites (tamaño nativo; se escalan sin suavizado al dibujar) ──────────────
  const devFrames = LEGS.map((legs, i) => HEAD.concat(i === 3 ? TORSO_UP : TORSO, legs));
  const dev = [devFrames.map((f) => sprite(f, DEV_PAL)), devFrames.map((f) => sprite(f, DEV_PAL, true))];
  const bugF = [sprite([...BUG_ROWS, ".k..k..k..k."], BUG_PAL), sprite([...BUG_ROWS, "k..k..k..k.."], BUG_PAL)];
  const spagF = [sprite(SPAG_ROWS, SPAG_PAL), sprite(SPAG_ROWS, SPAG_PAL, true)];
  const blobF = [sprite(BLOB_ROWS, BLOB_PAL), sprite(BLOB_ROWS, BLOB_PAL, true)];
  const bulb = sprite(BULB_ROWS, BULB_PAL);
  const chip = sprite(CHIP_ROWS, CHIP_PAL);

  const gTop = ZONES.map((z, zi) => tile((x, y) => (y === 0 ? z.hi : y < 3 ? z.top : y === 3 ? z.dk : y === 4 && x % 4 === 0 ? z.dk : hash(x, y, zi) < 10 ? z.dot : z.dirt)));
  const gFill = ZONES.map((z, zi) => tile((x, y) => (hash(x, y, zi + 9) < 10 ? z.dot : (x === 5 || x === 13) && y % 8 < 3 ? z.dot : z.dirt)));
  const brick = tile((x, y) => {
    if (y % 4 === 3) return "#2a0f04";
    const off = (y >> 2) % 2 === 0 ? x === 7 || x === 15 : x === 3 || x === 11;
    if (off) return "#2a0f04";
    return y % 4 === 0 ? "#e8834a" : "#c0541c";
  });
  const stone = tile((x, y) => {
    if (x === 0 || y === 0) return "#b4bdd6";
    if (x === 15 || y === 15) return "#323a52";
    if ((x === 4 || x === 11) && y >= 4 && y <= 11) return "#4a5370";
    if ((y === 4 || y === 11) && x >= 4 && x <= 11) return "#4a5370";
    if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return "#3dd9ff";
    return "#7a84a2";
  });
  const qBlock = (fill: string) => tile((x, y) => {
    const B = "#5a2a00";
    if (x === 0 || y === 0 || x === 15 || y === 15) return B;
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return B;
    const gx = x - 5, gy = y - 4;
    if (gx >= 0 && gx < 6 && gy >= 0 && gy < 8 && Q_GLYPH[gy][gx] === "k") return B;
    if (gx >= 1 && gx < 7 && gy >= 1 && gy < 9 && Q_GLYPH[gy - 1][gx - 1] === "k") return "#ffe7a8";
    if (x === 1 || y === 1) return "#ffe08a";
    return fill;
  });
  const qFrames = [qBlock("#ffb020"), qBlock("#ffc649"), qBlock("#e89810")];
  const used = tile((x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || ((x === 2 || x === 13) && (y === 2 || y === 13)) ? "#2a1a0a" : "#7a5232"));
  const PO = "#062e2a", PB = "#1fb6a8", PH = "#9ff5ea", PS = "#0e7c72";
  const pipeTL = tile((x, y) => (x === 0 || y === 0 || y === 15 ? PO : x >= 2 && x <= 4 ? PH : x >= 6 && x <= 7 ? "#5fe0d0" : PB));
  const pipeTR = tile((x, y) => (x === 15 || y === 0 || y === 15 ? PO : x >= 10 && x <= 13 ? PS : PB));
  const pipeBL = tile((x) => (x === 0 ? null : x === 1 ? PO : x >= 3 && x <= 5 ? PH : x >= 7 && x <= 8 ? "#5fe0d0" : PB));
  const pipeBR = tile((x) => (x === 15 ? null : x === 14 ? PO : x >= 9 && x <= 12 ? PS : PB));
  const TILE_IMG: (HTMLCanvasElement | null)[] = [null, null, brick, null, null, used, stone, pipeTL, pipeTR, pipeBL, pipeBR];

  // ── fondos en pixel art (resolución baja, se dibujan escalados) ───────────────
  const pix = (w: number, h: number, f: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    f(c.getContext("2d")!, rng(seed)); return c;
  };
  // lejano: estrellas + grafo de notas tipo Obsidian
  const far = pix(400, 170, (g, r) => {
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${(0.15 + r() * 0.5).toFixed(2)})`; g.fillRect(Math.floor(r() * 400), Math.floor(r() * 170), 1, 1); }
    const nodes = Array.from({ length: 26 }, () => ({ x: 10 + Math.floor(r() * 380), y: 10 + Math.floor(r() * 110) }));
    g.fillStyle = "rgba(169,112,255,0.22)";
    for (const a of nodes) {
      const near = nodes.filter((b) => b !== a).sort((m, n) => Math.hypot(m.x - a.x, m.y - a.y) - Math.hypot(n.x - a.x, n.y - a.y)).slice(0, 2);
      for (const b of near) {
        const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        for (let i = 0; i <= n; i++) g.fillRect(Math.round(a.x + ((b.x - a.x) * i) / n), Math.round(a.y + ((b.y - a.y) * i) / n), 1, 1);
      }
    }
    for (const [i, a] of nodes.entries()) {
      const big = i % 5 === 0;
      g.fillStyle = i % 3 === 0 ? "#3dd9ff" : "#a970ff";
      g.fillRect(a.x - 1, a.y - 1, big ? 3 : 2, big ? 3 : 2);
    }
  }, 2025);
  // cerros orientales de Bogotá: Monserrate (con su iglesia) y Guadalupe (con la virgen)
  const hills = pix(320, 56, (g) => {
    const hAt = (x: number) => {
      const k = (Math.PI * 2 * x) / 320;
      const peak = (c: number, s: number, a: number) => a * Math.exp(-(((x - c) / s) ** 2));
      return 20 + 5 * Math.sin(k * 2 + 1) + 3 * Math.sin(k * 5) + 1.5 * Math.sin(k * 11) + peak(100, 18, 17) + peak(220, 14, 14);
    };
    for (let x = 0; x < 320; x++) {
      const top = 56 - Math.round(hAt(x));
      g.fillStyle = "#0f2236"; g.fillRect(x, top, 1, 56 - top);
      g.fillStyle = "#24506a"; g.fillRect(x, top, 1, 1);
      g.fillStyle = "#0b1a2a";
      for (let y = top + 3; y < 56; y++) if ((x * 3 + y * 5) % 11 === 0) g.fillRect(x, y, 1, 1);
    }
    const m = 56 - Math.round(hAt(100));
    g.fillStyle = "#e8e8f0"; g.fillRect(97, m - 3, 6, 3); g.fillRect(98, m - 6, 1, 3); g.fillRect(101, m - 5, 1, 2);
    g.fillStyle = "#ffcc33"; g.fillRect(99, m - 2, 1, 1);
    const q = 56 - Math.round(hAt(220));
    g.fillStyle = "#e8e8f0"; g.fillRect(220, q - 5, 1, 5); g.fillRect(219, q - 4, 3, 1);
  }, 7);
  // skyline: torre Colpatria (corona de neón) y BD Bacatá
  const city = pix(256, 48, (g, r) => {
    const win = (x: number, w: number, top: number) => {
      for (let y = top + 2; y < 46; y += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) {
        if (r() < 0.22) { g.fillStyle = r() < 0.7 ? "rgba(255,204,51,0.5)" : "rgba(61,217,255,0.45)"; g.fillRect(xx, y, 1, 1); }
      }
    };
    let x = 0;
    while (x < 256) {
      const w = 5 + Math.floor(r() * 9), h = 6 + Math.floor(r() * 18);
      g.fillStyle = r() < 0.5 ? "#0c1730" : "#101f3c"; g.fillRect(x, 48 - h, w, h);
      win(x, w, 48 - h);
      x += w + (r() < 0.3 ? 1 : 0);
    }
    // Colpatria
    g.fillStyle = "#13244a"; g.fillRect(70, 8, 8, 40); win(70, 8, 8);
    ["#ff3d9a", "#3dd9ff", "#a970ff", "#ff3d9a"].forEach((col, i) => { g.fillStyle = col; g.fillRect(70, 8 + i, 8, 1); });
    // BD Bacatá
    g.fillStyle = "#162a52"; g.fillRect(170, 4, 7, 44); g.fillRect(172, 0, 1, 4); win(170, 7, 4);
    g.fillStyle = "#ff5555"; g.fillRect(172, 0, 1, 1);
  }, 99);

  // ── estado ────────────────────────────────────────────────────────────────────
  const SW = 0.66, SH = 0.92, BW = 0.84, BH = 1.4;
  const MAXV = 7.2, JV = 21.9, GRAV_UP = 52, GRAV_CUT = 150, GRAV_DOWN = 80, MAXFALL = 22;
  const p = { x: CHECKPOINTS[0] + 0.15, y: G - SH, w: SW, h: SH, vx: 0, vy: 0, ground: false, big: false, face: 1, inv: 0, anim: 0 };
  let mode: "play" | "dead" | "flag" = "play";
  let modeT = 0, pit = false, phase = 0, cleared = false, fireT = 0;
  let coyote = 0, buffer = 0, combo = 0, prevTouchJump = false;
  let cp = 0, zone = 0, toastT = 2.6, best = 0, got = 0, lifeAt = 25;
  let flagY = G - 8.6;
  let camX = 0;
  const foes: Foe[] = LV.foes.map((s) => {
    const w = s.k === SPAG ? 0.7 : 0.72, h = s.k === BUG ? 0.6 : s.k === SPAG ? 0.72 : 0.54;
    return { k: s.k, c0: s.c, x: s.c + 0.1, y: G - h, w, h, vx: 0, vy: 0, ground: false, dir: -1, st: 0, t: 0, on: false, hop: 1 + Math.random() };
  });
  const items: Item[] = [];
  const pops: Pop[] = [];
  const txts: Txt[] = [];
  const bumps = new Map<number, number>();
  let tLeft = false, tRight = false, tJump = false;

  // ── layout: tamaño de baldosa según la pantalla ─────────────────────────────
  let S = 1, TS = 40, TSd = 80, oy = 0, gy = 0, viewW = 20, camD = 0;
  let sky: CanvasGradient | null = null;
  const btn = { l: { x: 0, y: 0, w: 0, h: 0 }, r: { x: 0, y: 0, w: 0, h: 0 }, j: { x: 0, y: 0, w: 0, h: 0 } };
  function fit() {
    S = E.cvs.width / E.W;
    const want = Math.max(16, Math.min(E.H / 15.4, E.W / 10));
    TSd = Math.max(12, Math.round(want * S)); TS = TSd / S;
    const extra = E.H - ROWS * TS;
    const pad = E.coarse ? clamp(extra, 0, 170) : 0;
    oy = Math.round((extra - pad) * S) / S;
    gy = oy + G * TS;
    viewW = E.W / TS;
    camX = clamp(camX, 0, Math.max(0, COLS - viewW));
    sky = ctx.createLinearGradient(0, 0, 0, E.H);
    const f = clamp(gy / E.H, 0.05, 0.95);
    sky.addColorStop(0, "#04060f"); sky.addColorStop(f * 0.6, "#0b0b24"); sky.addColorStop(f, "#22144a"); sky.addColorStop(Math.min(1, f + 0.05), "#0a0614"); sky.addColorStop(1, "#0a0614");
    const B = clamp(Math.min(E.W, E.H) * 0.17, 58, 92), by = E.H - 34 - B;
    btn.l = { x: 14, y: by, w: B, h: B };
    btn.r = { x: 24 + B, y: by, w: B, h: B };
    btn.j = { x: E.W - 14 - B * 1.3, y: by, w: B * 1.3, h: B };
  }
  fit();

  const overlap = (a: Body, b: Body) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const EPS = 0.001;
  /** mueve en X y resuelve contra las baldosas; devuelve -1/1 si chocó con una pared */
  function moveX(b: Body, dx: number): number {
    b.x += dx;
    const r0 = Math.floor(b.y + EPS), r1 = Math.floor(b.y + b.h - EPS);
    if (dx > 0) {
      const c = Math.floor(b.x + b.w - EPS);
      for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = c - b.w; b.vx = 0; return 1; }
    } else if (dx < 0) {
      const c = Math.floor(b.x + EPS);
      for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = c + 1; b.vx = 0; return -1; }
    }
    return 0;
  }
  /** mueve en Y; aterriza o choca de cabeza. Para el jugador, corrige esquinas y golpea bloques */
  function moveY(b: Body, dy: number, player = false) {
    b.y += dy;
    const c0 = Math.floor(b.x + EPS), c1 = Math.floor(b.x + b.w - EPS);
    if (dy > 0) {
      const r = Math.floor(b.y + b.h - EPS);
      for (let c = c0; c <= c1; c++) if (solid(c, r)) { b.y = r - b.h; b.vy = 0; b.ground = true; return; }
    } else if (dy < 0) {
      const r = Math.floor(b.y + EPS);
      const s0 = solid(c0, r), s1 = c1 !== c0 && solid(c1, r);
      if (!s0 && !s1) return;
      if (player) {
        // corrección de esquina: si apenas roza el borde, se desliza en vez de frenar
        if (s0 && !s1 && c0 + 1 - b.x < 0.28) { b.x = c0 + 1 + EPS; return; }
        if (s1 && !s0 && b.x + b.w - c1 < 0.28) { b.x = c1 - b.w - EPS; return; }
      }
      b.y = r + 1; b.vy = 0;
      if (player) {
        const cc = Math.floor(b.x + b.w / 2);
        hitBlock(solid(cc, r) ? cc : s0 ? c0 : c1, r);
      }
    }
  }

  // ── pantalla ↔ mundo ────────────────────────────────────────────────────────
  const sx = (wx: number) => Math.round(wx * TSd - camD) / S;
  const sy = (wy: number) => oy + Math.round(wy * TSd) / S;
  const pop = (x: number, y: number, txt: string, col: string) => txts.push({ x, y, txt, col, t: 1 });
  const ding = () => { E.beep(1175, 35, 0.03); setTimeout(() => E.beep(1568, 70, 0.03), 45); };

  function collectIdea(x: number, y: number) {
    got++; E.addScore(50); ding();
    if (got >= lifeAt) { lifeAt += 25; E.addLife(); E.sfx.power(); pop(x, y - 0.6, "1UP ♥", C.err); }
  }
  function hitBlock(c: number, r: number) {
    const i = idx(c, r), t = tiles[i];
    if (t === QI || t === QR) {
      tiles[i] = USED; bumps.set(i, 0.16);
      if (t === QI) { pops.push({ x: c + 0.5, y: r - 0.6, vy: -9, t: 0.55 }); collectIdea(c + 0.5, r); }
      else { items.push({ x: c + 0.1, y: r, w: 0.8, h: 0.78, vx: 0, vy: 0, ground: false, rise: 0.55, r0: r, on: true }); E.beep(520, 90, 0.04); }
    } else if (t === BRICK) {
      if (p.big) {
        tiles[i] = EMPTY; E.addScore(20); E.sfx.hit(); E.shake(3);
        E.burst(sx(c + 0.5), sy(r + 0.5), "#e8834a", 12, 260, Math.max(3, TS * 0.12));
      } else { bumps.set(i, 0.16); E.sfx.wall(); }
    } else { E.beep(180, 25, 0.03); return; }
    // lo que esté parado encima del bloque sale volando
    for (const f of foes) if (f.st === 0 && f.on && Math.abs(f.y + f.h - r) < 0.15 && f.x < c + 1 && f.x + f.w > c) kill(f, true);
    if (r > 0 && ideas[idx(c, r - 1)]) { ideas[idx(c, r - 1)] = 0; pops.push({ x: c + 0.5, y: r - 1, vy: -7, t: 0.45 }); collectIdea(c + 0.5, r - 1); }
  }
  function kill(f: Foe, flip: boolean) {
    if (flip) { f.st = 2; f.vy = -9; f.vx = f.dir * 2; }
    else { f.st = 1; f.t = 0.5; }
    combo++;
    const pts = Math.min(800, 100 * 2 ** (combo - 1));
    E.addScore(pts); pop(f.x + f.w / 2, f.y, `+${pts}`, C.br);
    E.beep(240, 40, 0.05); setTimeout(() => E.beep(160, 50, 0.04), 40);
    E.burst(sx(f.x + f.w / 2), sy(f.y + f.h / 2), f.k === BUG ? "#ff5555" : f.k === SPAG ? "#ffcc33" : "#a970ff", 8, 160, 3);
  }
  function setSize(big: boolean) {
    const bottom = p.y + p.h, cx = p.x + p.w / 2;
    p.big = big; p.w = big ? BW : SW; p.h = big ? BH : SH;
    p.x = cx - p.w / 2; p.y = bottom - p.h;
  }
  function damage() {
    if (p.inv > 0) return;
    if (p.big) {
      setSize(false); p.inv = 1.6; E.sfx.hurt(); E.shake(6);
      pop(p.x + p.w / 2, p.y - 0.3, E.t("¡deuda técnica!", "tech debt!"), C.err);
    } else die(false);
  }
  function die(inPit: boolean) {
    mode = "dead"; modeT = 0; pit = inPit;
    p.vx = 0; p.vy = inPit ? 0 : -15;
    E.hurt(); // si ya no quedan vidas, el motor muestra el game over
  }
  function respawn() {
    const c = CHECKPOINTS[cp];
    setSize(false);
    p.x = c + 0.15; p.y = G - p.h; p.vx = 0; p.vy = 0; p.inv = 1.6; p.face = 1;
    mode = "play"; coyote = 0; buffer = 0;
    for (const f of foes) if (f.st === 0) { f.x = f.c0 + 0.1; f.y = G - f.h; f.vx = f.vy = 0; f.dir = -1; f.on = false; }
    camX = clamp(p.x - viewW * 0.4, 0, Math.max(0, COLS - viewW));
  }

  // ── controles táctiles (multitouch: cada dedo se evalúa por separado) ───────
  const inR = (b: { x: number; y: number; w: number; h: number }, x: number, y: number, m: number) => x > b.x - m && x < b.x + b.w + m && y > b.y - m && y < b.y + b.h + m;
  function readTouches() {
    tLeft = tRight = tJump = false;
    if (!E.touches.size) return;
    for (const t of E.touches.values()) {
      if (t.y < 44) continue;
      if (t.x >= E.W * 0.5) { tJump = true; continue; }
      if (t.y < btn.l.y - btn.l.h * 0.9) continue;
      if (t.x < btn.l.x + btn.l.w + 5) tLeft = true;
      else if (inR(btn.r, t.x, t.y, btn.r.w * 0.9)) tRight = true;
    }
  }

  // ── actualización ───────────────────────────────────────────────────────────
  function updatePlayer(dt: number) {
    const left = E.key("arrowleft", "a") || tLeft, right = E.key("arrowright", "d") || tRight;
    const held = E.key(" ", "w", "arrowup") || tJump;
    if (tJump && !prevTouchJump) buffer = 0.13;
    prevTouchJump = tJump;
    buffer -= dt;
    coyote = p.ground ? 0.09 : coyote - dt;
    if (p.ground) combo = 0;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) {
      const turning = p.vx * dir < 0;
      const acc = p.ground ? (turning ? 70 : 40) : 26;
      p.vx = clamp(p.vx + dir * acc * dt, -MAXV, MAXV);
      p.face = dir;
    } else {
      const dec = (p.ground ? 38 : 6) * dt;
      p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
    }
    if (buffer > 0 && coyote > 0) {
      p.vy = -JV; buffer = 0; coyote = 0; p.ground = false;
      E.beep(560, 45, 0.03); setTimeout(() => E.beep(760, 40, 0.025), 30);
    }
    const g = p.vy < 0 ? (held ? GRAV_UP : GRAV_CUT) : GRAV_DOWN;
    p.vy = Math.min(MAXFALL, p.vy + g * dt);
    const prevBottom = p.y + p.h;

    // sub-pasos para no atravesar baldosas a 30 fps
    const n = Math.ceil(dt / (1 / 120)), h = dt / n;
    p.ground = false;
    for (let i = 0; i < n; i++) { moveX(p, p.vx * h); moveY(p, p.vy * h, true); }
    p.anim += Math.abs(p.vx) * dt;
    p.inv = Math.max(0, p.inv - dt);

    // ideas 💡
    for (let c = Math.floor(p.x); c <= Math.floor(p.x + p.w); c++) for (let r = Math.floor(p.y); r <= Math.floor(p.y + p.h); r++) {
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || !ideas[idx(c, r)]) continue;
      if (p.x < c + 0.85 && p.x + p.w > c + 0.15 && p.y < r + 0.9 && p.y + p.h > r + 0.1) {
        ideas[idx(c, r)] = 0; collectIdea(c + 0.5, r);
        E.burst(sx(c + 0.5), sy(r + 0.5), "#ffe14d", 6, 120, 2.5);
      }
    }
    // enemigos: pisarlos desde arriba o recibir daño
    for (const f of foes) {
      if (f.st !== 0 || !f.on || !overlap(p, f)) continue;
      if (p.vy > 0 && prevBottom <= f.y + 0.4) {
        kill(f, false);
        p.vy = held ? -17 : -11; p.y = f.y - p.h;
      } else damage();
      if (mode !== "play") return;
    }
    // power-up REFACTOR
    for (const it of items) {
      if (!it.on || it.rise > 0 || !overlap(p, it)) continue;
      it.on = false; E.sfx.power(); E.addScore(1000);
      if (!p.big) setSize(true);
      pop(p.x + p.w / 2, p.y - 0.2, "REFACTOR! +1000", C.cyan);
      E.burst(sx(p.x + p.w / 2), sy(p.y + p.h / 2), C.cyan, 16, 200, 3);
    }
    // checkpoints (commits) y zonas
    for (let i = cp + 1; i < CHECKPOINTS.length; i++) if (p.x > CHECKPOINTS[i]) {
      cp = i; E.beep(880, 40, 0.03);
      pop(CHECKPOINTS[i] + 0.5, G - 2.4, "✓ git commit", C.acc);
    }
    const z = zoneOf(Math.floor(p.x + p.w / 2));
    if (z > zone) { zone = z; toastT = 2.4; }
    best = Math.max(best, p.x);

    if (p.y > ROWS + 0.5) { die(true); return; }
    if (p.x + p.w >= FLAG + 0.4) {
      // ¡release! bono según la altura a la que se agarró el mástil
      mode = "flag"; phase = 0; modeT = 0;
      p.x = FLAG + 0.4 - p.w; p.vx = 0; p.vy = 0; p.face = 1;
      const hgt = clamp((G - (p.y + p.h)) / 9, 0, 1);
      const bonus = Math.max(100, Math.round((hgt * 2000) / 100) * 100);
      E.addScore(bonus); pop(FLAG, Math.max(3, p.y - 0.4), `+${bonus}`, C.warn);
      E.sfx.power();
    }
  }

  function updateFlag(dt: number) {
    modeT += dt;
    if (phase === 0) {
      // desliza por el mástil junto con la bandera
      p.y = Math.min(G - p.h, p.y + 9 * dt);
      flagY = Math.min(G - 1.6, flagY + 9 * dt);
      if (p.y >= G - p.h && flagY >= G - 1.6) { phase = 1; modeT = 0; }
    } else if (phase === 1) {
      if (modeT > 0.35) { phase = 2; modeT = 0; p.x = FLAG + 0.6; }
    } else if (phase === 2) {
      p.vx = 4.5; p.x += p.vx * dt; p.anim += p.vx * dt;
      if (p.x >= DOOR) { phase = 3; modeT = 0; fireT = 0; pop(DOOR + 0.5, G - 6.5, "🚀 release v1.0", C.warn); }
    } else {
      fireT -= dt;
      if (fireT <= 0) {
        fireT = 0.28;
        const cols = [C.pink, C.cyan, C.warn, C.acc];
        E.burst(sx(DOOR + rand(-3, 4)), sy(rand(2.5, 6)), cols[Math.floor(Math.random() * 4)], 22, 260, 3);
        E.beep(rand(500, 900), 50, 0.03);
      }
      if (modeT > 1.6 && !cleared) { cleared = true; E.clear(); }
    }
  }

  function updateFoes(dt: number) {
    const edge = camX + viewW + 1.5;
    for (const f of foes) {
      if (f.st === 3) continue;
      if (!f.on) { if (f.x < edge) f.on = true; else continue; }
      if (f.st === 1) { f.t -= dt; if (f.t <= 0) f.st = 3; continue; }
      if (f.st === 2) { f.vy += 45 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > ROWS + 2) f.st = 3; continue; }
      const sp = f.k === BUG ? 1.5 : f.k === SPAG ? 2.3 : 1.1;
      f.vx = f.dir * sp;
      f.vy = Math.min(18, f.vy + 45 * dt);
      if (f.k === BLOB) { f.hop -= dt; if (f.ground && f.hop <= 0) { f.vy = -11; f.hop = 1.5; } }
      f.ground = false;
      if (moveX(f, f.vx * dt)) f.dir *= -1;
      moveY(f, f.vy * dt);
      // el espagueti no se cae de las plataformas: da la vuelta al borde
      if (f.k === SPAG && f.ground) {
        const fc = Math.floor(f.dir > 0 ? f.x + f.w + 0.05 : f.x - 0.05);
        if (!solid(fc, Math.floor(f.y + f.h + 0.05))) f.dir *= -1;
      }
      if (f.y > ROWS + 1) f.st = 3;
    }
    // choque entre enemigos: ambos dan la vuelta
    for (let i = 0; i < foes.length; i++) {
      const a = foes[i];
      if (a.st !== 0 || !a.on) continue;
      for (let j = i + 1; j < foes.length; j++) {
        const b = foes[j];
        if (b.st !== 0 || !b.on || !overlap(a, b)) continue;
        if ((a.x < b.x && a.dir > 0) || (a.x > b.x && a.dir < 0)) a.dir *= -1;
        if ((b.x < a.x && b.dir > 0) || (b.x > a.x && b.dir < 0)) b.dir *= -1;
      }
    }
  }

  function updateItems(dt: number) {
    for (const it of items) {
      if (!it.on) continue;
      if (it.rise > 0) {
        it.rise -= dt; it.y = it.r0 - (1 - Math.max(0, it.rise) / 0.55);
        if (it.rise <= 0) { it.y = it.r0 - 1 - EPS; it.vx = 2.6; }
        continue;
      }
      it.vy = Math.min(18, it.vy + 45 * dt);
      it.ground = false;
      const hw = moveX(it, it.vx * dt);
      if (hw) it.vx = -hw * 2.6;
      moveY(it, it.vy * dt);
      if (it.y > ROWS + 1) it.on = false;
    }
  }

  // ── dibujo ──────────────────────────────────────────────────────────────────
  function layer(img: HTMLCanvasElement, px: number, factor: number, bottom: number, alpha = 1) {
    const P = Math.max(1, Math.round(px * S)) / S;
    const w = img.width * P, h = img.height * P;
    let x0 = -((camX * TS * factor) % w);
    if (x0 > 0) x0 -= w;
    ctx.globalAlpha = alpha;
    for (let x = x0; x < E.W; x += w) ctx.drawImage(img, Math.round(x * S) / S, bottom - h, w, h);
    ctx.globalAlpha = 1;
  }
  function onion() {
    // el diagrama de cebolla de Clean Architecture, tenue en el cielo; se ilumina la capa actual
    const prog = clamp(best / FLAG, 0, 1);
    const R = Math.min(E.H * 0.36, E.W * 0.42);
    const cx = E.W * (0.8 - prog * 0.45), cy = gy - TS * 1.5;
    ctx.lineWidth = Math.max(2, TS * 0.1);
    ctx.font = E.font(Math.max(10, TS * 0.26), true); ctx.textAlign = "center";
    for (let i = 0; i < 4; i++) {
      const r = R * (1 - i * 0.24), z = ZONES[i];
      const on = i === zone;
      ctx.strokeStyle = z.top; ctx.globalAlpha = on ? 0.42 : 0.13;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = on ? 0.6 : 0.22; ctx.fillStyle = z.top;
      ctx.fillText(E.t(z.es, z.en), cx, cy - r + TS * 0.42);
    }
    ctx.globalAlpha = 0.07; ctx.fillStyle = ZONES[3].top;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawSign(s: Sign) {
    const fs = Math.max(10, TS * (s.big ? 0.3 : 0.27));
    ctx.font = E.font(fs, true);
    const lines = s.lines.map((l) => E.t(l[0], l[1]));
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 1.4;
    const lh = fs * 1.35, h = lines.length * lh + fs * 0.6;
    const x = sx(s.c), bottom = gy - TS * 0.85, y = bottom - h;
    if (x > E.W || x + w < 0) return;
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(x + w * 0.18, bottom, Math.max(2, TS * 0.1), gy - bottom);
    ctx.fillRect(x + w * 0.78, bottom, Math.max(2, TS * 0.1), gy - bottom);
    ctx.fillStyle = "rgba(8,10,24,0.88)"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = ZONES[s.z].top; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      ctx.fillStyle = i === 0 && s.big ? ZONES[s.z].top : "#e6e6f0";
      ctx.fillText(l, x + fs * 0.7, y + fs * 0.3 + lh * (i + 0.5));
    });
    ctx.textBaseline = "alphabetic";
  }
  function drawFlagAndCore() {
    // mástil del release
    const px = sx(FLAG + 0.5);
    if (px > -TS * 3 && px < E.W + TS) {
      ctx.fillStyle = "#cfd8e6"; ctx.fillRect(px - TS * 0.06, sy(G - 9), Math.max(2, TS * 0.12), G * TS - (G - 9) * TS);
      E.glow(C.acc, 12); ctx.fillStyle = C.acc;
      ctx.beginPath(); ctx.arc(px, sy(G - 9), TS * 0.2, 0, Math.PI * 2); ctx.fill(); E.glow(null);
      const fy = sy(flagY);
      ctx.fillStyle = C.acc;
      ctx.beginPath(); ctx.moveTo(px, fy); ctx.lineTo(px - TS * 1.6, fy + TS * 0.45); ctx.lineTo(px, fy + TS * 0.9); ctx.fill();
      ctx.fillStyle = "#04060f"; ctx.font = E.font(Math.max(9, TS * 0.26), true); ctx.textAlign = "center";
      ctx.fillText("v1.0", px - TS * 0.55, fy + TS * 0.55);
    }
    // el núcleo de Dominio: castillo de piedra con la cebolla de capas encima
    const cx = sx(CASTLE);
    if (cx > E.W || cx + TS * 5 < 0) return;
    const ccx = sx(CASTLE + 2.5), cby = sy(G - 4);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ZONES[i].top; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(ccx, cby, TS * (2.4 - i * 0.55), Math.PI, 0); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let c = 0; c < 5; c++) {
      for (let r = G - 4; r < G; r++) ctx.drawImage(stone, sx(CASTLE + c), sy(r), TS, TS);
      if (c % 2 === 0) ctx.drawImage(stone, sx(CASTLE + c), sy(G - 4.5), TS, TS * 0.5);
    }
    ctx.fillStyle = "#04060f";
    ctx.fillRect(sx(CASTLE + 2) + TS * 0.1, sy(G - 2), TS * 0.8, TS * 2);
    ctx.beginPath(); ctx.arc(sx(CASTLE + 2.5), sy(G - 2), TS * 0.4, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#04060f"; ctx.font = E.font(Math.max(9, TS * 0.3), true); ctx.textAlign = "center";
    ctx.fillText(E.t("DOMINIO", "DOMAIN"), ccx, sy(G - 4) + TS * 0.62);
  }
  function drawTouch() {
    const b = (r: { x: number; y: number; w: number; h: number }, on: boolean) => {
      ctx.fillStyle = on ? "rgba(255,255,255,0.28)" : "rgba(10,12,28,0.45)";
      ctx.strokeStyle = on ? C.acc : "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke();
    };
    b(btn.l, tLeft); b(btn.r, tRight); b(btn.j, tJump);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const tri = (r: { x: number; y: number; w: number; h: number }, d: number) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, s = r.w * 0.2;
      ctx.beginPath(); ctx.moveTo(cx + d * s, cy); ctx.lineTo(cx - d * s, cy - s); ctx.lineTo(cx - d * s, cy + s); ctx.fill();
    };
    tri(btn.l, -1); tri(btn.r, 1);
    ctx.font = E.font(Math.min(18, btn.j.h * 0.24), true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(E.t("SALTA", "JUMP"), btn.j.x + btn.j.w / 2, btn.j.y + btn.j.h / 2);
    ctx.textBaseline = "alphabetic";
  }

  // atajo solo en desarrollo para probar el nivel (teletransporte / estado)
  if (import.meta.env.DEV) (window as unknown as { __plat: object }).__plat = {
    p, foes, get mode() { return mode; }, get cleared() { return cleared; }, get got() { return got; },
    tp: (x: number, y = G - 3) => { mode = "play"; p.inv = 2; p.x = x; p.y = y; p.vx = p.vy = 0; best = Math.max(best, x); camX = clamp(x - viewW * 0.4, 0, COLS - viewW); },
  };

  return {
    resize: fit,
    objective() {
      const pct = Math.round(clamp(best / FLAG, 0, 1) * 100);
      return E.W < 520
        ? `🎯 release v1.0 · 💡 ${got} · ${pct}%`
        : E.t(`🎯 Llega al release v1.0 · 💡 ${got} · ${pct}%`, `🎯 Reach release v1.0 · 💡 ${got} · ${pct}%`);
    },
    key(k, repeat) {
      if (!repeat && (k === " " || k === "w" || k === "arrowup")) buffer = 0.13;
    },
    update(dt) {
      readTouches();
      if (mode === "play") updatePlayer(dt);
      else if (mode === "flag") updateFlag(dt);
      else {
        modeT += dt;
        if (!pit) { p.vy += 45 * dt; p.y += p.vy * dt; }
        if (modeT > (pit ? 0.7 : 1.3)) respawn();
      }
      if (mode !== "dead") { updateFoes(dt); updateItems(dt); }
      for (const [k, v] of bumps) { if (v - dt <= 0) bumps.delete(k); else bumps.set(k, v - dt); }
      for (const q of pops) { q.t -= dt; q.vy += 30 * dt; q.y += q.vy * dt; }
      E.filter(pops, (q) => q.t > 0);
      for (const q of txts) { q.t -= dt * 0.9; q.y -= dt * 1.4; }
      E.filter(txts, (q) => q.t > 0);
      toastT = Math.max(0, toastT - dt);
      if (mode !== "dead") {
        const target = clamp(p.x + p.w / 2 - viewW * 0.4, 0, Math.max(0, COLS - viewW));
        camX += (target - camX) * Math.min(1, dt * 7);
      }
    },
    draw() {
      const W = E.W, H = E.H;
      camD = Math.round(camX * TSd);
      ctx.fillStyle = sky ?? "#04060f"; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      layer(far, TS / 10, 0.06, gy, 0.7);
      onion();
      layer(hills, TS / 8, 0.18, gy + TS * 0.2);
      layer(city, TS / 8, 0.38, gy + TS * 0.1, 0.85);

      for (const s of LV.signs) drawSign(s);
      // checkpoints (commits)
      for (let i = 1; i < CHECKPOINTS.length; i++) {
        const x = sx(CHECKPOINTS[i] + 0.5);
        if (x < -TS * 2 || x > W + TS) continue;
        const ok = cp >= i;
        ctx.fillStyle = "#9aa3b5"; ctx.fillRect(x - 1, sy(G - 2.2), Math.max(2, TS * 0.08), TS * 2.2);
        ctx.fillStyle = ok ? C.acc : "#5a6275";
        ctx.fillRect(x, sy(G - 2.2), TS * 0.6, TS * 0.4);
        ctx.font = E.font(Math.max(9, TS * 0.22), true); ctx.textAlign = "left";
        ctx.fillStyle = ok ? C.acc : "rgba(255,255,255,0.45)";
        ctx.fillText(ok ? "✓ commit" : "commit", x + TS * 0.1, sy(G - 2.4));
      }
      drawFlagAndCore();

      // baldosas visibles (las filas bajo el mapa continúan el subsuelo)
      const c0 = Math.max(0, Math.floor(camX) - 1), c1 = Math.min(COLS - 1, Math.ceil(camX + viewW));
      const rowsVis = Math.ceil((H - oy) / TS);
      const qf = qFrames[Math.floor(E.time * 4) % 3 === 2 ? 2 : Math.floor(E.time * 4) % 3];
      for (let c = c0; c <= c1; c++) {
        const x = (c * TSd - camD) / S, z = zoneOf(c);
        for (let r = 0; r < rowsVis; r++) {
          let img: HTMLCanvasElement | null;
          let dy = 0;
          if (r >= ROWS) {
            const bt = tiles[idx(c, ROWS - 1)];
            img = bt === GROUND ? gFill[z] : bt === STONE ? stone : null;
          } else {
            const i = idx(c, r), t = tiles[i];
            if (t === EMPTY) continue;
            img = t === GROUND ? (r === 0 || tiles[i - COLS] !== GROUND ? gTop[z] : gFill[z]) : t === QI || t === QR ? qf : TILE_IMG[t];
            const bt = bumps.get(i);
            if (bt !== undefined) dy = -Math.sin((1 - bt / 0.16) * Math.PI) * TS * 0.3;
          }
          if (img) ctx.drawImage(img, x, oy + (r * TSd) / S + dy, TS, TS);
        }
      }
      // etiquetas de las tuberías de datos
      ctx.font = E.font(Math.max(9, TS * 0.24), true); ctx.textAlign = "center";
      for (const pl of LV.pipes) {
        const x = sx(pl.c + 1);
        if (x < -TS * 2 || x > W + TS * 2) continue;
        ctx.fillStyle = "rgba(6,46,42,0.85)";
        ctx.fillText(pl.txt, x, sy(G - pl.h + 1) + TS * 0.62);
      }
      // ideas 💡 (giran como monedas)
      const px = TS / 16;
      for (let c = c0; c <= c1; c++) for (let r = 0; r < ROWS; r++) {
        if (!ideas[idx(c, r)]) continue;
        const sc = Math.max(0.18, Math.abs(Math.cos(E.time * 3 + c * 0.5)));
        const w = 8 * px * sc;
        ctx.drawImage(bulb, sx(c + 0.5) - w / 2, sy(r) + TS * 0.18 + Math.sin(E.time * 4 + c) * TS * 0.04, w, 10 * px);
      }
      for (const q of pops) {
        ctx.globalAlpha = clamp(q.t * 3, 0, 1);
        ctx.drawImage(bulb, sx(q.x) - 4 * px, sy(q.y), 8 * px, 10 * px);
      }
      ctx.globalAlpha = 1;
      // power-ups
      for (const it of items) {
        if (!it.on) continue;
        ctx.drawImage(chip, sx(it.x - 0.05), sy(it.y + 0.1) + (it.rise > 0 ? 0 : Math.sin(E.time * 8) * TS * 0.03), 9 * px, 8.1 * px);
      }
      // enemigos
      for (const f of foes) {
        if (f.st === 3 || !f.on) continue;
        const x = sx(f.x + f.w / 2), bot = sy(f.y + f.h);
        if (x < -TS || x > W + TS) continue;
        const fr = Math.floor(E.time * (f.k === SPAG ? 7 : 5) + f.c0) % 2;
        const img = f.k === BUG ? bugF[fr] : f.k === SPAG ? spagF[fr] : blobF[fr];
        const w = img.width * px, h = img.height * px;
        if (f.st === 1) ctx.drawImage(img, x - w / 2, bot - h * 0.35, w, h * 0.35);
        else if (f.st === 2) {
          ctx.save(); ctx.translate(x, bot - h / 2); ctx.scale(1, -1); ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
        } else {
          const sq = f.k === BLOB ? 1 + Math.min(0.15, Math.abs(f.vy) * 0.01) : 1;
          ctx.drawImage(img, x - w / 2, bot - h * sq, w, h * sq);
        }
      }
      // el dev
      const hide = mode === "flag" && phase === 3;
      const blink = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
      if (!hide && !blink) {
        const scale = p.big ? 1.5 : 1;
        let fr = 0;
        if (mode === "dead" || (!p.ground && mode === "play")) fr = 3;
        else if (Math.abs(p.vx) > 0.4) fr = 1 + (Math.floor(p.anim * 2.4) % 2);
        const img = dev[p.face < 0 ? 1 : 0][fr];
        const w = 12 * px * scale, h = 16 * px * scale;
        const x = sx(p.x + p.w / 2) - w / 2, y = sy(p.y + p.h) - h;
        if (mode === "dead" && !pit) {
          ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(1, -1); ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
        } else ctx.drawImage(img, x, y, w, h);
      }
      ctx.imageSmoothingEnabled = true;

      // textos flotantes
      ctx.textAlign = "center"; ctx.font = E.font(Math.max(11, TS * 0.34), true);
      for (const q of txts) {
        ctx.globalAlpha = clamp(q.t * 2, 0, 1); ctx.fillStyle = q.col;
        ctx.fillText(q.txt, sx(q.x), sy(q.y));
      }
      ctx.globalAlpha = 1;
      // cartel de zona al entrar a una capa
      if (toastT > 0) {
        const z = ZONES[zone];
        ctx.globalAlpha = clamp(toastT * 2, 0, 1);
        const y = 84 + Math.min(1, (2.6 - toastT) * 4) * 12;
        ctx.font = E.font(Math.min(22, W / 20), true); ctx.fillStyle = z.top; ctx.textAlign = "center";
        ctx.fillText(`${E.t("CAPA", "LAYER")} ${zone + 1}/4 · ${E.t(z.es, z.en)}`, W / 2, y + 18);
        ctx.font = E.font(Math.min(14, W / 30)); ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(E.t(z.sub[0], z.sub[1]), W / 2, y + 40);
        ctx.globalAlpha = 1;
      }
      if (E.coarse) drawTouch();
    },
  };
}
