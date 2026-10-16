// 2023 · bd-2.sql — el gran año: breakout con EXACTAMENTE 380 ladrillos (sus 380 commits de 2023).
// Los ladrillos forman un cilindro de base de datos (el ícono clásico, con sus discos curvos) con una
// cámara hueca bajo la tapa y un túnel estrecho desde abajo: si la bola entra, rebota adentro y se
// come los commits sola. Poderes: 🐳 multibola (docker-apps), 🔥 atraviesa, ⚡ láser, ↔ pala ancha,
// 💣 DROP TABLE (explosiones), ⏳ cámara lenta y ♥ rara. Con ≤30 restantes hay ayudas (puntería y más poderes).
import { clamp, rand, TAU, type Engine, type GameMeta, type Scene } from "../engine";

export const meta: GameMeta = {
  name: { es: "BREAKOUT · 380 COMMITS", en: "BREAKOUT · 380 COMMITS" },
  story: {
    es: "El gran año: 380 commits en 29 repos. bd-2 fue el más activo (132), docker-apps la caja DevOps y se-tesis la semilla de la tesis.",
    en: "The big year: 380 commits across 29 repos. bd-2 was the busiest (132), docker-apps the DevOps toolbox and se-tesis the thesis seed.",
  },
  goal: {
    es: "Rompe los 380 bloques de la base de datos: cada uno es un commit de 2023.",
    en: "Break all 380 blocks of the database: each one is a 2023 commit.",
  },
  tip: {
    es: "Mete la bola por el túnel de abajo y deja que rebote adentro · atrapa 🐳🔥⚡💣 · pierdes ♥ si caen todas las bolas",
    en: "Sneak the ball into the tunnel at the bottom and let it bounce inside · catch 🐳🔥⚡💣 · you lose ♥ if every ball falls",
  },
  ctrl: {
    desktop: { es: "ratón · ←/→ · A/D · clic o espacio: lanzar", en: "mouse · ←/→ · A/D · click or space: launch" },
    touch: { es: "arrastra para mover · toca para lanzar", en: "drag to move · tap to launch" },
  },
};

// ── la estructura: cilindro de base de datos en una rejilla ────────────────────
const COLS = 26, ROWS = 19, TOTAL = 380;
const CAP = 3.5; // radio vertical (en filas) de las elipses de tapa y discos

/** celdas: -1 vacío, 0 roto, 1-2 vida. band: 0 tapa, 1-3 discos. rim: borde curvo del disco */
interface Shape { hp: Int8Array; band: Uint8Array; rim: Uint8Array; tough: Uint8Array; hollow: Uint8Array; shade: Float32Array; hash: string[] }

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShape(): Shape {
  const N = COLS * ROWS;
  const s: Shape = {
    hp: new Int8Array(N).fill(-1), band: new Uint8Array(N), rim: new Uint8Array(N), tough: new Uint8Array(N),
    hollow: new Uint8Array(N), shade: new Float32Array(N), hash: new Array<string>(N).fill(""),
  };
  const cx = COLS / 2, a = COLS / 2;
  const arc = (c: number) => { const u = (c + 0.5 - cx) / a; return CAP * Math.sqrt(Math.max(0, 1 - u * u)); };
  const sep = [1, 2].map((k) => CAP + (k * (ROWS - 2 * CAP)) / 3);
  const rng = mulberry(2023);
  const cells: number[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, y = r + 0.5, f = arc(c), dx = Math.abs(c + 0.5 - cx);
    const inside = y >= CAP - f && y <= ROWS - CAP + f;
    if (!inside) continue;
    // cámara bajo la tapa + túnel de 2 celdas desde abajo: la "entrada pequeña"
    const chamber = dx < a - 2.5 && y > CAP + f + 0.5 && y < sep[0] + f - 0.5;
    const tunnel = dx <= 1 && y >= sep[0] + f - 1;
    if (chamber || tunnel) { s.hollow[i] = chamber ? 1 : 2; continue; }
    s.hp[i] = 1;
    s.band[i] = y < CAP + f - 0.5 ? 0 : y < sep[0] + f + 0.5 ? 1 : y < sep[1] + f + 0.5 ? 2 : 3;
    s.rim[i] = Math.abs(y - (CAP + f)) < 0.5 || sep.some((q) => Math.abs(y - (q + f)) < 0.5) ? 1 : 0;
    s.shade[i] = [0.45, 0.6, 0.78, 1][Math.floor(rng() * 4)]; // como el heatmap de contribuciones
    s.hash[i] = Math.floor(rng() * 0xffff).toString(16).padStart(4, "0");
    cells.push(i);
  }
  // seguro: exactamente 380 (la forma ya da 380; si no, recorta desde las esquinas inferiores)
  while (cells.length > TOTAL) { const i = cells.pop()!; s.hp[i] = -1; }
  // "merge conflicts": pocos ladrillos de 2 golpes, lejos del túnel
  let placed = 0;
  while (placed < 18) {
    const i = cells[Math.floor(rng() * cells.length)], c = i % COLS;
    if (s.tough[i] || s.rim[i] || Math.abs(c + 0.5 - cx) < 3) continue;
    s.tough[i] = 1; s.hp[i] = 2; placed++;
  }
  return s;
}

type Kind = "multi" | "fire" | "laser" | "wide" | "bomb" | "slow" | "life";
const POWERS: { k: Kind; w: number; icon: string; es: string; en: string }[] = [
  { k: "multi", w: 30, icon: "🐳", es: "docker ×3", en: "docker ×3" },
  { k: "fire", w: 16, icon: "🔥", es: "--force", en: "--force" },
  { k: "laser", w: 15, icon: "⚡", es: "CI/CD", en: "CI/CD" },
  { k: "wide", w: 15, icon: "↔", es: "scale", en: "scale" },
  { k: "bomb", w: 12, icon: "💣", es: "DROP", en: "DROP" },
  { k: "slow", w: 8, icon: "⏳", es: "slow query", en: "slow query" },
  { k: "life", w: 3, icon: "♥", es: "+1", en: "+1" },
];

interface Ball { x: number; y: number; vx: number; vy: number; stuck: boolean; tx: number[]; ty: number[]; dead: boolean }
interface Drop { x: number; y: number; vy: number; p: (typeof POWERS)[number] }
interface Bolt { x: number; y: number }
interface Pop { x: number; y: number; text: string; t: number; color: string; size: number }

export function create(E: Engine): Scene {
  const { ctx, C } = E;
  const sh = buildShape();
  const TOP = 84; // techo del área de juego (bajo la píldora del objetivo)
  const MAXB = 9; // 3×3 contenedores: suficiente caos sin vaciar el nivel en segundos

  // ── colores ────────────────────────────────────────────────────────────────
  const BAND = [C.cyan, C.fg, C.violet, C.pink];
  const HEAT = ["#0e4429", "#006d32", "#26a641", "#39d353"]; // verdes de GitHub

  // ── geometría (se recalcula en resize; el estado vive en la rejilla) ───────
  let cw = 0, ch = 0, gx = 0, gy = 0, gw = 0, gh = 0, R = 6, padY = 0, padW0 = 120, v0 = 420, S = 1;
  const PH = 12;
  const pad = { x: 0, w: 120 };
  function layout() {
    const W = E.W, H = E.H, playH = H - 40 - TOP;
    gw = Math.min(W - 24, 940);
    cw = gw / COLS;
    ch = Math.min((playH * 0.46) / ROWS, Math.max(cw * 0.55, H > W ? cw * 0.95 : 11)); // en vertical, ladrillos más altos
    gh = ch * ROWS;
    gx = (W - gw) / 2; gy = TOP + clamp(playH * 0.05, 18, 40);
    R = clamp(Math.min(cw, ch) * 0.42, 4.2, 7);
    padY = H - 64; padW0 = clamp(W * 0.15, 88, 160);
    v0 = clamp(playH * 0.66, 380, 540);
    S = E.cvs.width / Math.max(1, E.W);
  }
  layout();
  pad.x = E.W / 2; pad.w = padW0;

  // ── estado ─────────────────────────────────────────────────────────────────
  let remaining = TOTAL, broken = 0, won = false;
  let combo = 0, comboT = 0, lastBeep = 0, frameBursts = 0;
  let fire = 0, laser = 0, wide = 0, slow = 0, bombs = 0, bombT = 0, laserT = 0, dockT = 0, launchT = 2;
  let chamberOpen = false, assistOn = false, time = 0;
  const balls: Ball[] = [], drops: Drop[] = [], bolts: Bolt[] = [], pops: Pop[] = [];
  const flashes: { i: number; t: number }[] = [];
  let banner = { text: "", t: 0, color: C.acc };
  let aliveList: number[] = [], aliveDirty = true;

  const newBall = (): Ball => ({ x: pad.x, y: padY - R - 1, vx: 0, vy: 0, stuck: true, tx: [], ty: [], dead: false });
  function resetBall() {
    balls.length = 0; balls.push(newBall()); launchT = 2;
    fire = laser = slow = bombs = 0; drops.length = 0; bolts.length = 0;
  }
  resetBall();

  // ── lienzos fuera de pantalla: fondo estático + ladrillos (solo se repinta lo que cambia) ──
  const bg = document.createElement("canvas"), bgx = bg.getContext("2d")!;
  const bk = document.createElement("canvas"), bkx = bk.getContext("2d")!;

  function paintCell(i: number) {
    const c = i % COLS, r = (i / COLS) | 0, x = c * cw, y = r * ch;
    bkx.clearRect(x, y, cw, ch);
    const hp = sh.hp[i];
    if (hp <= 0) return;
    const w = cw - 2, h = ch - 2;
    if (sh.tough[i]) {
      // merge conflict: ámbar con rayas; al primer golpe queda rojo y agrietado
      bkx.globalAlpha = 1;
      bkx.fillStyle = hp === 2 ? C.warn : C.err; bkx.fillRect(x + 1, y + 1, w, h);
      bkx.strokeStyle = "rgba(0,0,0,0.45)"; bkx.lineWidth = 1.5; bkx.beginPath();
      for (let k = -h; k < w; k += 7) { bkx.moveTo(x + 1 + Math.max(0, k), y + 1 + Math.max(0, -k)); bkx.lineTo(x + 1 + Math.min(w, k + h), y + 1 + h - Math.max(0, k + h - w)); }
      bkx.stroke();
      if (hp === 1) { bkx.strokeStyle = "#fff"; bkx.lineWidth = 1; bkx.beginPath(); bkx.moveTo(x + w * 0.3, y + 1); bkx.lineTo(x + w * 0.5, y + h * 0.6); bkx.lineTo(x + w * 0.42, y + h + 1); bkx.stroke(); }
    } else {
      const col = BAND[sh.band[i]];
      bkx.fillStyle = "#000"; bkx.fillRect(x + 1, y + 1, w, h);
      bkx.globalAlpha = sh.rim[i] ? 1 : sh.shade[i] * 0.8;
      bkx.fillStyle = col; bkx.fillRect(x + 1, y + 1, w, h);
      bkx.globalAlpha = sh.rim[i] ? 0.55 : 0.25; bkx.fillStyle = "#fff"; bkx.fillRect(x + 1, y + 1, w, Math.max(1, h * 0.18));
      bkx.globalAlpha = 1;
      // hash corto del "commit" cuando cabe
      if (cw >= 28 && ch >= 13) {
        bkx.fillStyle = "rgba(0,0,0,0.6)"; bkx.font = E.font(Math.min(9, ch * 0.6));
        bkx.textAlign = "center"; bkx.textBaseline = "middle";
        bkx.fillText(sh.hash[i], x + cw / 2, y + ch / 2 + 0.5);
      }
    }
    bkx.globalAlpha = 1;
  }

  function renderBricks() {
    bk.width = Math.max(1, Math.ceil(gw * S)); bk.height = Math.max(1, Math.ceil(gh * S));
    bkx.setTransform(S, 0, 0, S, 0, 0);
    for (let i = 0; i < COLS * ROWS; i++) if (sh.hp[i] > 0) paintCell(i);
  }

  function renderBg() {
    const W = E.W, H = E.H;
    bg.width = Math.max(1, Math.ceil(W * S)); bg.height = Math.max(1, Math.ceil(H * S));
    const g = bgx;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.fillStyle = "rgba(3,8,9,0.94)"; g.fillRect(0, 0, W, H);
    // rejilla tenue tipo papel milimetrado de terminal
    g.strokeStyle = "rgba(51,255,102,0.035)"; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x < W; x += 32) { g.moveTo(x, TOP); g.lineTo(x, H); }
    for (let y = TOP; y < H; y += 32) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();

    // heatmap de contribuciones 2023 (380 contribuciones repartidas en 53 semanas)
    const rng = mulberry(380);
    const days = new Uint8Array(53 * 7);
    for (let k = 0; k < TOTAL; k++) {
      // más actividad en feb-jun y sep-nov (semestres)
      let wk = Math.floor(rng() * 53);
      if ((wk < 5 || (wk > 25 && wk < 34) || wk > 48) && rng() < 0.7) wk = 5 + Math.floor(rng() * 20);
      days[wk * 7 + Math.floor(rng() * 7)]++;
    }
    const hs = clamp((W - 40) / 53, 4, 12), hw = hs * 53, hh = hs * 7;
    const hx = (W - hw) / 2, hy = clamp(gy + gh + (padY - gy - gh) * 0.32, gy + gh + 22, padY - hh - 70);
    g.globalAlpha = 0.32;
    for (let wk = 0; wk < 53; wk++) for (let d = 0; d < 7; d++) {
      const n = days[wk * 7 + d];
      g.fillStyle = n === 0 ? "rgba(255,255,255,0.06)" : HEAT[Math.min(3, n - 1)];
      g.fillRect(hx + wk * hs + 1, hy + d * hs + 1, hs - 2, hs - 2);
    }
    g.globalAlpha = 0.38; g.fillStyle = C.fg; g.font = E.font(W < 520 ? 9 : 11); g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.fillText(E.t("380 contribuciones en 2023 · 29 repos", "380 contributions in 2023 · 29 repos"), hx, hy - 6);
    g.textAlign = "left";
    g.fillText("SQL> SELECT count(*) FROM commits WHERE year = 2023;  -- 380", hx, hy + hh + 16);

    // diagrama ER tenue de bd-2 a los lados (si hay espacio)
    const side = gx - 20;
    if (side >= 130) {
      const tw = Math.min(150, side - 16);
      const table = (x: number, y: number, name: string, cols: string[]) => {
        const rh = 14, th = 18 + cols.length * rh;
        g.globalAlpha = 0.28; g.strokeStyle = C.cyan; g.lineWidth = 1; g.strokeRect(x, y, tw, th);
        g.fillStyle = C.cyan; g.fillRect(x, y, tw, 16);
        g.globalAlpha = 0.6; g.fillStyle = "#000"; g.font = E.font(10, true); g.fillText(name, x + 6, y + 12);
        g.globalAlpha = 0.3; g.fillStyle = C.cyan; g.font = E.font(9);
        cols.forEach((c, k) => g.fillText(c, x + 6, y + 30 + k * rh));
        return { x, y, w: tw, h: th };
      };
      const lx = 14, rx = W - 14 - tw;
      const t1 = table(lx, gy + 4, "PROYECTO", ["🔑 id", "nombre", "repo"]);
      const t2 = table(lx, gy + gh * 0.55, "COMMIT", ["🔑 sha", "proyecto_id", "fecha"]);
      const t3 = table(rx, gy + 4, "EQUIPO", ["🔑 id", "integrante", "rol"]);
      const t4 = table(rx, gy + gh * 0.55, "ORACLE_18C", ["🔑 tabla", "django.orm", "angular.api"]);
      g.globalAlpha = 0.25; g.strokeStyle = C.cyan; g.setLineDash([4, 4]); g.beginPath();
      g.moveTo(t1.x + tw / 2, t1.y + t1.h); g.lineTo(t2.x + tw / 2, t2.y);
      g.moveTo(t3.x + tw / 2, t3.y + t3.h); g.lineTo(t4.x + tw / 2, t4.y);
      g.stroke(); g.setLineDash([]);
      // pata de gallo (1:N)
      g.beginPath();
      g.moveTo(t2.x + tw / 2 - 6, t2.y - 1); g.lineTo(t2.x + tw / 2, t2.y - 8); g.lineTo(t2.x + tw / 2 + 6, t2.y - 1);
      g.moveTo(t4.x + tw / 2 - 6, t4.y - 1); g.lineTo(t4.x + tw / 2, t4.y - 8); g.lineTo(t4.x + tw / 2 + 6, t4.y - 1);
      g.stroke();
    }

    // ballena de Docker en pixel art (docker-apps), abajo a la derecha
    const WHALE = [
      "           ##       ",
      "      ## ## ##      ",
      "   ## ## ## ##    # ",
      "   ## ## ## ##   ## ",
      "################### ",
      "################### ",
      " #################  ",
      "  ##############    ",
      "    #########       ",
    ];
    const px = W < 520 ? 2 : 3, wx = W - WHALE[0].length * px - 18, wy = padY - WHALE.length * px - 26;
    g.globalAlpha = 0.16; g.fillStyle = C.cyan;
    WHALE.forEach((row, ry) => { for (let rx2 = 0; rx2 < row.length; rx2++) if (row[rx2] === "#") g.fillRect(wx + rx2 * px, wy + ry * px, px, px); });
    g.globalAlpha = 0.22; g.font = E.font(9); g.textAlign = "right"; g.fillText("docker-apps", W - 18, wy - 6);

    // onda de se-tesis (audio con atractor caótico) al pie
    const wy2 = H - 42;
    g.globalAlpha = 0.16; g.strokeStyle = C.violet; g.lineWidth = 1; g.beginPath();
    let lz = 0.31;
    for (let x = 0; x <= W; x += 2) {
      lz = 3.91 * lz * (1 - lz); // mapa logístico: caos determinista
      const y = wy2 + Math.sin(x * 0.07) * 4 * Math.sin(x * 0.011) + (lz - 0.5) * 7;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 0.22; g.fillStyle = C.violet; g.textAlign = "left"; g.fillText("se-tesis.wav", 14, wy2 - 8);

    // techo y viñeta CRT
    g.globalAlpha = 0.35; g.strokeStyle = C.dim; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(0, TOP); g.lineTo(W, TOP); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  renderBg(); renderBricks();

  // ── utilidades ─────────────────────────────────────────────────────────────
  const cellCx = (i: number) => gx + ((i % COLS) + 0.5) * cw;
  const cellCy = (i: number) => gy + (((i / COLS) | 0) + 0.5) * ch;
  const pop = (x: number, y: number, text: string, color: string, size = 12) => { if (pops.length < 28) pops.push({ x, y, text, t: 0.9, color, size }); };
  const announce = (text: string, color: string = C.acc) => { banner = { text, t: 1.8, color }; };
  const activeBalls = () => balls.filter((b) => !b.stuck && !b.dead).length;
  /** evita trayectorias casi horizontales que nunca vuelven a la pala */
  function fixAngle(b: Ball) {
    const sp = Math.hypot(b.vx, b.vy) || v0, minVy = sp * 0.3;
    if (Math.abs(b.vy) < minVy) {
      b.vy = (b.vy < 0 ? -1 : 1) * minVy;
      b.vx = Math.sign(b.vx || 1) * Math.sqrt(Math.max(0, sp * sp - minVy * minVy));
    }
  }

  function launch() {
    for (const b of balls) if (b.stuck) {
      b.stuck = false;
      // apunta un poco hacia el centro de la base de datos (donde está la entrada)
      const a = clamp(((gx + gw / 2 - pad.x) / E.W) * 0.9 + rand(-0.18, 0.18), -0.55, 0.55);
      b.vx = Math.sin(a) * v0; b.vy = -Math.cos(a) * v0;
      E.sfx.blip();
    }
  }

  function spawnDrop(x: number, y: number, kind?: Kind) {
    if (drops.length >= 5) return;
    let p = POWERS[0];
    if (kind) p = POWERS.find((q) => q.k === kind) ?? p;
    else {
      const pool = POWERS.filter((q) => q.k !== "life" || E.lives() < 3);
      let n = rand(0, pool.reduce((s, q) => s + q.w, 0));
      for (const q of pool) { n -= q.w; if (n <= 0) { p = q; break; } }
    }
    drops.push({ x: clamp(x, 50, E.W - 50), y, vy: 130, p });
  }

  function win() {
    if (won) return;
    won = true;
    for (let k = 0; k < 6; k++) E.burst(gx + rand(0, gw), gy + rand(0, gh), [C.acc, C.cyan, C.warn, C.pink][k % 4], 26, 320, 4);
    E.shake(8);
    announce(E.t("✔ 380/380 · git push origin main", "✔ 380/380 · git push origin main"), C.acc);
    E.clear();
  }

  function destroy(i: number) {
    paintCell(i);
    remaining--; broken++; aliveDirty = true;
    combo++; comboT = 1.4;
    const pts = 10 + Math.min(combo, 60);
    E.addScore(pts);
    const x = cellCx(i), y = cellCy(i);
    // tono que sube con el combo (semitono a semitono, 2 octavas y vuelve a empezar)
    if (time - lastBeep > 0.028) { lastBeep = time; E.beep(Math.min(2400, 392 * Math.pow(2, (combo % 25) / 12)), 18, 0.03); }
    if (frameBursts < 10) { frameBursts++; E.burst(x, y, sh.tough[i] ? C.warn : BAND[sh.band[i]], 7, 170, Math.max(2, ch * 0.18)); }
    if (combo >= 3 && pops.length < 18) pop(x, y, `+${pts}`, combo >= 25 ? C.warn : C.br, 11);
    if (combo === 10 || combo === 25 || combo === 50 || combo === 100 || combo === 150) {
      const label = combo >= 100 ? E.t(`COMBO ×${combo} · ¡OVERFLOW!`, `COMBO ×${combo} · OVERFLOW!`)
        : combo >= 50 ? `COMBO ×${combo} · git push --force` : `COMBO ×${combo}`;
      announce(label, combo >= 25 ? C.warn : C.acc); E.shake(combo >= 50 ? 5 : 3); E.sfx.power();
    }
    if (broken === 100 || broken === 200 || broken === 300) announce(`${broken} commits ✓`, C.cyan);
    if (!assistOn && remaining <= 30) { announce(E.t("⚠ últimos 30 commits: puntería asistida", "⚠ last 30 commits: aim assist on"), C.warn); assistOn = true; }
    // poderes: más frecuentes al final
    const chance = remaining <= 30 ? 0.25 : broken < 40 ? 0.12 : 0.07;
    if (broken === 1) spawnDrop(x, y + ch / 2, "multi"); // el primer commit siempre trae contenedores
    else if (Math.random() < chance) spawnDrop(x, y + ch / 2);
    if (remaining <= 0) win();
  }

  /** daña la celda i; devuelve true si había un ladrillo */
  function damage(i: number, full: boolean): boolean {
    if (sh.hp[i] <= 0) return false;
    sh.hp[i] = full ? 0 : sh.hp[i] - 1;
    if (flashes.length < 40) flashes.push({ i, t: 0.18 });
    if (sh.hp[i] > 0) { paintCell(i); E.beep(180, 30, 0.04); E.burst(cellCx(i), cellCy(i), C.warn, 5, 120, 2); return true; }
    destroy(i);
    return true;
  }

  function explode(i: number) {
    const c0 = i % COLS, r0 = (i / COLS) | 0;
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 2; c <= c0 + 2; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      damage(r * COLS + c, true);
    }
    E.sfx.boom(); E.shake(6);
    E.burst(cellCx(i), cellCy(i), C.pink, 26, 300, 4);
    pop(cellCx(i), cellCy(i), "DROP TABLE", C.pink, 13);
  }

  /** choque bola-ladrillos en el eje dado (la rejilla ES la grilla espacial) */
  function hitGrid(b: Ball): boolean {
    const r = R * 0.9;
    const c0 = Math.floor((b.x - r - gx) / cw), c1 = Math.floor((b.x + r - gx) / cw);
    const r0 = Math.floor((b.y - r - gy) / ch), r1 = Math.floor((b.y + r - gy) / ch);
    if (c1 < 0 || c0 >= COLS || r1 < 0 || r0 >= ROWS) return false;
    let hit = false;
    for (let rr = Math.max(0, r0); rr <= Math.min(ROWS - 1, r1); rr++)
      for (let cc = Math.max(0, c0); cc <= Math.min(COLS - 1, c1); cc++) {
        const i = rr * COLS + cc;
        if (sh.hp[i] <= 0) continue;
        hit = true;
        if (bombs > 0) { bombs--; explode(i); }
        else damage(i, fire > 0);
      }
    return hit;
  }

  function stepBall(b: Ball, h: number) {
    const W = E.W;
    // eje X
    b.x += b.vx * h;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); E.sfx.wall(); }
    else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); E.sfx.wall(); }
    else if (hitGrid(b) && fire <= 0) { b.x -= b.vx * h; b.vx = -b.vx; fixAngle(b); }
    // eje Y
    b.y += b.vy * h;
    if (b.y < TOP + R) { b.y = TOP + R; b.vy = Math.abs(b.vy); E.sfx.wall(); }
    else if (hitGrid(b) && fire <= 0) { b.y -= b.vy * h; b.vy = -b.vy; fixAngle(b); }
    // pala: el ángulo depende de dónde pega
    if (b.vy > 0 && b.y + R >= padY && b.y - R <= padY + PH && Math.abs(b.x - pad.x) <= pad.w / 2 + R) {
      const off = clamp((b.x - pad.x) / (pad.w / 2), -1, 1), ang = off * 1.05;
      const sp = Math.min(v0 * 1.35, Math.hypot(b.vx, b.vy) * 1.012);
      b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; b.y = padY - R;
      E.sfx.blip();
    }
    if (b.y > E.H + R * 2) b.dead = true;
    // ¿entró a la cámara?
    if (!chamberOpen) {
      const cc = Math.floor((b.x - gx) / cw), rr = Math.floor((b.y - gy) / ch);
      if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && sh.hollow[rr * COLS + cc] === 1) {
        chamberOpen = true; E.sfx.power(); E.shake(4);
        announce(E.t("🔓 ACCESO CONCEDIDO · SELECT * FROM bd2", "🔓 ACCESS GRANTED · SELECT * FROM bd2"), C.cyan);
      }
    }
  }

  function applyPower(d: Drop) {
    const p = d.p;
    E.sfx.power();
    E.burst(d.x, padY, C.br, 12, 200, 3);
    pop(d.x, padY - 24, `${p.icon} ${E.t(p.es, p.en)}`, C.warn, 14);
    switch (p.k) {
      case "multi": {
        // docker-apps: cada bola se "replica" como contenedores
        dockT = 0;
        if (activeBalls() === 0) launch();
        const src = balls.filter((b) => !b.stuck && !b.dead);
        for (const s of src) {
          const sp = Math.hypot(s.vx, s.vy) || v0, a = Math.atan2(s.vy, s.vx);
          for (const da of [-0.45, 0.45]) {
            if (balls.length >= MAXB) break;
            const nb: Ball = { x: s.x, y: s.y, vx: Math.cos(a + da) * sp, vy: Math.sin(a + da) * sp, stuck: false, tx: [], ty: [], dead: false };
            fixAngle(nb); balls.push(nb);
          }
        }
        announce("docker compose up --scale ball=3", C.cyan);
        break;
      }
      case "fire": fire = 5; break;
      case "laser": laser = 8; break;
      case "wide": wide = 14; break;
      case "slow": slow = 6; break;
      case "bomb": bombs = 3; bombT = 15; break;
      case "life": E.addLife(); break;
    }
  }

  function rebuildAlive() {
    if (!aliveDirty) return;
    aliveDirty = false; aliveList = [];
    if (remaining > 30) return;
    for (let i = 0; i < COLS * ROWS; i++) if (sh.hp[i] > 0) aliveList.push(i);
  }

  /** ayuda final: la bola gira suavemente hacia el commit vivo más cercano */
  function home(b: Ball, dt: number) {
    if (b.vy >= 0 || !aliveList.length) return;
    let best = -1, bd = Infinity;
    for (const i of aliveList) { const d = (cellCx(i) - b.x) ** 2 + (cellCy(i) - b.y) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    const want = Math.atan2(cellCy(best) - b.y, cellCx(best) - b.x), cur = Math.atan2(b.vy, b.vx);
    let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const na = cur + clamp(da, -1.5 * dt, 1.5 * dt), sp = Math.hypot(b.vx, b.vy);
    b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
  }

  // atajo solo en desarrollo: inspeccionar el estado y dejar N ladrillos para probar el final
  if (import.meta.env.DEV) {
    (window as unknown as { __breakout: object }).__breakout = {
      state: () => ({ remaining, broken, balls: balls.map((b) => ({ x: b.x, y: b.y, vy: b.vy })), drops: drops.map((d) => ({ x: d.x, y: d.y })), padY }),
      leave: (n: number) => { for (let i = 0; i < COLS * ROWS && remaining > n; i++) if (sh.hp[i] > 0) { sh.hp[i] = 0; destroy(i); } },
    };
  }

  // ── escena ─────────────────────────────────────────────────────────────────
  return {
    objective: () => E.t(`🎯 Commits ${broken}/${TOTAL}`, `🎯 Commits ${broken}/${TOTAL}`),
    key(k) { if (k === " " || k === "arrowup" || k === "w") launch(); },
    down() { launch(); },
    resize() {
      // re-mapea todo relativo a la rejilla para no perder el progreso
      const o = { gx, gy, cw, ch, v0 };
      layout();
      const mx = (x: number) => gx + ((x - o.gx) * cw) / o.cw, my = (y: number) => gy + ((y - o.gy) * ch) / o.ch;
      const k = v0 / o.v0;
      for (const b of balls) {
        b.x = clamp(mx(b.x), R, E.W - R); b.y = Math.min(my(b.y), padY - R - 4); b.vx *= k; b.vy *= k; b.tx.length = b.ty.length = 0;
        if (b.stuck) b.y = padY - R - 1;
      }
      for (const d of drops) { d.x = mx(d.x); d.y = Math.min(my(d.y), padY - 20); }
      bolts.length = 0; pops.length = 0;
      pad.x = clamp(mx(pad.x), 0, E.W);
      renderBg(); renderBricks();
    },
    update(dt) {
      time += dt; frameBursts = 0;
      if (won) return;
      // pala
      const targetW = padW0 * (wide > 0 ? 1.6 : 1);
      pad.w += (targetW - pad.w) * Math.min(1, dt * 10);
      if (E.ptr.moved) pad.x = E.ptr.x;
      if (E.key("arrowleft", "a")) pad.x -= 720 * dt;
      if (E.key("arrowright", "d")) pad.x += 720 * dt;
      pad.x = clamp(pad.x, pad.w / 2, E.W - pad.w / 2);

      // temporizadores
      fire = Math.max(0, fire - dt); laser = Math.max(0, laser - dt); wide = Math.max(0, wide - dt);
      slow = Math.max(0, slow - dt);
      if (bombs > 0) { bombT -= dt; if (bombT <= 0) bombs = 0; }
      comboT -= dt; if (comboT <= 0) combo = 0;
      banner.t = Math.max(0, banner.t - dt);

      // bola pegada a la pala: lanzar con clic/espacio o sola tras ~2 s
      if (balls.some((b) => b.stuck)) { launchT -= dt; if (launchT <= 0) launch(); }

      // cron de docker: si pasan 12 s sin multibola y hay pocas bolas, cae una 🐳 garantizada
      const act = activeBalls();
      if (act > 0) dockT += dt;
      if (dockT > 12 && act < 4) { dockT = 0; spawnDrop(gx + gw / 2 + rand(-gw * 0.3, gw * 0.3), gy + gh + 10, "multi"); }

      rebuildAlive();
      const sk = slow > 0 ? 0.6 : 1;
      const stepLen = Math.min(cw, ch) * 0.4;
      for (const b of balls) {
        if (b.stuck) { b.x = pad.x; b.y = padY - R - 1; continue; }
        if (assistOn) home(b, dt);
        const sp = Math.hypot(b.vx, b.vy) * dt * sk;
        const n = Math.max(1, Math.min(40, Math.ceil(sp / stepLen))), h = (dt * sk) / n;
        for (let s = 0; s < n && !b.dead && !won; s++) stepBall(b, h);
        b.tx.push(b.x); b.ty.push(b.y);
        if (b.tx.length > 5) { b.tx.shift(); b.ty.shift(); }
      }
      if (won) return;
      E.filter(balls, (b) => !b.dead);
      if (balls.length === 0) {
        combo = 0;
        E.hurt(); // si no quedan vidas el motor muestra GAME OVER
        resetBall();
        return;
      }

      // láser: con el poder, o siempre (más lento) en los últimos 10 commits
      const autoLaser = remaining <= 10;
      if (laser > 0 || autoLaser) {
        laserT -= dt;
        if (laserT <= 0) {
          laserT = laser > 0 ? 0.2 : 0.45;
          bolts.push({ x: pad.x - pad.w / 2 + 6, y: padY - 4 }, { x: pad.x + pad.w / 2 - 6, y: padY - 4 });
          E.sfx.shoot();
        }
      }
      for (const bo of bolts) {
        const dist = 950 * dt, n = Math.max(1, Math.ceil(dist / (ch * 0.5)));
        for (let s = 0; s < n; s++) {
          bo.y -= dist / n;
          const c = Math.floor((bo.x - gx) / cw), r = Math.floor((bo.y - gy) / ch);
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS && sh.hp[r * COLS + c] > 0) { damage(r * COLS + c, false); bo.y = -99; break; }
          if (bo.y < TOP) { bo.y = -99; break; }
        }
      }
      E.filter(bolts, (bo) => bo.y > 0);

      // poderes cayendo
      for (const d of drops) {
        d.y += d.vy * dt;
        if (d.y + 10 >= padY && d.y - 10 <= padY + PH && Math.abs(d.x - pad.x) <= pad.w / 2 + 16) { applyPower(d); d.y = E.H + 99; }
      }
      E.filter(drops, (d) => d.y < E.H + 20);

      for (const p of pops) { p.t -= dt; p.y -= 34 * dt; }
      E.filter(pops, (p) => p.t > 0);
      for (const f of flashes) f.t -= dt;
      E.filter(flashes, (f) => f.t > 0);
    },
    draw() {
      const W = E.W, H = E.H;
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.drawImage(bk, gx, gy, gw, gh);

      // últimos commits: brillan y laten para que no se escondan
      if (aliveList.length) {
        const a = 0.45 + Math.sin(time * 6) * 0.35;
        ctx.globalAlpha = a; ctx.strokeStyle = C.warn; ctx.lineWidth = 2;
        ctx.beginPath();
        for (const i of aliveList) { const c = i % COLS, r = (i / COLS) | 0; ctx.rect(gx + c * cw, gy + r * ch, cw, ch); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      // destello blanco en los golpes
      ctx.fillStyle = "#fff";
      for (const f of flashes) {
        const c = f.i % COLS, r = (f.i / COLS) | 0, k = f.t / 0.18;
        ctx.globalAlpha = k * 0.85; ctx.fillRect(gx + c * cw + 1 - k * 2, gy + r * ch + 1 - k * 2, cw - 2 + k * 4, ch - 2 + k * 4);
      }
      ctx.globalAlpha = 1;

      // poderes que caen
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const dfs = W < 520 ? 10 : 11;
      for (const d of drops) {
        ctx.font = E.font(dfs, true);
        const label = `${d.p.icon} ${E.t(d.p.es, d.p.en)}`, tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.strokeStyle = d.p.k === "multi" ? C.cyan : d.p.k === "bomb" ? C.pink : C.warn; ctx.lineWidth = 1.5;
        const dx = clamp(d.x, tw / 2 + 2, W - tw / 2 - 2);
        ctx.beginPath(); ctx.roundRect(dx - tw / 2, d.y - 10, tw, 20, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillText(label, dx, d.y + 1);
      }

      // rayos láser
      ctx.fillStyle = C.warn;
      for (const bo of bolts) ctx.fillRect(bo.x - 1.5, bo.y - 9, 3, 12);

      // pala (rama main)
      const px = pad.x - pad.w / 2;
      E.glow(laser > 0 ? C.warn : C.acc, 14);
      ctx.fillStyle = wide > 0 ? C.cyan : C.br;
      ctx.beginPath(); ctx.roundRect(px, padY, pad.w, PH, 4); ctx.fill();
      E.glow(null);
      if (laser > 0 || remaining <= 10) { ctx.fillStyle = C.warn; ctx.fillRect(px + 3, padY - 6, 6, 7); ctx.fillRect(px + pad.w - 9, padY - 6, 6, 7); }
      ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.font = E.font(9, true); ctx.fillText("main", pad.x, padY + PH / 2 + 0.5);

      // bolas con estela
      const ballCol = fire > 0 ? C.warn : bombs > 0 ? C.pink : "#fff";
      for (const b of balls) {
        for (let k = 0; k < b.tx.length - 1; k++) {
          ctx.globalAlpha = ((k + 1) / b.tx.length) * 0.35; ctx.fillStyle = fire > 0 ? C.err : C.acc;
          const s = R * (0.8 + k * 0.15); ctx.fillRect(b.tx[k] - s, b.ty[k] - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;
      if (balls.length <= 6) E.glow(fire > 0 ? C.warn : C.acc, 12);
      ctx.fillStyle = ballCol;
      for (const b of balls) ctx.fillRect(b.x - R, b.y - R, R * 2, R * 2);
      E.glow(null);

      // aviso de lanzamiento
      if (balls.some((b) => b.stuck)) {
        ctx.globalAlpha = 0.55 + Math.sin(time * 6) * 0.3; ctx.fillStyle = C.br; ctx.font = E.font(13, true);
        const msg = E.coarse ? E.t("toca para lanzar", "tap to launch") : E.t("clic / espacio para lanzar", "click / space to launch");
        const mw = ctx.measureText(msg).width / 2 + 8;
        ctx.fillText(msg, clamp(pad.x, mw, W - mw), padY - 34);
        ctx.globalAlpha = 1;
      }

      // puntos flotantes
      for (const p of pops) {
        ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.color; ctx.font = E.font(p.size, true);
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      // anuncio grande
      if (banner.t > 0) {
        const fs = Math.min(22, W / 22);
        ctx.globalAlpha = Math.min(1, banner.t * 2); ctx.font = E.font(fs, true); ctx.fillStyle = banner.color;
        ctx.fillText(banner.text, W / 2, gy + gh + 26 - (1.8 - banner.t) * 8);
        ctx.globalAlpha = 1;
      }

      // combo (arriba izquierda) y poderes activos (arriba derecha), a la altura del objetivo
      const by = 64;
      ctx.textBaseline = "alphabetic";
      if (combo >= 2) {
        ctx.textAlign = "left"; ctx.font = E.font(W < 520 ? 12 : combo >= 25 ? 16 : 14, true); ctx.fillStyle = combo >= 25 ? C.warn : C.acc;
        ctx.fillText(`COMBO ×${combo}`, 14, by);
        E.hpBar(14, by + 5, W < 520 ? 70 : 90, comboT / 1.4, combo >= 25 ? C.warn : C.acc);
      }
      const act: [string, number, number, string][] = [];
      if (fire > 0) act.push(["🔥", fire, 5, C.warn]);
      if (laser > 0) act.push(["⚡", laser, 8, C.warn]);
      if (wide > 0) act.push(["↔", wide, 14, C.cyan]);
      if (slow > 0) act.push(["⏳", slow, 6, C.violet]);
      if (bombs > 0) act.push([`💣${bombs}`, bombT, 15, C.pink]);
      ctx.textAlign = "right"; ctx.font = E.font(13, true);
      const perRow = W < 520 ? 2 : 5; // en móvil no invade la píldora del objetivo
      act.forEach(([ic, v, mx, col], k) => {
        const x = W - 14 - (k % perRow) * 56, y = by + Math.floor(k / perRow) * 22;
        ctx.fillStyle = col; ctx.fillText(ic, x, y);
        E.hpBar(x - 46, y + 5, 46, v / mx, col);
      });
    },
  };
}
