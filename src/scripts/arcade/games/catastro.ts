// 2022 · catastro.exe — el año "callado" en la Agencia Catastral de Cundinamarca (ACC).
// Xonix/Qix catastral: el topógrafo sale del borde registrado, traza un lindero por terreno sin
// registrar y, al volver a tierra registrada, las zonas cerradas sin invasores se vuelven predios.
// Rejilla fija de celdas (sobrevive a resize); terreno y predios se pintan en lienzos fuera de pantalla
// y solo se repintan cuando cambia el catastro.
import { clamp, rand, TAU, type Engine, type GameMeta, type Scene } from "../engine";

export const meta: GameMeta = {
  name: { es: "CATASTRO", en: "CADASTRE" },
  story: {
    es: "En GitHub, 41 commits. En la Agencia Catastral de Cundinamarca, su primer empleo serio: un territorio entero por registrar.",
    en: "On GitHub, 41 commits. At the Cundinamarca Cadastral Agency, his first serious job: a whole territory to register.",
  },
  goal: {
    es: "Registra el 70% del territorio: sal del borde, traza un lindero y ciérralo volviendo a tierra registrada.",
    en: "Register 70% of the territory: leave the border, draw a boundary line and close it by returning to registered land.",
  },
  tip: {
    es: "Las zonas cerradas sin invasores se vuelven predios · pierdes ♥ si un invasor toca al topógrafo o al lindero abierto",
    en: "Enclosed areas with no invaders become parcels · you lose ♥ if an invader touches the surveyor or the open line",
  },
  ctrl: {
    desktop: { es: "flechas / WASD · o mantén el clic hacia donde ir", en: "arrows / WASD · or hold click where to go" },
    touch: { es: "mantén el dedo hacia donde caminar", en: "hold your finger where to walk" },
  },
};

const SEA = 0, LAND = 1, TRAIL = 2; // estado de cada celda
const ROAD = 0; // id de "predio" para el perímetro y los linderos cerrados (vías)
const GOAL = 70;
const M2 = 625; // cada celda = 25 m × 25 m
// plumillas de plotter para los predios
const PENS = ["#e8b34b", "#4fd1a5", "#e86fa0", "#9b86f0", "#4cc3e6", "#b4dd5a"];
// municipios reales de Cundinamarca (código DANE 25-xxx)
const MUNIS: [string, string][] = [
  ["175", "CHÍA"], ["899", "ZIPAQUIRÁ"], ["754", "SOACHA"], ["290", "FUSAGASUGÁ"], ["269", "FACATATIVÁ"],
  ["214", "COTA"], ["286", "FUNZA"], ["473", "MOSQUERA"], ["430", "MADRID"], ["126", "CAJICÁ"],
];

interface Parcel { id: number; code: string; cells: number; pen: number; lx: number; ly: number; r: number }
interface Bug { x: number; y: number; vx: number; vy: number; land: boolean; ph: number }
interface Pop { x: number; y: number; txt: string; t: number; col: string }

export function create(E: Engine): Scene {
  const { ctx, C } = E;
  const t = E.t;

  // ── layout: la rejilla se decide una vez; en resize solo cambian tamaño de celda y origen ──
  let wide = false, rx = 0, ry = 0, rw = 0, rh = 0, cs = 10, ox = 0, oy = 0, pad = 14;
  let panelX = 0;
  function region() {
    wide = E.W >= 900 && E.H >= 520;
    const top = 86, bottom = E.H - 40;
    pad = wide ? 16 : 13;
    if (wide) { panelX = E.W - 16 - 232; rx = 16; ry = top; rw = panelX - 12 - rx; rh = bottom - top; }
    else { rx = 8; ry = top; rw = E.W - 16; rh = bottom - top - 60; }
  }
  region();
  const target = wide ? 10 : 11;
  const cols = clamp(Math.floor((rw - pad * 2) / target), 28, 120);
  const rows = clamp(Math.floor((rh - pad * 2) / target), 28, 80);
  const N = cols * rows;
  function layout() {
    region();
    cs = Math.max(2, Math.min((rw - pad * 2) / cols, (rh - pad * 2) / rows));
    ox = rx + (rw - cols * cs) / 2; oy = ry + (rh - rows * cs) / 2;
  }
  layout();

  const grid = new Uint8Array(N);
  const pid = new Int16Array(N).fill(-1);
  const BORDER = 2; // grosor del perímetro registrado inicial
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x < BORDER || y < BORDER || x >= cols - BORDER || y >= rows - BORDER) { grid[y * cols + x] = LAND; pid[y * cols + x] = ROAD; }
  }
  const interior = (cols - BORDER * 2) * (rows - BORDER * 2);
  let claimed = 0; // celdas registradas fuera del perímetro inicial
  const pct = () => Math.floor((claimed / interior) * 100);

  const [muniCode, muniName] = MUNIS[Math.floor(Math.random() * MUNIS.length)];
  const parcels: Parcel[] = [];
  const log: string[] = [];
  const pops: Pop[] = [];

  // ── topógrafo ───────────────────────────────────────────────────────────────
  const pl = { x: Math.floor(cols / 2), y: rows - 1, px: Math.floor(cols / 2), py: rows - 1, acc: 0, moving: false, inv: 0, dx: 0, dy: -1 };
  const speed = clamp(Math.min(cols, rows) / 3.2, 12, 20); // celdas por segundo
  const trail: number[] = [];
  let trailStart = -1;
  let lastKey = "";
  let touched = false, hintT = 0, won = false, wonAt = 0;

  // ── invasores (rebotan en terreno sin registrar) y un patrullero en tierra registrada ──
  const bugs: Bug[] = [];
  function spawnBug(land: boolean) {
    for (let tries = 0; tries < 400; tries++) {
      const x = land ? (Math.random() < 0.5 ? 0 : cols - 1) : Math.floor(rand(BORDER + 3, cols - BORDER - 3));
      const y = land ? 0 : Math.floor(rand(BORDER + 3, rows * 0.6));
      const i = y * cols + x;
      if (land ? grid[i] !== LAND : grid[i] !== SEA) continue;
      if (Math.abs(x - pl.x) + Math.abs(y - pl.y) < 10) continue;
      const a = (Math.floor(Math.random() * 4) * Math.PI) / 2 + rand(0.5, 1.07);
      bugs.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a), vy: Math.sin(a), land, ph: Math.random() * TAU });
      return;
    }
  }
  spawnBug(false); spawnBug(false);
  let spawned3 = false, spawnedLand = false, bonus = false;
  const bugSpeed = () => clamp(Math.min(cols, rows) / 7.5, 5.5, 8.5) * (1 + (pct() / 100) * 0.3);

  // ── lienzos fuera de pantalla ───────────────────────────────────────────────
  // terreno: imagen de baja resolución (3 px por celda) con ortofoto difuminada, curvas de nivel y río
  const TR = 3;
  const terrain = document.createElement("canvas");
  terrain.width = cols * TR; terrain.height = rows * TR;
  paintTerrain();
  const stat = document.createElement("canvas"); // terreno escalado + marco + coordenadas
  const land = document.createElement("canvas"); // predios registrados
  const mask = document.createElement("canvas"); // celdas recién registradas (animación)
  mask.width = cols; mask.height = rows;
  let claimAt = -9, maskBox = { x0: 0, y0: 0, x1: 0, y1: 0 }, maskCol = PENS[0];
  let sc = 1;

  function paintTerrain() {
    const g = terrain.getContext("2d")!;
    const tw = terrain.width, th = terrain.height;
    const img = g.createImageData(tw, th);
    const d = img.data;
    const hills = Array.from({ length: 8 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.08, 0.22), a: rand(-1, 1.2) }));
    const p1 = Math.random() * TAU, p2 = Math.random() * TAU, rp = Math.random() * TAU;
    const asp = tw / th;
    const H = new Float32Array(tw * th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const u = x / tw, v = y / th;
      let h = Math.sin(u * 7 + p1) * Math.sin(v * 5 + p2) * 0.25 + Math.sin(u * 23 + v * 9 + p2) * Math.cos(v * 19 - u * 6 + p1) * 0.07;
      for (const k of hills) { const dx = (u - k.x) * asp, dy = v - k.y; h += k.a * Math.exp(-(dx * dx + dy * dy) / (k.s * k.s)); }
      H[y * tw + x] = h;
    }
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const ramp = [[4, 13, 9], [6, 20, 12], [10, 27, 16], [16, 33, 19], [25, 37, 20], [34, 39, 22]];
    const LV = 9; // curvas por unidad de altura
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const i = y * tw + x, h = H[i], o = i * 4;
      const u = x / tw;
      // río: diagonal sinuosa
      const rv = 0.18 + u * 0.62 + Math.sin(u * 8 + rp) * 0.07;
      const dr = Math.abs(y / th - rv) * th;
      const rwid = 1.6 + u * 1.8;
      const b = BAYER[(y & 3) * 4 + (x & 3)] / 16;
      let c: number[];
      if (dr < rwid || h < -0.55) {
        c = (Math.sin(x * 0.9 + y * 0.4) > 0.6 && b > 0.5) ? [26, 92, 118] : b > 0.35 ? [12, 44, 62] : [8, 33, 48];
        if (dr >= rwid - 0.8 && dr < rwid && h >= -0.55) c = [26, 92, 118];
      } else {
        const f = clamp((h + 0.7) / 1.9, 0, 0.999) * (ramp.length - 1);
        const k = Math.floor(f);
        c = ramp[(f - k) > b ? Math.min(k + 1, ramp.length - 1) : k];
        const lv = Math.floor(h * LV);
        const edge = (x + 1 < tw && Math.floor(H[i + 1] * LV) !== lv) || (y + 1 < th && Math.floor(H[i + tw] * LV) !== lv);
        if (edge) c = lv % 5 === 0 ? [104, 82, 38] : [32, 64, 38];
        else if (((x * 7919 + y * 104729) % 97) === 0) c = [30, 62, 36]; // vegetación suelta
      }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const east = (x: number) => 1_000_000 + 32_000 + x * 25; // MAGNA-SIRGAS origen Bogotá (falso E/N 1.000.000)
  const north = (y: number) => 1_018_000 + (rows - y) * 25;

  function paintStatic() {
    sc = E.cvs.width / E.W;
    stat.width = Math.max(1, Math.round(rw * sc)); stat.height = Math.max(1, Math.round(rh * sc));
    const g = stat.getContext("2d")!;
    g.setTransform(sc, 0, 0, sc, -rx * sc, -ry * sc);
    g.fillStyle = "#010604"; g.fillRect(rx, ry, rw, rh);
    g.imageSmoothingEnabled = false;
    g.drawImage(terrain, ox, oy, cols * cs, rows * cs);
    // retícula de coordenadas: cruces cada 10 celdas
    g.strokeStyle = "rgba(170,255,200,0.28)"; g.lineWidth = 1;
    g.beginPath();
    for (let x = 10; x < cols; x += 10) for (let y = 10; y < rows; y += 10) {
      const X = ox + x * cs, Y = oy + y * cs;
      g.moveTo(X - 4, Y); g.lineTo(X + 4, Y); g.moveTo(X, Y - 4); g.lineTo(X, Y + 4);
    }
    g.stroke();
    // marco doble de plano
    g.strokeStyle = C.dim; g.lineWidth = 1;
    g.strokeRect(ox - 0.5, oy - 0.5, cols * cs + 1, rows * cs + 1);
    g.strokeRect(ox - pad + 3.5, oy - pad + 3.5, cols * cs + pad * 2 - 7, rows * cs + pad * 2 - 7);
    // marcas y rótulos de coordenadas
    g.fillStyle = "rgba(170,255,200,0.55)"; g.font = E.font(wide ? 8 : 7); g.textBaseline = "middle";
    g.beginPath();
    const step = 10, every = cs * 20 > 120 ? 20 : 40;
    for (let x = 0; x <= cols; x += step) {
      const X = ox + x * cs;
      g.moveTo(X, oy - 4); g.lineTo(X, oy); g.moveTo(X, oy + rows * cs); g.lineTo(X, oy + rows * cs + 4);
      if (x % every === 0 && x > 0 && x < cols - 4) { g.textAlign = "center"; g.fillText(`${fmt(east(x))} E`, X, oy - pad / 2 - 1); }
    }
    for (let y = 0; y <= rows; y += step) {
      const Y = oy + y * cs;
      g.moveTo(ox - 4, Y); g.lineTo(ox, Y); g.moveTo(ox + cols * cs, Y); g.lineTo(ox + cols * cs + 4, Y);
      if (y % every === 0 && y > 0 && y < rows - 4) {
        g.save(); g.translate(ox - pad / 2 - 1, Y); g.rotate(-Math.PI / 2); g.textAlign = "center";
        g.fillText(`${fmt(north(y))} N`, 0, 0); g.restore();
      }
    }
    g.strokeStyle = "rgba(170,255,200,0.55)"; g.stroke();
    g.textBaseline = "alphabetic";
  }

  /** hachurado tipo plotter (un patrón por plumilla y estilo) */
  const patCache = new Map<string, CanvasPattern | null>();
  function hatch(g: CanvasRenderingContext2D, pen: number, style: number): CanvasPattern | null {
    const key = `${pen}:${style}:${sc}`;
    if (patCache.has(key)) return patCache.get(key)!;
    const s = 8, p = Math.max(1, Math.round(sc));
    const c = document.createElement("canvas"); c.width = c.height = s * p;
    const h = c.getContext("2d")!;
    h.scale(p, p); h.strokeStyle = PENS[pen]; h.globalAlpha = 0.55; h.lineWidth = 0.8; h.fillStyle = PENS[pen];
    h.beginPath();
    if (style === 0 || style === 2) { h.moveTo(-1, s + 1); h.lineTo(s + 1, -1); h.moveTo(-1, 1); h.lineTo(1, -1); h.moveTo(s - 1, s + 1); h.lineTo(s + 1, s - 1); }
    if (style === 1 || style === 2) { h.moveTo(-1, -1); h.lineTo(s + 1, s + 1); h.moveTo(s - 1, -1); h.lineTo(s + 1, 1); h.moveTo(-1, s - 1); h.lineTo(1, s + 1); }
    h.stroke();
    if (style === 3) { h.globalAlpha = 0.55; h.fillRect(1.5, 1.5, 1.4, 1.4); h.fillRect(5.5, 5.5, 1.4, 1.4); }
    const pat = g.createPattern(c, "repeat");
    pat?.setTransform?.(new DOMMatrix().scale(1 / p));
    patCache.set(key, pat);
    return pat;
  }

  function paintLand() {
    sc = E.cvs.width / E.W;
    const w = Math.max(1, Math.round(cols * cs * sc)), h = Math.max(1, Math.round(rows * cs * sc));
    if (land.width !== w || land.height !== h) { land.width = w; land.height = h; }
    const g = land.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    const all = new Path2D(), roads = new Path2D();
    const per = new Map<number, Path2D>();
    for (let y = 0; y < rows; y++) {
      let x = 0;
      while (x < cols) {
        const i = y * cols + x;
        if (grid[i] !== LAND) { x++; continue; }
        const id = pid[i], x0 = x;
        while (x < cols && grid[y * cols + x] === LAND && pid[y * cols + x] === id) x++;
        const r: [number, number, number, number] = [x0 * cs, y * cs, (x - x0) * cs, cs];
        all.rect(...r);
        if (id === ROAD) roads.rect(...r);
        else { let p = per.get(id); if (!p) { p = new Path2D(); per.set(id, p); } p.rect(...r); }
      }
    }
    g.fillStyle = "#06110b"; g.fill(all);
    g.fillStyle = "#18241d"; g.fill(roads);
    for (const pc of parcels) {
      const p = per.get(pc.id); if (!p) continue;
      g.globalAlpha = 0.24; g.fillStyle = PENS[pc.pen]; g.fill(p); g.globalAlpha = 1;
      const pat = hatch(g, pc.pen, pc.id % 4);
      if (pat) { g.fillStyle = pat; g.fill(p); }
    }
    // linderos: aristas entre celdas de distinto predio (y contra lo no registrado)
    const idAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return -9;
      const i = y * cols + x;
      return grid[i] === LAND ? pid[i] : -1;
    };
    const edges = new Path2D(), coast = new Path2D();
    for (let y = 0; y <= rows; y++) { // aristas horizontales
      let run = -1, isCoast = false;
      for (let x = 0; x <= cols; x++) {
        const a = idAt(x, y - 1), b = idAt(x, y);
        const on = x < cols && a !== b && a !== -9 && b !== -9 && (a >= 0 || b >= 0);
        const cst = on && (a === -1 || b === -1);
        if (run >= 0 && (!on || cst !== isCoast)) { const P = isCoast ? coast : edges; P.moveTo(run * cs, y * cs); P.lineTo(x * cs, y * cs); run = -1; }
        if (on && run < 0) { run = x; isCoast = cst; }
      }
    }
    for (let x = 0; x <= cols; x++) { // aristas verticales
      let run = -1, isCoast = false;
      for (let y = 0; y <= rows; y++) {
        const a = idAt(x - 1, y), b = idAt(x, y);
        const on = y < rows && a !== b && a !== -9 && b !== -9 && (a >= 0 || b >= 0);
        const cst = on && (a === -1 || b === -1);
        if (run >= 0 && (!on || cst !== isCoast)) { const P = isCoast ? coast : edges; P.moveTo(x * cs, run * cs); P.lineTo(x * cs, y * cs); run = -1; }
        if (on && run < 0) { run = y; isCoast = cst; }
      }
    }
    g.lineWidth = 1; g.strokeStyle = "rgba(225,255,235,0.55)"; g.stroke(edges);
    g.lineWidth = 1.4; g.strokeStyle = C.fg; g.stroke(coast);
    // códigos prediales
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    for (const pc of parcels) {
      const diam = pc.r * 2 * cs;
      const X = pc.lx * cs, Y = pc.ly * cs;
      const fs = clamp(cs * 0.9, 8, 10);
      g.font = E.font(fs, true);
      const full = g.measureText(pc.code).width;
      g.lineWidth = 3; g.strokeStyle = "#020a06"; g.fillStyle = PENS[pc.pen];
      if (diam >= full + 8 && pc.r * cs >= fs * 1.4) {
        g.strokeText(pc.code, X, Y - fs * 0.55); g.fillText(pc.code, X, Y - fs * 0.55);
        const ha = `${((pc.cells * M2) / 10_000).toFixed(2).replace(".", ",")} ha`;
        g.font = E.font(fs - 1); g.fillStyle = "rgba(230,255,240,0.75)";
        g.strokeText(ha, X, Y + fs * 0.65); g.fillText(ha, X, Y + fs * 0.65);
      } else if (diam >= fs * 3) {
        const short = pc.code.slice(-4);
        g.strokeText(short, X, Y); g.fillText(short, X, Y);
      }
    }
    g.textBaseline = "alphabetic";
  }

  function rebuild() { layout(); paintStatic(); paintLand(); }
  rebuild();

  // ── registro (cierre del lindero) ───────────────────────────────────────────
  function closeTrail() {
    for (const c of trail) { grid[c] = LAND; pid[c] = ROAD; }
    claimed += trail.length;
    const lindero = trail.length;
    trail.length = 0; trailStart = -1;
    // relleno desde cada invasor: lo que alcanzan sigue sin registrar
    const seen = new Uint8Array(N);
    const st: number[] = [];
    for (const b of bugs) {
      if (b.land) continue;
      let i = Math.floor(b.y) * cols + Math.floor(b.x);
      if (grid[i] !== SEA) { // por si quedó justo encima del lindero
        const nb = [i - 1, i + 1, i - cols, i + cols].find((j) => j >= 0 && j < N && grid[j] === SEA);
        if (nb === undefined) continue; i = nb;
      }
      if (!seen[i]) { seen[i] = 1; st.push(i); }
    }
    while (st.length) {
      const i = st.pop()!, x = i % cols;
      if (x > 0 && grid[i - 1] === SEA && !seen[i - 1]) { seen[i - 1] = 1; st.push(i - 1); }
      if (x < cols - 1 && grid[i + 1] === SEA && !seen[i + 1]) { seen[i + 1] = 1; st.push(i + 1); }
      if (i >= cols && grid[i - cols] === SEA && !seen[i - cols]) { seen[i - cols] = 1; st.push(i - cols); }
      if (i + cols < N && grid[i + cols] === SEA && !seen[i + cols]) { seen[i + cols] = 1; st.push(i + cols); }
    }
    // cada componente cerrada es un predio nuevo
    const mg = mask.getContext("2d")!;
    mg.clearRect(0, 0, cols, rows); mg.fillStyle = "#fff";
    let total = 0, bx0 = cols, by0 = rows, bx1 = 0, by1 = 0;
    const fresh: Parcel[] = [];
    for (let s = 0; s < N; s++) {
      if (grid[s] !== SEA || seen[s]) continue;
      const cells: number[] = [s]; seen[s] = 2;
      for (let k = 0; k < cells.length; k++) {
        const i = cells[k], x = i % cols;
        const nb = [x > 0 ? i - 1 : -1, x < cols - 1 ? i + 1 : -1, i - cols, i + cols];
        for (const j of nb) if (j >= 0 && j < N && grid[j] === SEA && !seen[j]) { seen[j] = 2; cells.push(j); }
      }
      const id = parcels.length + 1;
      let x0 = cols, y0 = rows, x1 = 0, y1 = 0;
      for (const i of cells) {
        grid[i] = LAND; pid[i] = id;
        const x = i % cols, y = (i / cols) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        mg.fillRect(x, y, 1, 1);
      }
      // punto de rótulo: centro del mayor círculo inscrito (distancia chamfer dentro de la caja)
      const bw = x1 - x0 + 3, bh = y1 - y0 + 3;
      const dist = new Float32Array(bw * bh);
      for (const i of cells) dist[((i / cols | 0) - y0 + 1) * bw + (i % cols) - x0 + 1] = 1e9;
      for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) {
        const k = y * bw + x; if (!dist[k]) continue;
        dist[k] = Math.min(dist[k], dist[k - 1] + 1, dist[k - bw] + 1, dist[k - bw - 1] + 1.41, dist[k - bw + 1] + 1.41);
      }
      let best = 0, bk = 0;
      for (let y = bh - 2; y >= 1; y--) for (let x = bw - 2; x >= 1; x--) {
        const k = y * bw + x; if (!dist[k]) continue;
        dist[k] = Math.min(dist[k], dist[k + 1] + 1, dist[k + bw] + 1, dist[k + bw + 1] + 1.41, dist[k + bw - 1] + 1.41);
        if (dist[k] > best) { best = dist[k]; bk = k; }
      }
      const pc: Parcel = {
        id, cells: cells.length, pen: (id * 5) % PENS.length,
        code: `25-${muniCode}-01-${String(id).padStart(4, "0")}`,
        lx: (bk % bw) + x0 - 1 + 0.5, ly: ((bk / bw) | 0) + y0 - 1 + 0.5, r: best,
      };
      parcels.push(pc); fresh.push(pc);
      total += cells.length;
      bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, x1); by1 = Math.max(by1, y1);
    }
    claimed += total;
    // resultado: sonido, partículas, bitácora ili2pg
    const all = total + lindero;
    E.addScore(Math.round(all * 1.5) + (total > interior * 0.1 ? 250 : 0));
    if (fresh.length) {
      fresh.sort((a, b) => b.cells - a.cells);
      const big = fresh[0];
      maskCol = PENS[big.pen]; claimAt = E.time;
      maskBox = { x0: bx0, y0: by0, x1: bx1 + 1, y1: by1 + 1 };
      mg.globalCompositeOperation = "source-in"; mg.fillStyle = maskCol; mg.fillRect(0, 0, cols, rows); mg.globalCompositeOperation = "source-over";
      const X = ox + big.lx * cs, Y = oy + big.ly * cs;
      E.burst(X, Y, maskCol, total > interior * 0.08 ? 36 : 16, 240, 3);
      E.sfx.point();
      if (total > interior * 0.12) { E.shake(4); setTimeout(() => E.sfx.power(), 120); }
      const ha = ((total * M2) / 10_000).toFixed(2).replace(".", ",");
      pops.push({ x: X, y: Y, txt: `+${ha} ha`, t: 1.4, col: maskCol });
      for (const pc of fresh.slice(0, 2)) log.push(`ili2pg --import ${pc.code} ✓`);
      if (fresh.length > 2) log.push(t(`… +${fresh.length - 2} predios más`, `… +${fresh.length - 2} more parcels`));
    } else {
      E.beep(520, 30, 0.03);
      log.push(t(`vía registrada: ${lindero * 25} m`, `road registered: ${lindero * 25} m`));
    }
    while (log.length > 6) log.shift();
    paintLand();
    // un invasor que quedó atrapado en tierra (caso raro) reaparece en terreno libre
    const stuck = bugs.filter((b) => !b.land && grid[Math.floor(b.y) * cols + Math.floor(b.x)] !== SEA).length;
    if (stuck) { E.filter(bugs, (b) => b.land || grid[Math.floor(b.y) * cols + Math.floor(b.x)] === SEA); for (let k = 0; k < stuck; k++) spawnBug(false); }
    // dificultad progresiva
    const p = pct();
    if (p >= 30 && !spawned3) { spawned3 = true; spawnBug(false); }
    if (p >= 50 && !bonus) { bonus = true; E.addLife(); E.sfx.power(); log.push(t("♥ +1 vida: mitad del plano", "♥ +1 life: halfway there")); }
    if (p >= 50 && !spawnedLand) { spawnedLand = true; spawnBug(true); log.push(t("⚠ bug de sincronía en las vías", "⚠ sync bug loose on the roads")); }
    if (p >= GOAL && !won) {
      won = true; wonAt = E.time;
      log.push(t("✓ plano aprobado · exportando XTF…", "✓ map approved · exporting XTF…"));
      for (let k = 0; k < 5; k++) E.burst(rand(ox, ox + cols * cs), rand(oy, oy + rows * cs), PENS[k % PENS.length], 24, 280, 3);
      E.clear();
    }
  }

  function lose() {
    if (pl.inv > 0 || won) return;
    E.burst(ox + (pl.x + 0.5) * cs, oy + (pl.y + 0.5) * cs, C.err, 22, 240, 3);
    E.hurt();
    for (const c of trail) grid[c] = SEA;
    trail.length = 0;
    if (trailStart >= 0) { pl.x = pl.px = trailStart % cols; pl.y = pl.py = (trailStart / cols) | 0; }
    trailStart = -1; pl.acc = 0; pl.inv = 1.6;
    log.push(t("✗ lindero invadido: trazo borrado", "✗ boundary invaded: line erased"));
    while (log.length > 6) log.shift();
  }

  // ── movimiento ──────────────────────────────────────────────────────────────
  const DIRS: Record<string, [number, number]> = {
    arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  };
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && grid[y * cols + x] !== TRAIL;
  function wanted(): [number, number] | null {
    if (lastKey && E.keys.has(lastKey)) return DIRS[lastKey];
    for (const k in DIRS) if (E.keys.has(k)) return DIRS[k];
    if (E.ptr.down) {
      const tx = Math.floor((E.ptr.x - ox) / cs), ty = Math.floor((E.ptr.y - oy) / cs);
      const dx = tx - pl.x, dy = ty - pl.y;
      if (!dx && !dy) return null;
      const h: [number, number] = [Math.sign(dx), 0], v: [number, number] = [0, Math.sign(dy)];
      const first = Math.abs(dx) >= Math.abs(dy) ? h : v, second = first === h ? v : h;
      if ((first[0] || first[1]) && free(pl.x + first[0], pl.y + first[1])) return first;
      if ((second[0] || second[1]) && free(pl.x + second[0], pl.y + second[1])) return second;
      return null;
    }
    return null;
  }
  function step(dx: number, dy: number): boolean {
    const nx = pl.x + dx, ny = pl.y + dy;
    if (!free(nx, ny)) return false;
    const from = pl.y * cols + pl.x, i = ny * cols + nx;
    pl.px = pl.x; pl.py = pl.y; pl.x = nx; pl.y = ny; pl.dx = dx; pl.dy = dy;
    if (grid[i] === SEA) {
      if (!trail.length) trailStart = from;
      grid[i] = TRAIL; trail.push(i);
      if (trail.length % 4 === 1) E.beep(380 + Math.min(trail.length, 60) * 6, 8, 0.012);
    } else if (trail.length) closeTrail();
    return true;
  }

  function moveBug(b: Bug, dt: number) {
    const sp = (b.land ? 0.6 : 1) * bugSpeed() * dt;
    const R = 0.42;
    // un invasor rebota contra lo registrado; el patrullero, contra lo no registrado
    const blocked = (x: number, y: number) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
      const g = grid[cy * cols + cx];
      return b.land ? g !== LAND : g === LAND;
    };
    const nx = b.x + b.vx * sp;
    if (blocked(nx + Math.sign(b.vx) * R, b.y)) b.vx = -b.vx; else b.x = nx;
    const ny = b.y + b.vy * sp;
    if (blocked(b.x, ny + Math.sign(b.vy) * R)) b.vy = -b.vy; else b.y = ny;
    if (blocked(b.x + Math.sign(b.vx) * R, b.y + Math.sign(b.vy) * R) && !blocked(b.x, b.y)) { b.vx = -b.vx; b.vy = -b.vy; }
    // ¿tocó el lindero abierto?
    if (!b.land) {
      for (const [ox2, oy2] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]]) {
        const cx = Math.floor(b.x + ox2), cy = Math.floor(b.y + oy2);
        if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && grid[cy * cols + cx] === TRAIL) { lose(); return; }
      }
    }
    const ddx = b.x - (pl.x + 0.5), ddy = b.y - (pl.y + 0.5);
    if (ddx * ddx + ddy * ddy < 0.8) lose();
  }

  // ── dibujo ──────────────────────────────────────────────────────────────────
  function drawSurveyor(X: number, Y: number) {
    const s = clamp(cs * 0.9, 7, 12);
    const blink = pl.inv > 0 && !E.reduce && Math.floor(pl.inv * 10) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    // trípode
    ctx.strokeStyle = C.warn; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - s * 0.8, Y + s); ctx.moveTo(X, Y); ctx.lineTo(X + s * 0.8, Y + s); ctx.moveTo(X, Y); ctx.lineTo(X, Y + s * 1.05); ctx.stroke();
    // estación total
    E.glow(C.br, 14);
    ctx.fillStyle = C.br; ctx.fillRect(X - s * 0.55, Y - s * 0.75, s * 1.1, s * 0.75);
    E.glow(null);
    ctx.fillStyle = "#04140b"; ctx.fillRect(X - s * 0.25, Y - s * 0.6, s * 0.5, s * 0.42);
    ctx.fillStyle = C.br; ctx.fillRect(X + (pl.dx || 0.6) * s * 0.55 - 1.5, Y - s * 0.5, 3, 3);
    // retícula de mira
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(X, Y - s * 0.38, s * 1.5, 0, TAU);
    ctx.moveTo(X - s * 2, Y - s * 0.38); ctx.lineTo(X - s * 1.2, Y - s * 0.38); ctx.moveTo(X + s * 1.2, Y - s * 0.38); ctx.lineTo(X + s * 2, Y - s * 0.38);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBug(b: Bug) {
    const X = ox + b.x * cs, Y = oy + b.y * cs, s = clamp(cs * 0.75, 6, 10);
    const col = b.land ? C.warn : C.err;
    const wig = E.reduce ? 0 : Math.sin(E.time * 18 + b.ph) * 0.35;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
    ctx.strokeStyle = col; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      const a = k * 0.6 + wig * (k === 0 ? -1 : 1);
      ctx.moveTo(-s * 0.4, k * s * 0.35); ctx.lineTo(-s * 1.1, k * s * 0.35 + Math.sin(a) * s * 0.5);
      ctx.moveTo(s * 0.4, k * s * 0.35); ctx.lineTo(s * 1.1, k * s * 0.35 - Math.sin(a) * s * 0.5);
    }
    ctx.moveTo(-s * 0.2, -s * 0.8); ctx.lineTo(-s * 0.5, -s * 1.3); ctx.moveTo(s * 0.2, -s * 0.8); ctx.lineTo(s * 0.5, -s * 1.3);
    ctx.stroke();
    E.glow(col, 12);
    ctx.fillStyle = col;
    if (b.land) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.55, s * 0.8, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -s * 0.75, s * 0.35, 0, TAU); ctx.fill(); }
    E.glow(null);
    ctx.fillStyle = "#1a0006"; ctx.fillRect(-0.6, -s * 0.4, 1.2, s);
    ctx.restore();
  }

  function northArrow(x: number, y: number, s: number) {
    ctx.fillStyle = C.br; ctx.strokeStyle = C.br; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.4, y + s * 0.6); ctx.lineTo(x, y + s * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.4, y + s * 0.6); ctx.lineTo(x, y + s * 0.3); ctx.closePath(); ctx.stroke();
    ctx.font = E.font(10, true); ctx.textAlign = "center"; ctx.fillText("N", x, y - s - 4);
  }
  function scaleBar(x: number, y: number, n = 4) {
    const seg = cs * 4; // 4 celdas = 100 m
    for (let k = 0; k < n; k++) { ctx.fillStyle = k % 2 ? "#020a06" : C.br; ctx.fillRect(x + k * seg, y, seg, 4); }
    ctx.strokeStyle = C.br; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, seg * n - 1, 4);
    ctx.fillStyle = "rgba(230,255,240,0.7)"; ctx.font = E.font(8); ctx.textAlign = "center";
    for (let k = 0; k <= n; k += 2) ctx.fillText(`${k * 100}`, x + k * seg, y + 13);
    ctx.textAlign = "left"; ctx.fillText("m", x + seg * n + 4, y + 6);
  }

  function drawPanel() {
    const x = panelX, y = ry, w = E.W - 16 - panelX, h = rh;
    ctx.fillStyle = "rgba(2,10,6,0.92)"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.dim; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
    let cy = y + 22;
    const L = x + 14;
    const line = (txt: string, col: string, size = 10, bold = false, gap = 14) => { ctx.font = E.font(size, bold); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(txt, L, cy); cy += gap; };
    const rule = () => { ctx.strokeStyle = "rgba(170,255,200,0.25)"; ctx.beginPath(); ctx.moveTo(x + 8, cy - 6); ctx.lineTo(x + w - 8, cy - 6); ctx.stroke(); cy += 6; };
    line("AGENCIA CATASTRAL", C.acc, 13, true, 16);
    line("DE CUNDINAMARCA · ACC", C.acc, 11, true, 18);
    line(t("PLANO PREDIAL CATASTRAL", "CADASTRAL PARCEL MAP"), C.br, 10, true, 14);
    line(`${t("MUNICIPIO", "MUNICIPALITY")} 25-${muniCode} ${muniName}`, "rgba(230,255,240,0.75)", 10, false, 14);
    line(t("VIGENCIA 2022 · ESC 1:10.000", "VALID 2022 · SCALE 1:10,000"), C.warn, 10, true, 14);
    line("MAGNA-SIRGAS · " + t("ORIGEN BOGOTÁ", "BOGOTÁ ORIGIN"), "rgba(230,255,240,0.55)", 9, false, 18);
    rule();
    northArrow(x + w - 28, cy + 16, 14);
    scaleBar(L, cy + 14);
    cy += 44;
    rule();
    // convenciones
    line(t("CONVENCIONES", "LEGEND"), C.br, 10, true, 16);
    const sw = (draw: () => void, txt: string) => { draw(); ctx.font = E.font(10); ctx.fillStyle = "rgba(230,255,240,0.75)"; ctx.textAlign = "left"; ctx.fillText(txt, L + 22, cy); cy += 15; };
    sw(() => { ctx.fillStyle = "rgba(232,179,75,0.35)"; ctx.fillRect(L, cy - 8, 14, 9); ctx.strokeStyle = PENS[0]; ctx.strokeRect(L + 0.5, cy - 7.5, 13, 8); }, t("predio registrado", "registered parcel"));
    sw(() => { ctx.fillStyle = "#18241d"; ctx.fillRect(L, cy - 8, 14, 9); ctx.strokeStyle = "rgba(225,255,235,0.55)"; ctx.strokeRect(L + 0.5, cy - 7.5, 13, 8); }, t("vía / lindero cerrado", "road / closed boundary"));
    sw(() => { ctx.strokeStyle = C.warn; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(L, cy - 4); ctx.lineTo(L + 14, cy - 4); ctx.stroke(); ctx.setLineDash([]); }, t("lindero en trazo", "line being drawn"));
    sw(() => { ctx.fillStyle = "#183420"; ctx.fillRect(L, cy - 8, 14, 9); ctx.fillStyle = "#785e2c"; ctx.fillRect(L, cy - 5, 14, 1); ctx.fillStyle = "#0e3448"; ctx.fillRect(L + 9, cy - 8, 3, 9); }, t("sin registrar", "unregistered"));
    sw(() => { ctx.fillStyle = C.err; ctx.beginPath(); ctx.arc(L + 7, cy - 4, 4, 0, TAU); ctx.fill(); }, t("invasor (bug)", "invader (bug)"));
    cy += 4; rule();
    // estadísticas
    const ha = ((claimed * M2) / 10_000).toFixed(1).replace(".", ",");
    line(`${t("predios", "parcels")}: ${parcels.length}   ${t("área", "area")}: ${ha} ha`, C.br, 10, true, 14);
    const p = Math.min(1, claimed / interior);
    ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(L, cy - 6, w - 28, 6);
    ctx.fillStyle = p >= GOAL / 100 ? C.acc : C.warn; ctx.fillRect(L, cy - 6, (w - 28) * p, 6);
    ctx.fillStyle = C.br; ctx.fillRect(L + (w - 28) * (GOAL / 100), cy - 9, 1.5, 12);
    cy += 14; rule();
    // bitácora tipo terminal
    line(t("$ bitácora · GitLab privado", "$ log · private GitLab"), "rgba(170,255,200,0.55)", 9, false, 13);
    const room = Math.max(0, Math.floor((y + h - 30 - cy) / 12));
    const shown = log.slice(-room);
    for (const l of shown) line(l.length > 36 ? l.slice(0, 35) + "…" : l, l.startsWith("✗") || l.startsWith("⚠") ? C.err : l.startsWith("♥") ? C.pink : C.fg, 9, false, 12);
    ctx.font = E.font(8); ctx.fillStyle = "rgba(230,255,240,0.4)"; ctx.textAlign = "left";
    ctx.fillText("LADM-COL · INTERLIS 2.3 · XTF", L, y + h - 12);
  }

  function drawStrip() {
    const y = ry + rh + 6, x = rx, w = rw;
    ctx.fillStyle = "rgba(2,10,6,0.92)"; ctx.fillRect(x, y, w, 52);
    ctx.strokeStyle = C.dim; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 51);
    northArrow(x + 18, y + 30, 11);
    ctx.textAlign = "left";
    ctx.font = E.font(10, true); ctx.fillStyle = C.acc; ctx.fillText(`ACC · ${t("VIGENCIA", "VALID")} 2022`, x + 36, y + 15);
    ctx.font = E.font(9); ctx.fillStyle = "rgba(230,255,240,0.7)";
    ctx.fillText(`25-${muniCode} ${muniName} · 1:10.000`, x + 36, y + 28);
    const last = log[log.length - 1] ?? "LADM-COL · INTERLIS · XTF";
    ctx.fillStyle = last.startsWith("✗") || last.startsWith("⚠") ? C.err : C.fg;
    const maxc = Math.floor((w - 44) / 5.5);
    ctx.fillText(last.length > maxc ? last.slice(0, maxc - 1) + "…" : last, x + 36, y + 42);
    const bw = cs * 8;
    scaleBar(x + w - bw - 18, y + 10, 2);
  }

  return {
    cursor: "crosshair",
    resize: rebuild,
    objective: () => t(`🎯 Predios registrados ${Math.min(pct(), 100)}%/${GOAL}%`, `🎯 Parcels registered ${Math.min(pct(), 100)}%/${GOAL}%`),
    key(k) { if (DIRS[k]) { lastKey = k; touched = true; } },
    down() { touched = true; },
    update(dt) {
      hintT += dt;
      pl.inv = Math.max(0, pl.inv - dt);
      for (const p of pops) p.t -= dt;
      E.filter(pops, (p) => p.t > 0);
      if (won) return;
      // topógrafo: una celda por tic mientras haya dirección
      const d = wanted();
      if (d) {
        pl.acc += dt * speed;
        let guard = 3;
        while (pl.acc >= 1 && guard--) {
          pl.acc -= 1;
          if (!step(d[0], d[1])) { pl.acc = 0; break; }
          if (won) break;
        }
        pl.moving = true;
      } else { pl.moving = false; pl.acc = 0; }
      for (const b of bugs) { moveBug(b, dt); if (won) break; }
    },
    draw() {
      ctx.fillStyle = "#010604"; ctx.fillRect(0, 0, E.W, E.H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(stat, rx, ry, rw, rh);
      ctx.drawImage(land, ox, oy, cols * cs, rows * cs);
      // barrido de registro (como el carro de un plotter)
      const claimAnim = Math.max(0, 1 - (E.time - claimAt) / (E.reduce ? 0.6 : 0.9));
      if (claimAnim > 0) {
        const k = 1 - claimAnim;
        const y0 = oy + maskBox.y0 * cs, y1 = oy + maskBox.y1 * cs;
        const sy = y0 + (y1 - y0) * Math.min(1, k * 1.4);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.beginPath(); ctx.rect(ox, sy, cols * cs, y1 - sy + 1); ctx.clip();
        ctx.globalAlpha = E.reduce ? 0.35 * claimAnim : 0.75;
        ctx.drawImage(mask, ox, oy, cols * cs, rows * cs);
        ctx.restore();
        ctx.globalAlpha = claimAnim * 0.5;
        ctx.drawImage(mask, ox, oy, cols * cs, rows * cs);
        ctx.globalAlpha = 1;
        if (k * 1.4 < 1) { E.glow(maskCol, 14); ctx.fillStyle = "#fff"; ctx.fillRect(ox + maskBox.x0 * cs, sy - 1, (maskBox.x1 - maskBox.x0) * cs, 2); E.glow(null); }
      }
      // lindero abierto
      if (trail.length) {
        ctx.fillStyle = "rgba(255,204,51,0.22)";
        for (const c of trail) ctx.fillRect(ox + (c % cols) * cs, oy + ((c / cols) | 0) * cs, cs, cs);
        ctx.beginPath();
        const s0 = trailStart;
        ctx.moveTo(ox + ((s0 % cols) + 0.5) * cs, oy + (((s0 / cols) | 0) + 0.5) * cs);
        for (const c of trail) ctx.lineTo(ox + ((c % cols) + 0.5) * cs, oy + (((c / cols) | 0) + 0.5) * cs);
        E.glow(C.warn, 10);
        ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.lineDashOffset = E.reduce ? 0 : -E.time * 24;
        ctx.stroke(); ctx.setLineDash([]); E.glow(null);
        // mojones (vértices del lindero) donde cambia de dirección
        ctx.fillStyle = C.br;
        for (let k = 1; k < trail.length - 1; k++) {
          const a = trail[k - 1], b = trail[k], c = trail[k + 1];
          if (b - a !== c - b) ctx.fillRect(ox + ((b % cols) + 0.5) * cs - 2, oy + (((b / cols) | 0) + 0.5) * cs - 2, 4, 4);
        }
      }
      for (const b of bugs) drawBug(b);
      // topógrafo (interpolado entre celdas)
      const ahead = pl.moving && !won && free(pl.x + pl.dx, pl.y + pl.dy) ? clamp(pl.acc, 0, 1) : 0;
      const fx = pl.x + pl.dx * ahead, fy = pl.y + pl.dy * ahead;
      const X = ox + (fx + 0.5) * cs, Y = oy + (fy + 0.5) * cs;
      drawSurveyor(X, Y);
      // pista inicial
      if (!touched && hintT > 0.5 && !won) {
        ctx.globalAlpha = E.reduce ? 0.85 : 0.6 + Math.sin(hintT * 5) * 0.3;
        ctx.fillStyle = C.br; ctx.font = E.font(13, true); ctx.textAlign = "center";
        ctx.fillText(E.coarse ? t("↑ mantén el dedo en el terreno", "↑ hold your finger on the land") : t("↑ sal del borde y traza un lindero", "↑ leave the border and draw a line"), clamp(X, 140, E.W - 140), Y - 34);
        ctx.globalAlpha = 1;
      }
      for (const p of pops) {
        ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.col; ctx.font = E.font(16, true); ctx.textAlign = "center";
        ctx.fillText(p.txt, p.x, p.y - (1.4 - p.t) * 26);
      }
      ctx.globalAlpha = 1;
      if (wide) drawPanel(); else drawStrip();
      // sello de aprobación
      if (won) {
        const wonT = E.time - wonAt; // el motor ya no llama update() durante la transición
        const a = Math.min(1, wonT * 3);
        const s = 1 + (E.reduce ? 0 : Math.max(0, 0.4 - wonT) * 2);
        ctx.save(); ctx.translate(ox + cols * cs / 2, oy + rows * cs * 0.28); ctx.rotate(-0.18); ctx.scale(s, s);
        ctx.globalAlpha = a; ctx.strokeStyle = C.err; ctx.fillStyle = C.err; ctx.lineWidth = 3;
        const sw = Math.min(cols * cs * 0.8, 330);
        ctx.strokeRect(-sw / 2, -34, sw, 68); ctx.lineWidth = 1; ctx.strokeRect(-sw / 2 + 5, -29, sw - 10, 58);
        ctx.font = E.font(Math.min(30, sw / 9), true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(t("APROBADO", "APPROVED"), 0, -7);
        ctx.font = E.font(10, true); ctx.fillText(`ACC · VIGENCIA 2022 · ${pct()}%`, 0, 18);
        ctx.textBaseline = "alphabetic";
        ctx.restore();
      }
    },
  };
}
