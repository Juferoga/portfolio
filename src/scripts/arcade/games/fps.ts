// 2026 · KERNEL PANIC — shooter en primera persona (raycaster con muros texturizados).
// Maestría en IA: laboratorio de GPUs, sala de tesis (difusión + esteganografía), biblioteca MCIC,
// cuarto de servidores y rincón GLUD. Tres armas, disparos a la cabeza y un jefe tras el firewall.
import { clamp, rand, TAU, type Engine, type GameMeta, type Scene } from "../engine";

export const meta: GameMeta = {
  name: { es: "KERNEL PANIC", en: "KERNEL PANIC" },
  story: {
    es: "Maestría en IA, tesis de esteganografía sobre modelos de difusión y agentes que revisan su propio paper… hasta que el laboratorio hace kernel panic.",
    en: "Master's in AI, a thesis on steganography over diffusion models and agents reviewing their own paper… until the lab hits a kernel panic.",
  },
  goal: {
    es: "Elimina los 11 bugs del campus para abrir el FIREWALL y derrota a KERNEL PANIC (12/12).",
    en: "Wipe the 11 bugs on campus to open the FIREWALL, then defeat KERNEL PANIC (12/12).",
  },
  tip: {
    es: "Apunta a la cabeza: muerte instantánea (×2 al jefe) · busca la escopeta y el rifle · pierdes ♥ cuando tu integridad llega a 0",
    en: "Aim for the head: instant kill (×2 on the boss) · find the shotgun and the rifle · you lose ♥ when your integrity hits 0",
  },
  ctrl: {
    desktop: {
      es: "WASD moverse · ratón apuntar (clic lo captura) o ←/→ · clic/espacio disparar · 1/2/3 o rueda: arma",
      en: "WASD move · mouse aim (click to capture) or ←/→ · click/space shoot · 1/2/3 or wheel: weapon",
    },
    touch: {
      es: "joystick a la izquierda · arrastra a la derecha para mirar · toca para disparar · ⇄ cambia arma",
      en: "joystick on the left · drag on the right to look · tap to shoot · ⇄ switches weapon",
    },
  },
};

// Mapa 32×22. Muros por zona: # pasillo · G GPUs · N tesis · S servidores · L biblioteca · U GLUD
// K kernel · X firewall (se abre al limpiar los bugs). Entidades: P jugador · e bug · f crawler · B jefe
// a munición · h salud · 2 escopeta · 3 rifle. Decoración: p planta · l lámpara · c terminal · t tux
// b libros · m monitor de ruido.
const MAP = [
  "GGGGGGGGGGGNNNNNNNNNNKKKKKKKKKKK",
  "G2..l...e.G....m....aKa.......hK",
  "G.........G.f..NN....K.........K",
  "G.GGG.GGG....N....N..K..K...K..K",
  "G....c....G..N..e.N..K.........K",
  "G.GGG.GGG.G.........pK.........K",
  "G....f....G........e.K.........K",
  "G........aGh........lK.........K",
  "UGG.GGG.GGGNNN.NNN.NNK.........K",
  "Ut.............f.....K.........K",
  "U...P....##..........X....B....K",
  "U........##....#.....X.........K",
  "Uh........a..........K.........K",
  "ULLL.LLL.LLSS.SSS.SSSK.........K",
  "La...e....La.......e.K.........K",
  "L.........L..S...S...K.........K",
  "L.LLL.LLL.L..S...S...K..K...K..K",
  "L..............e.....K.........K",
  "L.LLL.LLL.L..S...S...K.........K",
  "L....b....L.fS...S...K.........K",
  "Lp......fhLc........3Kh.......aK",
  "LLLLLLLLLLLSSSSSSSSSSKKKKKKKKKKK",
];

const WALLS = "#GNSLUKX";
const DECOR = "plctbm";

type Kind = "bug" | "crawler" | "boss";
interface Mob {
  kind: Kind; x: number; y: number; hp: number; max: number;
  cool: number; flash: number; t: number; dead: number; seen: boolean; alert: boolean;
  react: number; melee: number; strafe: number; charge: number;
}
interface Orb { x: number; y: number; vx: number; vy: number; big: boolean; life: number }
interface Pick { x: number; y: number; type: "a" | "h" | "2" | "3"; taken: boolean; t: number }
interface Decor { x: number; y: number; type: string }
interface Gib { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: string; s: number }
interface Pop { text: string; x: number; y: number; t: number; color: string; size: number }
interface Weapon {
  key: string; name: string; dmg: number; pellets: number; spread: number; cool: number;
  auto: boolean; ammo: number; max: number; color: string;
}

export function create(E: Engine): Scene {
  const ctx = E.ctx, C = E.C;
  const grid = MAP.map((r) => r.split(""));
  const MH = grid.length, MW = grid[0].length;
  const isWall = (c: string | undefined) => c === undefined || WALLS.includes(c);
  const wallAt = (x: number, y: number) => isWall(grid[Math.floor(y)]?.[Math.floor(x)]);

  // ── entidades del mapa ────────────────────────────────────────────────────
  const pl = { x: 1.5, y: 1.5, a: 0, pitch: 0, bob: 0, kick: 0, muzzle: 0, hp: 100, iframe: 0, swap: 0, spin: 0 };
  const mobs: Mob[] = [], orbs: Orb[] = [], picks: Pick[] = [], decor: Decor[] = [], gibs: Gib[] = [], pops: Pop[] = [];
  const decorCell = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = grid[y][x];
    if (c === "P") { pl.x = x + 0.5; pl.y = y + 0.5; grid[y][x] = "."; }
    else if (c === "e" || c === "f" || c === "B") {
      const kind: Kind = c === "e" ? "bug" : c === "f" ? "crawler" : "boss";
      const hp = kind === "bug" ? 36 : kind === "crawler" ? 22 : 360;
      mobs.push({ kind, x: x + 0.5, y: y + 0.5, hp, max: hp, cool: rand(1.2, 2.4), flash: 0, t: rand(0, 10), dead: 0, seen: false, alert: false, react: 0, melee: 0, strafe: Math.random() < 0.5 ? -1 : 1, charge: 0 });
      grid[y][x] = ".";
    } else if (c === "a" || c === "h" || c === "2" || c === "3") {
      picks.push({ x: x + 0.5, y: y + 0.5, type: c, taken: false, t: rand(0, 6) }); grid[y][x] = ".";
    } else if (DECOR.includes(c)) {
      decor.push({ x: x + 0.5, y: y + 0.5, type: c }); decorCell[y * MW + x] = 1; grid[y][x] = ".";
    }
  }
  const total = mobs.length;
  const boss = mobs.find((m) => m.kind === "boss")!;
  let doorOpen = false, won = 0, cleared = false;

  // ── armas ─────────────────────────────────────────────────────────────────
  const WEAPONS: Weapon[] = [
    { key: "1", name: ">_ blaster", dmg: 12, pellets: 1, spread: 0, cool: 0.32, auto: false, ammo: Infinity, max: Infinity, color: C.acc },
    { key: "2", name: "sudo rm -rf", dmg: 9, pellets: 7, spread: 0.07, cool: 0.78, auto: false, ammo: 0, max: 30, color: C.warn },
    { key: "3", name: E.t("clúster GPU", "GPU cluster"), dmg: 7, pellets: 1, spread: 0.018, cool: 0.085, auto: true, ammo: 0, max: 180, color: C.cyan },
  ];
  const owned = [true, false, false];
  let wi = 0, wcool = 0, wantShot = false, mouseHeld = false, touchFire = -1, emptyT = 0;

  // ── cámara / proyección ───────────────────────────────────────────────────
  let fov = 0.66, proj = 600, colW = 2, cols = 1;
  let zbuf = new Float32Array(1);
  let sky: HTMLCanvasElement | null = null;
  let mini: HTMLCanvasElement | null = null;
  let ms = 5;

  const mk = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d")!); return c;
  };

  // ── texturas de muro (128×128, pre-renderizadas, estilo neón) ─────────────
  const TS = 128;
  const frame = (g: CanvasRenderingContext2D, col: string, tint = 0.12) => {
    g.fillStyle = "#04060a"; g.fillRect(0, 0, TS, TS);
    g.globalAlpha = tint; g.fillStyle = col; g.fillRect(0, 0, TS, TS); g.globalAlpha = 1;
  };
  const edges = (g: CanvasRenderingContext2D, col: string) => {
    g.fillStyle = col; g.globalAlpha = 1;
    g.fillRect(0, 0, TS, 3); g.fillRect(0, TS - 3, TS, 3);
    g.globalAlpha = 0.9; g.fillRect(0, 0, 2, TS); g.fillRect(TS - 2, 0, 2, TS); g.globalAlpha = 1;
  };
  const label = (g: CanvasRenderingContext2D, txt: string, x: number, y: number, px: number, col: string, bold = true) => {
    g.font = E.font(px, bold); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(txt, x, y);
  };
  const T = {
    hall: [0, 1].map((v) => mk(TS, TS, (g) => {
      frame(g, C.fg, 0.1);
      g.strokeStyle = C.fg; g.globalAlpha = 0.35; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        let x = rand(12, 116), y = rand(12, 116);
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 3; k++) { if (k % 2) x = clamp(x + rand(-40, 40), 8, 120); else y = clamp(y + rand(-40, 40), 8, 120); g.lineTo(x, y); }
        g.stroke(); g.fillStyle = C.fg; g.fillRect(x - 3, y - 3, 6, 6);
      }
      g.globalAlpha = 0.5; g.fillStyle = C.fg; g.fillRect(0, 63, TS, 2);
      if (v) label(g, "MCIC", 64, 96, 14, C.fg);
      g.globalAlpha = 1; edges(g, C.fg);
    })),
    gpu: [0, 1].map((f) => mk(TS, TS, (g) => {
      frame(g, C.warn, 0.08);
      for (let r = 0; r < 4; r++) {
        const y = 10 + r * 28;
        g.fillStyle = "#0b0904"; g.fillRect(8, y, 112, 22);
        g.strokeStyle = C.warn; g.globalAlpha = 0.7; g.lineWidth = 1.5; g.strokeRect(8, y, 112, 22); g.globalAlpha = 1;
        for (const fx of [26, 56]) {
          g.strokeStyle = C.warn; g.globalAlpha = 0.55; g.beginPath(); g.arc(fx, y + 11, 8, 0, TAU); g.stroke();
          for (let b = 0; b < 4; b++) { const a = b * (TAU / 4) + f * 0.6 + r; g.beginPath(); g.moveTo(fx, y + 11); g.lineTo(fx + Math.cos(a) * 7, y + 11 + Math.sin(a) * 7); g.stroke(); }
        }
        g.globalAlpha = 0.85; label(g, r % 2 ? "A100" : "H100", 88, y + 11, 9, C.warn);
        for (let k = 0; k < 3; k++) { g.fillStyle = (k + r + f) % 3 ? C.acc : C.err; g.globalAlpha = 1; g.fillRect(108, y + 4 + k * 6, 4, 3); }
      }
      g.globalAlpha = 1; edges(g, C.warn);
    })),
    thesis: [0, 1, 2].map((v) => mk(TS, TS, (g) => {
      frame(g, C.cyan, 0.08);
      g.fillStyle = "#000"; g.fillRect(10, 12, 108, 70);
      // de ruido puro (x_T) a imagen limpia (x_0): la difusión inversa
      for (let i = 0; i < 27; i++) for (let j = 0; j < 17; j++) {
        const k = i / 26, cx = 10 + i * 4, cy = 12 + j * 4;
        const tr = 120 + 100 * Math.sin(j / 5 + 1), tg = 60 + 80 * (j / 17), tb = 160 + 60 * Math.cos(i / 8);
        const n = Math.random() * 255;
        const mix = (a: number) => Math.round(a * k + n * (1 - k));
        g.fillStyle = `rgb(${mix(tr)},${mix(tg)},${mix(tb)})`; g.fillRect(cx, cy, 4, 4);
      }
      g.strokeStyle = C.cyan; g.lineWidth = 2; g.strokeRect(10, 12, 108, 70);
      const txt = [["x_T → x₀", "DDIM"], ["stego ∅ cover", "IFE ✔"], ["RSA-2048", "100% ✔"]][v];
      label(g, txt[0], 64, 96, 12, C.cyan); label(g, txt[1], 64, 112, 10, C.pink);
      edges(g, C.cyan);
    })),
    server: [0, 1].map((f) => mk(TS, TS, (g) => {
      frame(g, C.cyan, 0.06);
      for (let r = 0; r < 8; r++) {
        const y = 8 + r * 14;
        g.fillStyle = "#070b10"; g.fillRect(10, y, 108, 11);
        g.strokeStyle = C.cyan; g.globalAlpha = 0.4; g.lineWidth = 1; g.strokeRect(10, y, 108, 11);
        for (let k = 0; k < 8; k++) g.fillRect(18 + k * 6, y + 3, 3, 5);
        g.globalAlpha = 1;
        for (let k = 0; k < 4; k++) { g.fillStyle = (k * 3 + r * 5 + f) % 4 ? C.acc : C.warn; g.fillRect(84 + k * 7, y + 4, 4, 3); }
      }
      g.globalAlpha = 1; edges(g, C.cyan);
    })),
    lib: [0, 1, 2, 3].map((v) => mk(TS, TS, (g) => {
      frame(g, C.violet, 0.08);
      const plate = [E.t("PARALELA", "PARALLEL"), E.t("INT. NEGOCIOS", "BUS. INTEL."), E.t("INT. COMPUT.", "COMP. INTEL."), "MCIC 16/44"][v];
      g.fillStyle = "#000"; g.fillRect(14, 6, 100, 16); label(g, plate, 64, 14, 10, C.violet);
      const cols = [C.violet, C.pink, C.cyan, C.warn, C.fg, "#8a7cff", "#c06"];
      for (let s = 0; s < 3; s++) {
        const base = 56 + s * 34;
        g.fillStyle = C.violet; g.globalAlpha = 0.7; g.fillRect(4, base, 120, 3); g.globalAlpha = 1;
        let x = 8;
        while (x < 118) {
          const w = rand(5, 10), h = rand(18, 30);
          g.globalAlpha = rand(0.35, 0.75); g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          g.fillRect(x, base - h, Math.min(w, 120 - x), h);
          g.globalAlpha = 0.5; g.fillStyle = "#000"; g.fillRect(x + 1, base - h + 4, Math.min(w, 120 - x) - 2, 2);
          x += w + 1;
        }
        g.globalAlpha = 1;
      }
      edges(g, C.violet);
    })),
    glud: [0, 1].map((v) => mk(TS, TS, (g) => {
      frame(g, C.acc, 0.1);
      g.fillStyle = "#000"; g.fillRect(12, 12, 104, 104);
      g.strokeStyle = C.acc; g.lineWidth = 2; g.strokeRect(12, 12, 104, 104);
      if (v === 0) {
        label(g, "GLUD", 64, 34, 26, C.acc);
        // tux mínimo
        g.fillStyle = "#e8e8e8"; g.beginPath(); g.ellipse(64, 82, 14, 18, 0, 0, TAU); g.fill();
        g.fillStyle = "#111"; g.beginPath(); g.ellipse(64, 70, 11, 10, 0, 0, TAU); g.fill();
        g.fillStyle = "#fff"; g.fillRect(59, 66, 4, 4); g.fillRect(66, 66, 4, 4);
        g.fillStyle = C.warn; g.beginPath(); g.moveTo(60, 73); g.lineTo(68, 73); g.lineTo(64, 78); g.fill();
        g.fillRect(52, 98, 9, 4); g.fillRect(67, 98, 9, 4);
      } else {
        label(g, "map-ia", 64, 32, 16, C.acc);
        label(g, "ai-context-", 64, 56, 11, C.br, false); label(g, "extractor", 64, 70, 11, C.br, false);
        label(g, E.t("software libre", "free software"), 64, 96, 10, C.acc, false);
      }
      edges(g, C.acc);
    })),
    kern: [0, 1, 2].map((v) => mk(TS, TS, (g) => {
      frame(g, C.err, 0.1);
      g.save(); g.beginPath(); g.rect(0, 100, TS, 18); g.clip();
      for (let i = -2; i < 12; i++) { g.fillStyle = i % 2 ? "#2a0606" : C.err; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(i * 14, 118); g.lineTo(i * 14 + 14, 100); g.lineTo(i * 14 + 28, 100); g.lineTo(i * 14 + 14, 118); g.fill(); }
      g.restore(); g.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { g.fillStyle = Math.random() < 0.5 ? C.pink : C.cyan; g.globalAlpha = 0.25; g.fillRect(rand(0, 80), rand(8, 96), rand(20, 60), 2); }
      g.globalAlpha = 1;
      label(g, ["PANIC", "0xDEAD", "panic()"][v], 64, 52, v === 1 ? 20 : 22, C.err);
      label(g, ["not syncing", "BEEF", "core dumped"][v], 64, 76, 10, C.pink, false);
      edges(g, C.err);
    })),
    fw: [mk(TS, TS, (g) => {
      g.fillStyle = "#1a0306"; g.fillRect(0, 0, TS, TS);
      g.strokeStyle = C.err; g.globalAlpha = 0.45; g.lineWidth = 1;
      for (let i = 0; i <= TS; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, TS); g.moveTo(0, i); g.lineTo(TS, i); g.stroke(); }
      g.globalAlpha = 1;
      g.fillStyle = "#000"; g.fillRect(8, 40, 112, 48);
      label(g, "FIREWALL", 64, 56, 16, C.err); label(g, E.t("🔒 limpia los bugs", "🔒 wipe the bugs"), 64, 76, 9, C.br, false);
      edges(g, C.err);
    })],
  };
  const texFor = (c: string, mx: number, my: number): HTMLCanvasElement => {
    const h = (mx * 7 + my * 13) & 255;
    const blink = Math.floor(E.time * 3 + h) & 1;
    switch (c) {
      case "G": return T.gpu[blink];
      case "N": return T.thesis[h % 3];
      case "S": return T.server[blink];
      case "L": return T.lib[h % 4];
      case "U": return T.glud[h % 2];
      case "K": return T.kern[h % 3];
      case "X": return T.fw[0];
      default: return T.hall[h % 2];
    }
  };
  const ZCOL: Record<string, string> = { "#": C.fg, G: C.warn, N: C.cyan, S: C.cyan, L: C.violet, U: C.acc, K: C.err, X: C.err };

  // ── sprites ───────────────────────────────────────────────────────────────
  // insecto con cabeza bien separada del cuerpo (para que el headshot se lea a simple vista)
  const bugSpr = (body: string, head: string, eye: string, phase: number) => mk(96, 96, (g) => {
    g.scale(1.5, 1.5);
    g.strokeStyle = body; g.lineWidth = 2.5; g.lineCap = "round";
    g.beginPath();
    for (const k of [-1, 1]) for (const [i, l] of [36, 43, 50].entries()) {
      const sw = ((i + phase) % 2 ? 3 : -3) * k;
      g.moveTo(32 + k * 10, l); g.lineTo(32 + k * 20, l + 4 + sw); g.lineTo(32 + k * 24, 63);
    }
    g.stroke();
    g.fillStyle = body; g.beginPath(); g.ellipse(32, 44, 12, 15, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(0,0,0,0.35)"; for (const y of [38, 45, 52]) g.fillRect(22, y, 20, 2);
    // cuello fino + cabeza
    g.fillStyle = body; g.fillRect(30, 26, 4, 5);
    g.strokeStyle = head; g.lineWidth = 2; g.beginPath(); g.moveTo(27, 12); g.lineTo(21, 2); g.moveTo(37, 12); g.lineTo(43, 2); g.stroke();
    g.fillStyle = head; g.beginPath(); g.arc(32, 18, 10, 0, TAU); g.fill();
    g.fillStyle = eye; g.beginPath(); g.arc(28, 17, 3, 0, TAU); g.arc(36, 17, 3, 0, TAU); g.fill();
    g.fillStyle = "#000"; g.fillRect(28, 23, 8, 2);
  });
  const crawlSpr = (body: string, head: string, eye: string, phase: number) => mk(96, 96, (g) => {
    g.scale(1.5, 1.5);
    g.strokeStyle = body; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath();
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
      const sw = ((i + phase) % 2 ? 4 : -4);
      g.moveTo(32 + k * 8, 48); g.lineTo(32 + k * (18 + i * 3), 36 + i * 3 + sw); g.lineTo(32 + k * (24 + i * 2), 63);
    }
    g.stroke();
    g.fillStyle = body; g.beginPath(); g.ellipse(32, 50, 16, 10, 0, 0, TAU); g.fill();
    g.fillStyle = head; g.beginPath(); g.arc(32, 34, 9, 0, TAU); g.fill();
    g.fillStyle = eye; g.beginPath(); g.arc(28, 33, 2.6, 0, TAU); g.arc(36, 33, 2.6, 0, TAU); g.arc(32, 29, 2, 0, TAU); g.fill();
  });
  const bossSpr = (body: string, phase: number, hurt: boolean) => mk(160, 160, (g) => {
    g.scale(2.5, 2.5);
    g.strokeStyle = body; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath();
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
      const sw = ((i + phase) % 2 ? 3 : -3);
      g.moveTo(32 + k * 12, 38 + i * 5); g.lineTo(32 + k * 26, 36 + i * 6 + sw); g.lineTo(32 + k * 29, 63);
    }
    g.stroke();
    g.fillStyle = body; g.beginPath(); g.ellipse(32, 46, 16, 16, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(20, 40, 24, 2); g.fillRect(20, 48, 24, 2);
    g.fillStyle = body; g.fillRect(29, 26, 6, 5);
    // cabeza: un monitor con la pantalla del kernel panic
    g.fillStyle = hurt ? "#fff" : "#140204"; g.fillRect(17, 4, 30, 22);
    g.strokeStyle = hurt ? "#fff" : C.warn; g.lineWidth = 2; g.strokeRect(17, 4, 30, 22);
    g.fillStyle = hurt ? C.err : C.warn; g.font = E.font(9, true); g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(":(", 32, 13); g.font = E.font(4.5, true); g.fillText("PANIC", 32, 21);
  });
  const SPR = {
    bug: [0, 1].map((p) => bugSpr(C.pink, "#ffd1e8", C.cyan, p)),
    bugHit: bugSpr("#ffffff", "#ffffff", C.pink, 0),
    bugCharge: bugSpr(C.pink, "#ffd1e8", "#ffffff", 0),
    crawl: [0, 1].map((p) => crawlSpr(C.violet, C.warn, C.err, p)),
    crawlHit: crawlSpr("#ffffff", "#ffffff", C.err, 0),
    boss: [0, 1].map((p) => bossSpr(C.err, p, false)),
    bossHit: bossSpr("#ffffff", 0, true),
    orb: mk(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      r.addColorStop(0, "#fff"); r.addColorStop(0.35, "#ff9ccc"); r.addColorStop(1, "rgba(255,61,154,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    }),
    orbBig: mk(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      r.addColorStop(0, "#fff"); r.addColorStop(0.35, "#ffb347"); r.addColorStop(1, "rgba(255,60,40,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    }),
  };
  const DSPR: Record<string, HTMLCanvasElement> = {
    p: mk(64, 64, (g) => {
      g.fillStyle = "#3a2416"; g.beginPath(); g.moveTo(22, 46); g.lineTo(42, 46); g.lineTo(39, 63); g.lineTo(25, 63); g.fill();
      g.strokeStyle = C.acc; g.lineWidth = 1.5; g.strokeRect(22, 46, 20, 2);
      g.fillStyle = "#1d7a3a";
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.32; g.beginPath(); g.ellipse(32 + Math.cos(a) * 12, 34 + Math.sin(a) * 14, 4, 11, a + Math.PI / 2, 0, TAU); g.fill(); }
      g.fillStyle = "#2fbf5a"; g.beginPath(); g.ellipse(32, 26, 3, 12, 0, 0, TAU); g.fill();
    }),
    l: mk(64, 64, (g) => {
      const r = g.createRadialGradient(32, 12, 1, 32, 12, 24);
      r.addColorStop(0, "rgba(255,230,160,0.9)"); r.addColorStop(1, "rgba(255,200,80,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 40);
      g.fillStyle = "#2a2a2a"; g.fillRect(31, 14, 2, 46); g.fillRect(24, 60, 16, 3);
      g.fillStyle = C.warn; g.beginPath(); g.moveTo(24, 16); g.lineTo(40, 16); g.lineTo(36, 6); g.lineTo(28, 6); g.fill();
    }),
    c: mk(64, 64, (g) => {
      g.fillStyle = "#1b1b22"; g.fillRect(8, 44, 48, 4); g.fillRect(12, 48, 3, 15); g.fillRect(49, 48, 3, 15);
      g.fillStyle = "#222"; g.fillRect(16, 18, 32, 24); g.fillStyle = "#000"; g.fillRect(18, 20, 28, 18);
      g.fillStyle = C.acc; g.font = E.font(6, true); g.textAlign = "left"; g.fillText(">_ ieee", 19, 27); g.fillText("reviewer", 19, 34);
      g.fillStyle = C.err; g.beginPath(); g.arc(44, 23, 1.5, 0, TAU); g.fill();
    }),
    t: mk(64, 64, (g) => {
      g.fillStyle = "#111"; g.beginPath(); g.ellipse(32, 44, 14, 18, 0, 0, TAU); g.fill();
      g.fillStyle = "#eee"; g.beginPath(); g.ellipse(32, 47, 9, 14, 0, 0, TAU); g.fill();
      g.fillStyle = "#111"; g.beginPath(); g.arc(32, 22, 10, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(28, 21, 3, 0, TAU); g.arc(36, 21, 3, 0, TAU); g.fill();
      g.fillStyle = "#000"; g.fillRect(28, 21, 1.5, 2); g.fillRect(35, 21, 1.5, 2);
      g.fillStyle = C.warn; g.beginPath(); g.moveTo(28, 26); g.lineTo(36, 26); g.lineTo(32, 31); g.fill();
      g.fillRect(21, 60, 9, 3); g.fillRect(34, 60, 9, 3);
    }),
    b: mk(64, 64, (g) => {
      const cs = [C.violet, C.pink, C.cyan, C.warn, C.fg];
      for (let i = 0; i < 5; i++) { g.fillStyle = cs[i]; g.globalAlpha = 0.8; g.fillRect(16 + (i % 2) * 3, 58 - i * 7, 30, 6); }
      g.globalAlpha = 1; g.fillStyle = "#fff"; g.font = E.font(5, true); g.fillText("CUDA", 22, 34);
    }),
    m: mk(64, 64, (g) => {
      g.fillStyle = "#222"; g.fillRect(30, 42, 4, 18); g.fillRect(22, 60, 20, 3);
      g.fillStyle = "#000"; g.fillRect(8, 10, 48, 32);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) { const n = Math.floor(Math.random() * 200); g.fillStyle = `rgb(${n},${Math.floor(n * 0.6)},${255 - n})`; g.fillRect(10 + i * 3.7, 12 + j * 3.5, 3.7, 3.5); }
      g.strokeStyle = C.cyan; g.lineWidth = 1.5; g.strokeRect(8, 10, 48, 32);
    }),
  };
  // la terminal del cuarto de servidores graba la sesión (session-recorder)
  const recTerm = mk(64, 64, (g) => {
    g.drawImage(DSPR.c, 0, 0);
    g.fillStyle = "#000"; g.fillRect(18, 20, 28, 18);
    g.fillStyle = C.err; g.beginPath(); g.arc(22, 25, 2, 0, TAU); g.fill();
    g.fillStyle = C.br; g.font = E.font(6, true); g.textAlign = "left"; g.fillText("REC", 26, 27); g.fillStyle = C.acc; g.fillText("whisper", 19, 35);
  });
  const PSPR: Record<string, HTMLCanvasElement> = {
    h: mk(64, 64, (g) => {
      g.fillStyle = "#06140a"; g.fillRect(14, 22, 36, 36); g.strokeStyle = C.acc; g.lineWidth = 2; g.strokeRect(14, 22, 36, 36);
      g.fillStyle = C.acc; g.fillRect(28, 28, 8, 24); g.fillRect(20, 36, 24, 8);
    }),
    a: mk(64, 64, (g) => {
      g.fillStyle = "#151004"; g.fillRect(12, 30, 40, 28); g.strokeStyle = C.warn; g.lineWidth = 2; g.strokeRect(12, 30, 40, 28);
      g.fillStyle = C.warn; for (let i = 0; i < 4; i++) g.fillRect(18 + i * 8, 22, 5, 10);
      g.font = E.font(8, true); g.textAlign = "center"; g.fillText("AMMO", 32, 47);
    }),
    "2": mk(64, 64, (g) => {
      g.fillStyle = "#222"; g.fillRect(8, 34, 48, 6); g.fillRect(8, 41, 48, 6);
      g.fillStyle = "#3a2a14"; g.fillRect(40, 32, 18, 20);
      g.strokeStyle = C.warn; g.lineWidth = 1.5; g.strokeRect(8, 34, 48, 13);
      g.fillStyle = C.warn; g.font = E.font(7, true); g.textAlign = "center"; g.fillText("rm -rf", 30, 28);
    }),
    "3": mk(64, 64, (g) => {
      g.fillStyle = "#0a1418"; g.fillRect(6, 32, 52, 14); g.strokeStyle = C.cyan; g.lineWidth = 1.5; g.strokeRect(6, 32, 52, 14);
      g.beginPath(); g.arc(22, 39, 5, 0, TAU); g.stroke();
      g.fillStyle = C.cyan; g.fillRect(36, 37, 18, 4);
      g.font = E.font(8, true); g.textAlign = "center"; g.fillText("GPU", 32, 26);
    }),
  };

  // ── cielo: cerros orientales de Bogotá (Monserrate y Guadalupe) ───────────
  function buildSky() {
    const fovA = 2 * Math.atan(fov);
    const PW = Math.min(9000, Math.round((E.W * TAU) / fovA)), SH = Math.max(120, Math.round(E.H * 0.5));
    sky = mk(PW, SH, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, SH);
      gr.addColorStop(0, "#04030f"); gr.addColorStop(0.55, "#140c2c"); gr.addColorStop(0.85, "#3a1a3e"); gr.addColorStop(1, "#5a2a3a");
      g.fillStyle = gr; g.fillRect(0, 0, PW, SH);
      for (let i = 0; i < PW / 9; i++) { g.globalAlpha = rand(0.2, 0.9); g.fillStyle = "#fff"; g.fillRect(rand(0, PW), rand(0, SH * 0.6), rand(0.8, 1.8), rand(0.8, 1.8)); }
      g.globalAlpha = 1;
      // luna
      g.fillStyle = "#f2ead0"; g.beginPath(); g.arc(PW * 0.62, SH * 0.2, 12, 0, TAU); g.fill();
      g.fillStyle = "#140c2c"; g.beginPath(); g.arc(PW * 0.62 + 5, SH * 0.2 - 3, 11, 0, TAU); g.fill();
      // cordillera lejana (periódica para que el panorama cierre sin costura)
      const ridge = (amp: number, base: number, seed: number, col: string) => {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, SH);
        for (let x = 0; x <= PW; x += 6) {
          const u = (x / PW) * TAU;
          const y = SH - base - amp * (0.5 + 0.25 * Math.sin(u * 3 + seed) + 0.15 * Math.sin(u * 7 + seed * 2) + 0.1 * Math.sin(u * 17 + seed * 3));
          g.lineTo(x, y);
        }
        g.lineTo(PW, SH); g.closePath(); g.fill();
      };
      ridge(SH * 0.22, SH * 0.04, 1.3, "#1d1336");
      // cerros orientales cercanos: ángulo 0 (este) queda en x = W/2 del panorama
      const mx = E.W / 2, gx = mx + PW * 0.07;
      const peak = (x: number) => {
        const d1 = (x - mx) / (PW * 0.05), d2 = (x - gx) / (PW * 0.06);
        const hills = SH * 0.08 + SH * 0.05 * Math.sin((x / PW) * TAU * 5);
        return Math.max(hills, SH * 0.42 * Math.exp(-d1 * d1 * 1.6), SH * 0.48 * Math.exp(-d2 * d2 * 1.4));
      };
      g.fillStyle = "#0a0716"; g.beginPath(); g.moveTo(0, SH);
      for (let x = 0; x <= PW; x += 4) g.lineTo(x, SH - peak(x));
      g.lineTo(PW, SH); g.closePath(); g.fill();
      // santuario de Monserrate (blanco, iluminado) y la virgen de Guadalupe
      const my = SH - peak(mx);
      g.fillStyle = "#f4f1e8"; g.fillRect(mx - 9, my - 9, 18, 9); g.fillRect(mx - 3, my - 19, 6, 12);
      g.beginPath(); g.moveTo(mx - 4, my - 19); g.lineTo(mx, my - 25); g.lineTo(mx + 4, my - 19); g.fill();
      g.fillRect(mx - 0.5, my - 30, 1, 5); g.fillRect(mx - 2, my - 28, 4, 1);
      g.fillStyle = C.warn; g.fillRect(mx - 6, my - 6, 2, 2); g.fillRect(mx + 4, my - 6, 2, 2);
      const gy = SH - peak(gx);
      g.fillStyle = "#e8e4d8"; g.fillRect(gx - 1.5, gy - 14, 3, 14); g.fillRect(gx - 5, gy - 11, 10, 2);
      // teleférico bajando por la ladera
      g.strokeStyle = "rgba(255,220,150,0.5)"; g.setLineDash([2, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(mx + 4, my + 2); g.lineTo(mx + PW * 0.035, SH - SH * 0.07); g.stroke(); g.setLineDash([]);
      // luces de la ciudad al pie de los cerros
      for (let i = 0; i < PW / 5; i++) {
        g.globalAlpha = rand(0.3, 0.9); g.fillStyle = Math.random() < 0.7 ? "#ffcc77" : "#fff";
        g.fillRect(rand(0, PW), SH - rand(1, SH * 0.06), 1.2, 1.2);
      }
      g.globalAlpha = 1;
    });
  }

  function buildMini() {
    ms = clamp(Math.min(E.W, E.H) / 130, 3, 5.5);
    mini = mk(Math.ceil(MW * ms), Math.ceil(MH * ms), (g) => {
      g.fillStyle = "rgba(0,0,0,0.65)"; g.fillRect(0, 0, MW * ms, MH * ms);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = grid[y][x];
        if (isWall(c)) { g.fillStyle = ZCOL[c] ?? C.dim; g.globalAlpha = 0.55; g.fillRect(x * ms, y * ms, ms, ms); }
        else if (decorCell[y * MW + x]) { g.fillStyle = "#666"; g.globalAlpha = 0.6; g.fillRect(x * ms + ms * 0.3, y * ms + ms * 0.3, ms * 0.4, ms * 0.4); }
      }
      g.globalAlpha = 1;
    });
  }

  function fit() {
    fov = clamp((E.W / E.H) * 0.55, 0.42, 0.75);
    proj = E.W / (2 * fov);
    colW = E.hq ? Math.max(1, Math.ceil(E.W / 640)) : Math.max(2, Math.ceil(E.W / 320));
    cols = Math.ceil(E.W / colW);
    zbuf = new Float32Array(cols + 1);
    buildSky(); buildMini();
  }
  fit();
  let lastHq = E.hq;

  // ── navegación: campo de distancias BFS desde la celda del jugador ────────
  const flow = new Int16Array(MW * MH);
  let flowCell = -1;
  const passable = (x: number, y: number) => x >= 0 && y >= 0 && x < MW && y < MH && !isWall(grid[y][x]) && !decorCell[y * MW + x];
  function buildFlow() {
    flow.fill(-1);
    const sx = Math.floor(pl.x), sy = Math.floor(pl.y);
    const q = [sx + sy * MW]; flow[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], x = c % MW, y = (c / MW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = nx + ny * MW;
        if (passable(nx, ny) && flow[n] < 0) { flow[n] = flow[c] + 1; q.push(n); }
      }
    }
  }

  // ── utilidades de física ──────────────────────────────────────────────────
  function los(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 5);
    for (let i = 1; i < n; i++) if (wallAt(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }
  const free = (x: number, y: number, r: number) => {
    if (wallAt(x - r, y - r) || wallAt(x + r, y - r) || wallAt(x - r, y + r) || wallAt(x + r, y + r)) return false;
    for (const d of decor) if (Math.abs(d.x - x) < r + 0.28 && Math.abs(d.y - y) < r + 0.28) return false;
    return true;
  };
  function move(o: { x: number; y: number }, dx: number, dy: number, r = 0.22) {
    if (free(o.x + dx, o.y, r)) o.x += dx;
    if (free(o.x, o.y + dy, r)) o.y += dy;
  }
  /** punto del mundo → { sx, depth } en pantalla (o null si queda detrás) */
  function project(x: number, y: number) {
    const dirX = Math.cos(pl.a), dirY = Math.sin(pl.a);
    const plX = -dirY * fov, plY = dirX * fov;
    const rx = x - pl.x, ry = y - pl.y;
    const inv = 1 / (plX * dirY - dirX * plY);
    const tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry);
    if (ty <= 0.12) return null;
    return { sx: (E.W / 2) * (1 + tx / ty), depth: ty };
  }
  const horizon = () => E.H / 2 + pl.pitch + (E.reduce ? 0 : Math.sin(pl.bob) * 3);

  // ── tipos de enemigo: tamaño en el mundo y cajas de impacto (normalizadas al sprite) ──
  const KIND = {
    bug: { scale: 0.95, head: [0.5, 0.28, 0.17], bodyW: 0.26, bodyTop: 0.42 },
    crawler: { scale: 0.62, head: [0.5, 0.53, 0.16], bodyW: 0.32, bodyTop: 0.62 },
    boss: { scale: 1.65, head: [0.5, 0.24, 0.17], bodyW: 0.3, bodyTop: 0.4 },
  } as const;

  // ── interfaz flotante ─────────────────────────────────────────────────────
  let hitT = 0, hitKill = false, zoneT = 0, zoneName = "", zoneId = "", banner = 0, bannerText = "";
  const dmgDirs: { a: number; t: number }[] = [];
  const popup = (text: string, color: string, size = 18, dy = 0) => pops.push({ text, x: E.W / 2, y: E.H / 2 - 40 + dy, t: 1, color, size });

  function zoneOf(x: number, y: number): [string, string] {
    if (x >= 22) return ["arena", E.t("☠ kernel space · KERNEL PANIC", "☠ kernel space · KERNEL PANIC")];
    if (x < 4 && y >= 8 && y <= 13) return ["glud", E.t("🐧 Rincón GLUD · ai-context-extractor", "🐧 GLUD corner · ai-context-extractor")];
    if (y < 8) return x <= 10
      ? ["lab", E.t("🧠 Laboratorio de IA · clúster de GPUs", "🧠 AI lab · GPU cluster")]
      : ["thesis", E.t("📜 Sala de tesis · difusión + esteganografía", "📜 Thesis room · diffusion + steganography")];
    if (y > 13) return x <= 10
      ? ["lib", E.t("📚 Biblioteca MCIC · paralela · BI · IC", "📚 MCIC library · parallel · BI · CI")]
      : ["srv", E.t("🗄 Cuarto de servidores · session-recorder", "🗄 Server room · session-recorder")];
    return ["hall", E.t("🧭 Pasillo central · 16/44 créditos", "🧭 Main hall · 16/44 credits")];
  }
  const FLOOR: Record<string, [string, string]> = {
    hall: ["#06090a", "#0f1a14"], glud: ["#050a05", "#0e2012"], lab: ["#0a0804", "#1e160a"], thesis: ["#04090c", "#0a1a22"],
    lib: ["#07050c", "#170f24"], srv: ["#04070c", "#0a1424"], arena: ["#0c0304", "#240709"],
  };

  // ── armas: disparo hitscan con dispersión, resuelto en el espacio de pantalla ──
  function switchTo(i: number) {
    if (i === wi || !owned[i] || won) return;
    wi = i; pl.swap = 0.25; wcool = Math.max(wcool, 0.2); E.beep(520, 12, 0.03);
  }
  function cycle(dir: number) {
    for (let k = 1; k <= 3; k++) { const i = (wi + dir * k + 30) % 3; if (owned[i] && (WEAPONS[i].ammo > 0)) { switchTo(i); return; } }
  }
  function fireSound(i: number) {
    if (i === 0) { E.beep(1100, 16, 0.03); E.beep(320, 34, 0.03); }
    else if (i === 1) { E.beep(80, 140, 0.07); setTimeout(() => E.beep(55, 160, 0.05), 50); setTimeout(() => E.beep(1800, 8, 0.02), 420); }
    else E.beep(1500 + Math.random() * 300, 9, 0.018);
  }
  function fire() {
    const w = WEAPONS[wi];
    if (wcool > 0 || pl.swap > 0 || won) return;
    if (w.ammo <= 0) {
      if (emptyT <= 0) { E.beep(180, 20, 0.02); emptyT = 0.4; popup(E.t("sin munición", "out of ammo"), C.err, 14, 70); }
      cycle(-1); return;
    }
    wcool = w.cool; if (w.ammo !== Infinity) w.ammo--;
    pl.kick = wi === 1 ? 1.4 : wi === 2 ? 0.45 : 1; pl.muzzle = wi === 2 ? 0.04 : 0.07;
    pl.pitch += wi === 1 ? 10 : wi === 2 ? 1.2 : 3; // un poco de retroceso hacia arriba
    if (wi === 1) E.shake(4);
    fireSound(wi);
    // ruido: los bugs cercanos escuchan el disparo
    for (const m of mobs) if (m.hp > 0 && (m.kind !== "boss" || doorOpen) && Math.hypot(m.x - pl.x, m.y - pl.y) < 7) m.alert = true;

    const hz = horizon();
    const cand: { m: Mob; sx: number; d: number; size: number }[] = [];
    for (const m of mobs) {
      if (m.hp <= 0) continue;
      const p = project(m.x, m.y);
      if (!p) continue;
      cand.push({ m, sx: p.sx, d: p.depth, size: (proj / p.depth) * KIND[m.kind].scale });
    }
    cand.sort((a, b) => a.d - b.d);
    let anyHit = false, anyHead = false, anyKill = false;
    for (let k = 0; k < w.pellets; k++) {
      const a = Math.random() * TAU, r = w.spread * Math.sqrt(Math.random()) * (k === 0 && w.pellets > 1 ? 0.3 : 1);
      const X = E.W / 2 + Math.cos(a) * r * proj, Y = E.H / 2 + Math.sin(a) * r * proj;
      const col = clamp(Math.floor(X / colW), 0, cols - 1);
      const wallD = zbuf[col] || 99;
      let hitSomething = false;
      for (const c of cand) {
        if (c.m.hp <= 0 || c.d > wallD) continue;
        const K = KIND[c.m.kind];
        const u = (X - (c.sx - c.size / 2)) / c.size;
        if (u < 0 || u > 1) continue;
        const z = 0.5 - ((Y - hz) * c.d) / proj; // altura en el mundo bajo el punto de mira
        const v = 1 - z / K.scale;
        const head = Math.hypot(u - K.head[0], v - K.head[1]) < K.head[2];
        const body = !head && Math.abs(u - 0.5) < K.bodyW && z >= -0.05 && z <= Math.max(K.scale * (1 - K.bodyTop), 0.62);
        if (!head && !body) continue;
        hitSomething = anyHit = true;
        const killed = damage(c.m, w.dmg, head);
        if (head) anyHead = true;
        if (killed) anyKill = true;
        break;
      }
      if (!hitSomething && E.hq && k < 3) E.burst(X, Y, w.color, 3, 90, 2);
    }
    if (anyHit) {
      hitT = 0.16; hitKill = anyKill || anyHead;
      if (anyHead) { E.beep(1568, 40, 0.05); setTimeout(() => E.beep(2093, 70, 0.05), 45); }
      else if (!anyKill) E.beep(700, 10, 0.03);
    }
  }
  /** daño a un enemigo; devuelve true si murió */
  function damage(m: Mob, dmg: number, head: boolean) {
    m.alert = true; m.seen = true; m.flash = m.kind === "boss" ? 0.05 : 0.1;
    if (head) {
      if (m.kind === "boss") dmg *= 2; else dmg = m.hp;
      const hs = pops.find((p) => p.text === "HEADSHOT");
      if (hs) hs.t = 1; else popup("HEADSHOT", C.warn, m.kind === "boss" ? 16 : 22, -20);
    }
    m.hp -= dmg;
    if (m.hp > 0) { E.addScore(head ? 30 : 10); return false; }
    m.dead = m.kind === "boss" ? 1.4 : 0.6;
    const pts = m.kind === "boss" ? 3000 : head ? 500 : 300;
    E.addScore(pts); popup(`+${pts}`, C.acc, 14, 24);
    E.sfx.boom(); E.shake(m.kind === "boss" ? 16 : 6);
    const n = (E.reduce || !E.hq ? 8 : 16) * (m.kind === "boss" ? 3 : 1);
    const cols2 = m.kind === "bug" ? [C.pink, "#ffd1e8", C.cyan] : m.kind === "crawler" ? [C.violet, C.warn] : [C.err, C.warn, "#fff"];
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.6, 2.2);
      gibs.push({ x: m.x, y: m.y, z: rand(0.2, KIND[m.kind].scale * 0.9), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(0.5, 2.6), life: rand(0.8, 1.5), color: cols2[i % cols2.length], s: rand(0.025, 0.05) });
    }
    // el resto escucha la caída
    for (const o of mobs) if (o.hp > 0 && o.kind !== "boss" && Math.hypot(o.x - m.x, o.y - m.y) < 6) o.alert = true;
    if (m.kind === "boss") {
      won = 2.8; orbs.length = 0;
      for (let i = 0; i < 4; i++) E.burst(rand(E.W * 0.25, E.W * 0.75), rand(E.H * 0.3, E.H * 0.6), [C.acc, C.pink, C.warn, C.cyan][i], 24, 260, 4);
      E.sfx.point();
    }
    return true;
  }

  function hurtPlayer(n: number, sx: number, sy: number) {
    if (pl.iframe > 0 || won) return;
    pl.iframe = 0.3; pl.hp -= n;
    dmgDirs.push({ a: Math.atan2(sy - pl.y, sx - pl.x), t: 1 });
    if (dmgDirs.length > 4) dmgDirs.shift();
    E.flash(0.18); E.beep(150, 60, 0.05);
    if (pl.hp <= 0) { if (E.hurt()) { pl.hp = 100; pl.iframe = 1.2; popup(E.t("integridad restaurada · −1 ♥", "integrity restored · −1 ♥"), C.err, 15, 60); } }
  }

  function pickUp(p: Pick) {
    if (p.type === "h") {
      if (pl.hp >= 100 && E.lives() >= 3) return;
      if (pl.hp >= 100) { E.addLife(); popup("+1 ♥", C.err, 16, 60); }
      else { pl.hp = Math.min(100, pl.hp + 45); popup(E.t("+45 integridad", "+45 integrity"), C.acc, 15, 60); }
    } else if (p.type === "a") {
      if (WEAPONS[1].ammo >= WEAPONS[1].max && WEAPONS[2].ammo >= WEAPONS[2].max) return;
      WEAPONS[1].ammo = Math.min(WEAPONS[1].max, WEAPONS[1].ammo + 6);
      WEAPONS[2].ammo = Math.min(WEAPONS[2].max, WEAPONS[2].ammo + 45);
      popup(E.t("+munición", "+ammo"), C.warn, 15, 60);
    } else {
      const i = p.type === "2" ? 1 : 2;
      owned[i] = true; WEAPONS[i].ammo = Math.min(WEAPONS[i].max, WEAPONS[i].ammo + (i === 1 ? 12 : 90));
      wi = i; pl.swap = 0.25; E.beep(520, 12, 0.03);
      bannerText = i === 1
        ? E.t("[2] sudo rm -rf · escopeta: 7 perdigones, de cerca", "[2] sudo rm -rf · shotgun: 7 pellets, up close")
        : E.t("[3] clúster GPU · automático: mantén para disparar", "[3] GPU cluster · automatic: hold to fire");
      banner = 3.2;
    }
    p.taken = true; E.sfx.power(); E.addScore(50);
  }

  // ── bucle ─────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (E.hq !== lastHq) { lastHq = E.hq; fit(); }
    wcool = Math.max(0, wcool - dt); emptyT = Math.max(0, emptyT - dt);
    pl.kick = Math.max(0, pl.kick - dt * 5); pl.muzzle = Math.max(0, pl.muzzle - dt);
    pl.iframe = Math.max(0, pl.iframe - dt); pl.swap = Math.max(0, pl.swap - dt);
    hitT = Math.max(0, hitT - dt); zoneT = Math.max(0, zoneT - dt); banner = Math.max(0, banner - dt);
    for (const d of dmgDirs) d.t -= dt * 1.1;
    E.filter(dmgDirs, (d) => d.t > 0);
    for (const p of pops) { p.t -= dt * 0.9; p.y -= dt * 30; }
    E.filter(pops, (p) => p.t > 0);

    // cámara: ratón / arrastre táctil (el motor acumula lookDX/lookDY) y flechas
    const sens = 0.0026;
    pl.a += E.ptr.lookDX * sens; E.ptr.lookDX = 0;
    pl.pitch = clamp(pl.pitch - E.ptr.lookDY * 0.9, -E.H * 0.32, E.H * 0.32); E.ptr.lookDY = 0;
    if (E.key("arrowleft")) pl.a -= 2.6 * dt;
    if (E.key("arrowright")) pl.a += 2.6 * dt;
    pl.a = (pl.a + TAU) % TAU;

    let fw = 0, st = 0;
    if (E.key("w", "arrowup")) fw += 1;
    if (E.key("s", "arrowdown")) fw -= 1;
    if (E.key("a")) st -= 1;
    if (E.key("d")) st += 1;
    for (const tch of E.touches.values()) {
      if (tch.sx < E.W / 2) { fw += clamp(-(tch.y - tch.sy) / 50, -1, 1); st += clamp((tch.x - tch.sx) / 50, -1, 1); }
    }
    const len = Math.hypot(fw, st); if (len > 1) { fw /= len; st /= len; }
    const dX = Math.cos(pl.a), dY = Math.sin(pl.a), spd = 3.1 * dt;
    const mx = (dX * fw - dY * st) * spd, my = (dY * fw + dX * st) * spd;
    if (mx || my) pl.bob += dt * 10;
    move(pl, mx, my);
    for (const m of mobs) { // no atravesar a los enemigos
      if (m.hp <= 0) continue;
      const rr = m.kind === "boss" ? 0.75 : 0.45, d = Math.hypot(pl.x - m.x, pl.y - m.y);
      if (d < rr && d > 0.001) move(pl, ((pl.x - m.x) / d) * (rr - d), ((pl.y - m.y) / d) * (rr - d));
    }

    // disparo: semiautomático con cada clic/tecla, automático mientras se mantiene
    const w = WEAPONS[wi];
    let touchHeld = false;
    if (touchFire >= 0) { const tch = E.touches.get(touchFire); if (tch && Math.hypot(tch.x - tch.sx, tch.y - tch.sy) < 14) touchHeld = true; else if (!tch) touchFire = -1; }
    if (wantShot || (w.auto && (E.key(" ") || mouseHeld || touchHeld))) fire();
    wantShot = false;
    pl.spin += dt * (wi === 2 && wcool > 0 ? 30 : 3);

    // zona actual (aviso tipo "dynamic island", guiño a ActivSpot)
    const [zid, zname] = zoneOf(Math.floor(pl.x), Math.floor(pl.y));
    if (zid !== zoneId) { zoneId = zid; zoneName = zname; zoneT = 2.6; }

    const cell = Math.floor(pl.x) + Math.floor(pl.y) * MW;
    if (cell !== flowCell) { flowCell = cell; buildFlow(); }

    for (const m of mobs) {
      m.t += dt; m.flash = Math.max(0, m.flash - dt);
      if (m.hp <= 0) { m.dead = Math.max(0, m.dead - dt); continue; }
      if (won) continue;
      const boss = m.kind === "boss";
      if (boss && !doorOpen) continue;
      const d = Math.hypot(pl.x - m.x, pl.y - m.y);
      const sees = d < (boss ? 14 : 10) && los(m.x, m.y, pl.x, pl.y);
      if (sees && !m.alert) { m.alert = true; m.react = boss ? 0.6 : 0.7; }
      if (sees) m.seen = true;
      m.react = Math.max(0, m.react - dt); m.melee = Math.max(0, m.melee - dt);
      if (!m.alert) { m.t += dt * 0.5; continue; }

      // movimiento: perseguir por el campo de flujo; los que disparan guardan distancia y se mueven de lado
      const spd2 = (m.kind === "crawler" ? 2.3 : boss ? 1.3 : 1.15) * dt;
      let vx = 0, vy = 0;
      const keep = m.kind === "bug" ? 3.2 : boss ? 3.5 : 0;
      if (sees && d < keep + 1.5 && d > 0.01) {
        // ya está a tiro: se mueve de lado (y retrocede si está muy cerca)
        const px2 = -(pl.y - m.y) / d, py2 = (pl.x - m.x) / d;
        vx = px2 * m.strafe * 0.8; vy = py2 * m.strafe * 0.8;
        if (d < keep) { vx -= ((pl.x - m.x) / d) * 0.6; vy -= ((pl.y - m.y) / d) * 0.6; }
        if (Math.random() < dt * 0.5) m.strafe *= -1;
      } else if (sees && d > 0.01) {
        vx = (pl.x - m.x) / d; vy = (pl.y - m.y) / d;
        if (m.kind === "crawler") { const z = Math.sin(m.t * 7) * 0.6; vx += -vy * z; vy += vx * z; }
      } else {
        const cx = Math.floor(m.x), cy = Math.floor(m.y);
        let best = flow[cx + cy * MW], tx = m.x, ty = m.y;
        for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + ddx, ny = cy + ddy, f = nx >= 0 && ny >= 0 && nx < MW && ny < MH ? flow[nx + ny * MW] : -1;
          if (f >= 0 && (best < 0 || f < best)) { best = f; tx = nx + 0.5; ty = ny + 0.5; }
        }
        const dd = Math.hypot(tx - m.x, ty - m.y);
        if (dd > 0.01) { vx = (tx - m.x) / dd; vy = (ty - m.y) / dd; }
      }
      // separación entre enemigos
      for (const o of mobs) {
        if (o === m || o.hp <= 0) continue;
        const dd = Math.hypot(o.x - m.x, o.y - m.y);
        if (dd < 0.7 && dd > 0.001) { vx -= ((o.x - m.x) / dd) * 0.8; vy -= ((o.y - m.y) / dd) * 0.8; }
      }
      if (d > (boss ? 0.95 : 0.6)) move(m, vx * spd2, vy * spd2, boss ? 0.4 : 0.25);

      // cuerpo a cuerpo
      if (d < (boss ? 1.05 : 0.75) && m.melee <= 0) { m.melee = 0.8; hurtPlayer(boss ? 25 : 15, m.x, m.y); }

      // disparo con aviso (los ojos se encienden antes)
      if (m.kind === "crawler") continue;
      m.cool -= dt;
      if (m.charge > 0) {
        m.charge -= dt;
        if (m.charge <= 0 && sees) {
          const a = Math.atan2(pl.y - m.y, pl.x - m.x);
          const offs = boss ? (m.hp < m.max / 2 ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.24, 0, 0.24]) : [rand(-0.05, 0.05)];
          const sp = boss ? 4.2 : 4.4;
          for (const off of offs) orbs.push({ x: m.x, y: m.y, vx: Math.cos(a + off) * sp, vy: Math.sin(a + off) * sp, big: boss, life: 5 });
          // en la segunda fase el jefe también lanza un anillo
          if (boss && m.hp < m.max / 2 && Math.random() < 0.4) for (let i = 0; i < 12; i++) { const b = (i / 12) * TAU; orbs.push({ x: m.x, y: m.y, vx: Math.cos(b) * 3, vy: Math.sin(b) * 3, big: true, life: 5 }); }
          E.beep(boss ? 140 : 260, 30, 0.025);
        }
      } else if (sees && m.react <= 0 && m.cool <= 0 && d < (boss ? 13 : 9)) {
        m.charge = boss ? 0.45 : 0.4;
        m.cool = boss ? (m.hp < m.max / 2 ? 1.25 : 1.6) : rand(1.9, 2.9);
      }
    }

    for (const b of orbs) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (wallAt(b.x, b.y) || b.life <= 0) b.life = -1;
      else if (Math.hypot(b.x - pl.x, b.y - pl.y) < (b.big ? 0.36 : 0.3)) { b.life = -1; hurtPlayer(b.big ? 18 : 12, b.x - b.vx, b.y - b.vy); }
    }
    E.filter(orbs, (b) => b.life > 0);

    for (const g of gibs) {
      g.life -= dt; g.vz -= 6 * dt; g.z += g.vz * dt;
      if (g.z < 0) { g.z = 0; g.vz *= -0.3; g.vx *= 0.6; g.vy *= 0.6; }
      const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt;
      if (!wallAt(nx, ny)) { g.x = nx; g.y = ny; } else { g.vx = 0; g.vy = 0; }
    }
    E.filter(gibs, (g) => g.life > 0);

    for (const p of picks) {
      p.t += dt;
      if (!p.taken && Math.hypot(p.x - pl.x, p.y - pl.y) < 0.6) pickUp(p);
    }

    // firewall: se abre cuando caen todos los bugs normales
    if (!doorOpen && mobs.every((m) => m.kind === "boss" || m.hp <= 0)) {
      doorOpen = true;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (grid[y][x] === "X") grid[y][x] = ".";
      buildMini(); flowCell = -1;
      bannerText = E.t("🔓 FIREWALL abierto · KERNEL PANIC te espera al este", "🔓 FIREWALL down · KERNEL PANIC awaits to the east");
      banner = 4; E.sfx.point(); E.beep(70, 400, 0.05);
    }

    if (won > 0) { won -= dt; if (won <= 0 && !cleared) { cleared = true; E.clear(); } }
  }

  // ── dibujo ────────────────────────────────────────────────────────────────
  function drawWorld(hz: number) {
    const W = E.W, H = E.H;
    // cielo con parallax (el panorama da la vuelta completa en 360°)
    if (sky) {
      const PW = sky.width, top = hz - sky.height;
      if (top > 0) { ctx.fillStyle = "#04030f"; ctx.fillRect(0, 0, W, top + 1); }
      const off = ((pl.a / TAU) * PW) % PW;
      ctx.drawImage(sky, -off, top);
      if (PW - off < W) ctx.drawImage(sky, PW - off, top);
    }
    const [f0, f1] = FLOOR[zoneId] ?? FLOOR.hall;
    const g2 = ctx.createLinearGradient(0, hz, 0, H);
    g2.addColorStop(0, f0); g2.addColorStop(1, f1);
    ctx.fillStyle = g2; ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let i = 1; i < 12; i++) { const y = hz + (H - hz) * Math.pow(i / 12, 2.2); ctx.fillRect(0, y, W, 1); }

    // muros: DDA por columna + textura + niebla
    const dirX = Math.cos(pl.a), dirY = Math.sin(pl.a);
    const plX = -dirY * fov, plY = dirX * fov;
    const fogRGB = "4,5,12";
    for (let i = 0; i < cols; i++) {
      const camX = (2 * (i * colW + colW / 2)) / W - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = Math.floor(pl.x), my = Math.floor(pl.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
      let sdx = rdx < 0 ? (pl.x - mx) * ddx : (mx + 1 - pl.x) * ddx;
      let sdy = rdy < 0 ? (pl.y - my) * ddy : (my + 1 - pl.y) * ddy;
      let side = 0, cell = "#";
      for (let k = 0; k < 80; k++) {
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
        const c = grid[my]?.[mx];
        if (isWall(c)) { cell = c ?? "#"; break; }
      }
      const dist = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
      zbuf[i] = dist;
      const h = proj / dist;
      let wx = side === 0 ? pl.y + dist * rdy : pl.x + dist * rdx; wx -= Math.floor(wx);
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) wx = 1 - wx; // sin texto en espejo
      const x = i * colW, top = hz - h / 2;
      const y0 = Math.max(0, top), y1 = Math.min(H, top + h);
      if (y1 <= y0) continue;
      const tex = texFor(cell, mx, my);
      const u = Math.min(TS - 1, Math.floor(wx * TS));
      ctx.drawImage(tex, u, ((y0 - top) / h) * TS, 1, ((y1 - y0) / h) * TS, x, y0, colW + 0.5, y1 - y0);
      const shade = 1 - clamp(1.25 / (1 + dist * 0.22), 0.12, 1) * (side ? 0.8 : 1);
      if (shade > 0.02) { ctx.fillStyle = `rgba(${fogRGB},${shade.toFixed(2)})`; ctx.fillRect(x, y0, colW + 0.5, y1 - y0); }
    }

    // sprites de lejos a cerca, recortados con el z-buffer
    type Sp = { x: number; y: number; img: HTMLCanvasElement; scale: number; z: number; alpha: number; sq: number; mob?: Mob; d2: number };
    const sps: Sp[] = [];
    const d2 = (x: number, y: number) => (x - pl.x) ** 2 + (y - pl.y) ** 2;
    for (const d of decor) {
      const img = d.type === "c" && d.y > 14 ? recTerm : DSPR[d.type];
      const sc = d.type === "l" ? 1 : d.type === "b" ? 0.5 : d.type === "t" ? 0.6 : d.type === "p" ? 0.75 : 0.8;
      sps.push({ x: d.x, y: d.y, img, scale: sc, z: 0, alpha: 1, sq: 1, d2: d2(d.x, d.y) });
    }
    for (const p of picks) if (!p.taken) sps.push({ x: p.x, y: p.y, img: PSPR[p.type], scale: 0.45, z: 0.06 + Math.sin(p.t * 3) * 0.04, alpha: 1, sq: 1, d2: d2(p.x, p.y) });
    for (const m of mobs) {
      if (m.hp <= 0 && m.dead <= 0) continue;
      const f = Math.floor(m.t * (m.alert ? 8 : 3)) & 1;
      let img: HTMLCanvasElement;
      if (m.kind === "boss") img = m.flash > 0 || m.hp <= 0 ? SPR.bossHit : SPR.boss[f];
      else if (m.kind === "crawler") img = m.flash > 0 || m.hp <= 0 ? SPR.crawlHit : SPR.crawl[f];
      else img = m.flash > 0 || m.hp <= 0 ? SPR.bugHit : m.charge > 0 ? SPR.bugCharge : SPR.bug[f];
      const dying = m.hp <= 0 ? m.dead / (m.kind === "boss" ? 1.4 : 0.6) : 1;
      sps.push({ x: m.x, y: m.y, img, scale: KIND[m.kind].scale, z: m.hp > 0 && m.kind === "bug" ? Math.abs(Math.sin(m.t * 5)) * 0.02 : 0, alpha: clamp(dying * 1.4, 0, 1), sq: 0.15 + 0.85 * dying, mob: m, d2: d2(m.x, m.y) });
    }
    for (const b of orbs) sps.push({ x: b.x, y: b.y, img: b.big ? SPR.orbBig : SPR.orb, scale: b.big ? 0.42 : 0.3, z: 0.32, alpha: 1, sq: 1, d2: d2(b.x, b.y) });
    sps.sort((a, b) => b.d2 - a.d2);
    for (const s of sps) {
      const p = project(s.x, s.y);
      if (!p) continue;
      const k = proj / p.depth, size = k * s.scale, hgt = size * s.sq;
      const floorY = hz + k * 0.5;
      const top = floorY - k * s.z - hgt, left = p.sx - size / 2;
      if (left > W || left + size < 0) continue;
      const iw = s.img.width;
      ctx.globalAlpha = s.alpha;
      const c0 = Math.max(0, Math.floor(left / colW)), c1 = Math.min(cols - 1, Math.floor((left + size) / colW));
      for (let c = c0; c <= c1; c++) {
        if (zbuf[c] < p.depth) continue;
        const x0 = c * colW, u = ((x0 - left) / size) * iw;
        ctx.drawImage(s.img, clamp(u, 0, iw - 1), 0, Math.max(1, (colW / size) * iw), s.img.height, x0, top, colW + 0.5, hgt);
      }
      ctx.globalAlpha = 1;
      const m = s.mob;
      if (m && m.hp > 0 && (m.kind === "boss" || m.hp < m.max) && zbuf[clamp(Math.floor(p.sx / colW), 0, cols - 1)] >= p.depth) {
        E.hpBar(p.sx - size / 3, top - 10, (size * 2) / 3, m.hp / m.max, m.kind === "boss" ? C.err : C.pink);
      }
    }
    // restos (partículas en el mundo)
    for (const g of gibs) {
      const p = project(g.x, g.y);
      if (!p) continue;
      const c = Math.floor(p.sx / colW);
      if (c < 0 || c >= cols || zbuf[c] < p.depth) continue;
      const k = proj / p.depth, s = Math.max(1.5, k * g.s);
      ctx.globalAlpha = clamp(g.life * 1.5, 0, 1); ctx.fillStyle = g.color;
      ctx.fillRect(p.sx - s / 2, hz + k * (0.5 - g.z) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawGun() {
    const W = E.W, H = E.H;
    const gs = clamp(Math.min(W * 1.3, H) / 640, 0.6, 1.35);
    const gx = W / 2 + (E.reduce ? 0 : Math.sin(pl.bob * 0.5) * 10);
    const gy = H - 12 + (E.reduce ? 0 : Math.abs(Math.cos(pl.bob * 0.5)) * 8) + pl.kick * 22 * gs + (pl.swap / 0.25) * 220 * gs;
    const w = WEAPONS[wi];
    const tipY = gy - (wi === 1 ? 160 : wi === 2 ? 175 : 140) * gs;
    if (pl.muzzle > 0) {
      const r0 = (wi === 1 ? 80 : wi === 2 ? 38 : 58) * gs;
      const r = ctx.createRadialGradient(gx, tipY, 0, gx, tipY, r0);
      r.addColorStop(0, "#fff"); r.addColorStop(0.3, w.color); r.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(gx, tipY, r0, 0, TAU); ctx.fill();
    }
    ctx.lineWidth = 2; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (wi === 0) {
      // >_ blaster
      ctx.fillStyle = "#111a14"; ctx.strokeStyle = C.fg;
      ctx.beginPath(); ctx.moveTo(gx - 60 * gs, gy); ctx.lineTo(gx - 26 * gs, gy - 130 * gs); ctx.lineTo(gx + 26 * gs, gy - 130 * gs); ctx.lineTo(gx + 60 * gs, gy); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.acc; ctx.font = E.font(14 * gs, true); ctx.fillText(">_", gx, gy - 70 * gs);
      E.glow(C.acc, 12); ctx.fillStyle = C.br; ctx.fillRect(gx - 14 * gs, gy - 140 * gs, 28 * gs, 10 * gs); E.glow(null);
    } else if (wi === 1) {
      // sudo rm -rf: escopeta de dos cañones
      ctx.fillStyle = "#1a140a"; ctx.strokeStyle = C.warn;
      ctx.beginPath(); ctx.moveTo(gx - 70 * gs, gy); ctx.lineTo(gx - 40 * gs, gy - 80 * gs); ctx.lineTo(gx + 40 * gs, gy - 80 * gs); ctx.lineTo(gx + 70 * gs, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const k of [-1, 1]) {
        ctx.fillStyle = "#24262a"; ctx.fillRect(gx + k * 17 * gs - 15 * gs, gy - 160 * gs, 30 * gs, 84 * gs);
        ctx.strokeStyle = "#6b6f78"; ctx.strokeRect(gx + k * 17 * gs - 15 * gs, gy - 160 * gs, 30 * gs, 84 * gs);
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(gx + k * 17 * gs, gy - 160 * gs, 10 * gs, 4 * gs, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C.warn; ctx.font = E.font(11 * gs, true); ctx.fillText("sudo rm -rf", gx, gy - 40 * gs);
    } else {
      // clúster GPU: rifle de plasma con ventilador y bobina
      ctx.fillStyle = "#0b1418"; ctx.strokeStyle = C.cyan;
      ctx.beginPath(); ctx.moveTo(gx - 50 * gs, gy); ctx.lineTo(gx - 22 * gs, gy - 150 * gs); ctx.lineTo(gx + 22 * gs, gy - 150 * gs); ctx.lineTo(gx + 50 * gs, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 6; i++) { const y = gy - (20 + i * 18) * gs, hw = (44 - i * 4.4) * gs; ctx.beginPath(); ctx.moveTo(gx - hw, y); ctx.lineTo(gx + hw, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const fy = gy - 60 * gs, fr = 20 * gs;
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(gx, fy, fr, 0, TAU); ctx.fill(); ctx.stroke();
      for (let b = 0; b < 5; b++) { const a = pl.spin + (b * TAU) / 5; ctx.beginPath(); ctx.moveTo(gx, fy); ctx.lineTo(gx + Math.cos(a) * fr * 0.9, fy + Math.sin(a) * fr * 0.9); ctx.stroke(); }
      E.glow(C.cyan, 12); ctx.fillStyle = C.cyan; ctx.fillRect(gx - 5 * gs, gy - 172 * gs, 10 * gs, 26 * gs); E.glow(null);
      ctx.fillStyle = C.cyan; ctx.font = E.font(10 * gs, true); ctx.fillText("GPU", gx, gy - 110 * gs);
    }
    ctx.textBaseline = "alphabetic";
  }

  function drawHUD() {
    const W = E.W, H = E.H, cx = W / 2, cy = H / 2;
    // mira + marcador de impacto
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
    const gap = 4 + (WEAPONS[wi].spread * proj) * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx - 10 - gap, cy); ctx.lineTo(cx - gap, cy); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + 10, cy);
    ctx.moveTo(cx, cy - 10 - gap); ctx.lineTo(cx, cy - gap); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + 10);
    ctx.stroke();
    if (hitT > 0) {
      ctx.strokeStyle = hitKill ? C.err : "#fff"; ctx.lineWidth = 2.5; ctx.globalAlpha = clamp(hitT / 0.16, 0, 1);
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(cx + sx * 6, cy + sy * 6); ctx.lineTo(cx + sx * 14, cy + sy * 14); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // dirección del daño
    const R = Math.min(W, H) * 0.28;
    for (const d of dmgDirs) {
      let rel = d.a - pl.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const sa = rel - Math.PI / 2;
      ctx.strokeStyle = C.err; ctx.globalAlpha = clamp(d.t, 0, 1) * 0.85; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx, cy, R, sa - 0.28, sa + 0.28); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // textos flotantes
    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.globalAlpha = clamp(p.t * 1.6, 0, 1); ctx.fillStyle = p.color; ctx.font = E.font(p.size, true);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // minimapa
    if (mini) {
      const mw = mini.width, ox = W - mw - 14, oy = W < 640 ? 84 : 56;
      ctx.globalAlpha = 0.9; ctx.drawImage(mini, ox, oy);
      const left = mobs.filter((m) => m.hp > 0).length;
      for (const m of mobs) if (m.hp > 0 && (m.seen || left <= 4) && (m.kind !== "boss" || doorOpen)) { ctx.fillStyle = m.kind === "boss" ? C.err : C.pink; ctx.fillRect(ox + m.x * ms - 2, oy + m.y * ms - 2, 4, 4); }
      for (const p of picks) if (!p.taken && (p.type === "2" || p.type === "3")) { ctx.fillStyle = C.warn; ctx.fillRect(ox + p.x * ms - 1.5, oy + p.y * ms - 1.5, 3, 3); }
      ctx.fillStyle = C.br; ctx.beginPath(); ctx.arc(ox + pl.x * ms, oy + pl.y * ms, 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.br; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox + pl.x * ms, oy + pl.y * ms);
      ctx.lineTo(ox + (pl.x + Math.cos(pl.a) * 1.6) * ms, oy + (pl.y + Math.sin(pl.a) * 1.6) * ms); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // aviso de zona / eventos: píldora negra tipo "dynamic island"
    const msg = banner > 0 ? bannerText : zoneT > 0 ? zoneName : "";
    if (msg) {
      const a = clamp((banner > 0 ? banner : zoneT) * 2, 0, 1);
      ctx.font = E.font(W < 520 ? 11 : 13, true);
      const tw = Math.min(W - 24, ctx.measureText(msg).width + 32), y = W < 640 ? 84 + (mini ? mini.height + 10 : 0) : 86;
      ctx.globalAlpha = a; ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.strokeStyle = banner > 0 ? C.warn : C.dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, y, tw, 28, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = banner > 0 ? C.warn : C.br; ctx.textBaseline = "middle"; ctx.fillText(msg, W / 2, y + 14, tw - 20);
      ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
    }

    // brújula hacia los últimos bugs
    const alive = mobs.filter((m) => m.hp > 0 && (m.kind !== "boss" || doorOpen));
    if (alive.length && alive.length <= 3 && !won) {
      let near = alive[0], nd = Infinity;
      for (const m of alive) { const d = Math.hypot(m.x - pl.x, m.y - pl.y); if (d < nd) { nd = d; near = m; } }
      if (!los(pl.x, pl.y, near.x, near.y) || !project(near.x, near.y)) {
        let rel = Math.atan2(near.y - pl.y, near.x - pl.x) - pl.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const sa = rel - Math.PI / 2, rr = R + 26;
        const ax = cx + Math.cos(sa) * rr, ay = cy + Math.sin(sa) * rr;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(sa); ctx.globalAlpha = 0.55 + Math.sin(E.time * 6) * 0.25;
        ctx.fillStyle = near.kind === "boss" ? C.err : C.pink;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }

    // integridad (abajo a la izquierda) y munición (abajo a la derecha), sobre la línea de ayuda
    const by = H - 44, small = W < 520;
    const bw = Math.min(190, W * 0.3);
    ctx.textAlign = "left"; ctx.font = E.font(small ? 10 : 12, true);
    ctx.fillStyle = pl.hp > 35 ? C.acc : C.err;
    ctx.fillText(`${E.t("INTEGRIDAD", "INTEGRITY")} ${Math.max(0, Math.ceil(pl.hp))}%`, 16, by - 8);
    E.hpBar(16, by, bw, pl.hp / 100, pl.hp > 35 ? C.acc : C.err);
    const w = WEAPONS[wi];
    ctx.textAlign = "right";
    ctx.fillStyle = w.color; ctx.font = E.font(small ? 11 : 13, true);
    ctx.fillText(`[${w.key}] ${w.name}`, W - 16, by - 18);
    // munición: número grande + "/ máx" a la derecha; ranuras 1·2·3 a la izquierda del número
    let ax = W - 16;
    if (w.ammo !== Infinity) {
      ctx.font = E.font(small ? 10 : 12); ctx.fillStyle = "rgba(255,255,255,0.5)";
      const mt = `/ ${w.max}`; ctx.fillText(mt, ax, by + 8); ax -= ctx.measureText(mt).width + 6;
    }
    ctx.font = E.font(small ? 20 : 26, true); ctx.fillStyle = w.ammo === 0 ? C.err : C.br;
    const am = w.ammo === Infinity ? "∞" : `${w.ammo}`;
    ctx.fillText(am, ax, by + 8); ax -= ctx.measureText(am).width + 10;
    for (let i = 2; i >= 0; i--) {
      const sx = ax - 18, sy = by - 2; ax -= 22;
      ctx.globalAlpha = owned[i] ? 1 : 0.25;
      ctx.strokeStyle = i === wi ? WEAPONS[i].color : "rgba(255,255,255,0.4)"; ctx.lineWidth = i === wi ? 2 : 1;
      ctx.strokeRect(sx, sy - 6, 18, 16);
      ctx.fillStyle = i === wi ? WEAPONS[i].color : "rgba(255,255,255,0.6)"; ctx.font = E.font(10, true); ctx.textAlign = "center";
      ctx.fillText(String(i + 1), sx + 9, sy + 6); ctx.textAlign = "right";
    }
    ctx.globalAlpha = 1;

    if (E.coarse) {
      // botón de cambio de arma + guía del joystick
      const b = weaponBtn();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.strokeStyle = w.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = w.color; ctx.font = E.font(16, true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`⇄ ${w.key}`, b.x + b.w / 2, b.y + b.h / 2); ctx.textBaseline = "alphabetic";
      let stick = false;
      for (const tch of E.touches.values()) if (tch.sx < W / 2) {
        stick = true;
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(tch.sx, tch.sy, 50, 0, TAU); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(tch.x, tch.y, 20, 0, TAU); ctx.fill();
      }
      if (!stick) { ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(76, H - 130, 46, 0, TAU); ctx.stroke(); }
    } else if (document.pointerLockElement !== E.cvs && !msg) {
      const tip = E.t("🖱 clic para apuntar con el ratón · arriba/abajo = disparos a la cabeza", "🖱 click to aim with the mouse · up/down = headshots");
      ctx.font = E.font(12); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = Math.min(W - 24, ctx.measureText(tip).width + 28);
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(cx - tw / 2, 86, tw, 26, 13); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText(tip, cx, 99, tw - 16); ctx.textBaseline = "alphabetic";
    }

    if (won > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, H / 2 - 56, W, 112);
      ctx.textAlign = "center"; ctx.fillStyle = C.acc; ctx.font = E.font(Math.min(22, W / 20), true);
      ctx.fillText('git commit -m "fix: everything" ✔', W / 2, H / 2 - 4);
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = E.font(Math.min(13, W / 32));
      ctx.fillText(E.t("kernel estable · tesis a salvo · maestría en curso", "kernel stable · thesis safe · master's in progress"), W / 2, H / 2 + 26);
    }
  }
  const weaponBtn = () => ({ x: E.W - 86, y: E.H - 150, w: 70, h: 46 });

  return {
    look: true,
    resize: fit,
    objective: () => {
      const dead = mobs.filter((m) => m.hp <= 0).length;
      if (!doorOpen) return E.t(`🎯 Bugs eliminados ${dead}/${total}`, `🎯 Bugs wiped ${dead}/${total}`);
      return boss.hp > 0
        ? E.t(`🎯 Derrota a KERNEL PANIC · ${dead}/${total}`, `🎯 Defeat KERNEL PANIC · ${dead}/${total}`)
        : E.t(`🎯 Bugs eliminados ${total}/${total} ✔`, `🎯 Bugs wiped ${total}/${total} ✔`);
    },
    down(x, y, touch) {
      if (touch) {
        const b = weaponBtn();
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { cycle(1); return; }
        if (x > E.W / 2) {
          wantShot = true;
          for (const [id, tch] of E.touches) if (tch.sx === x && tch.sy === y) touchFire = id;
        }
      } else { wantShot = true; mouseHeld = true; }
    },
    up(_x, _y, touch) { if (!touch) mouseHeld = false; },
    key(k, repeat) {
      if (repeat) return;
      if (k === " ") wantShot = true;
      else if (k === "1" || k === "2" || k === "3") switchTo(+k - 1);
    },
    wheel(dir) { cycle(dir); },
    update,
    draw() {
      const hz = horizon();
      drawWorld(hz);
      drawGun();
      drawHUD();
    },
  };
}
