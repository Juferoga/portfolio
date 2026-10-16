// 2020 · snake.py — la cuarentena dentro de una terminal.
// Una ventana tipo tmux: a la izquierda el snake dibujado con caracteres (cuerpo en box-drawing),
// a la derecha un modelo SIR resuelto con Euler (numeric-methods), el árbol de repos del 2020
// que se va "desbloqueando" y un `tail -f` con cada commit. Mecánicas extra: # sudo (modo root:
// atraviesas todo y te comes los virus), ↺ git reset (corta la cola), ★ grub2-theme (+2 commits)
// y zonas de cuarentena que aparecen y se levantan. Los bordes dan la vuelta (perdona más).

import { clamp, type Engine, type GameMeta, type Scene } from "../engine";

const GOAL = 18;
const SUDO_S = 6;

export const meta: GameMeta = {
  name: { es: "SNAKE.PY", en: "SNAKE.PY" },
  story: {
    es: "Cuarentena estricta: la vida cabe en una terminal. Modelas la pandemia con métodos numéricos, haces ricing con los gnubies y grub2-theme-glud se vuelve tu repo más estrellado.",
    en: "Strict lockdown: life fits inside a terminal. You model the pandemic with numerical methods, rice Linux with the gnubies and grub2-theme-glud becomes your most-starred repo.",
  },
  goal: {
    es: `Come ${GOAL} commits ● (los repos de tu 2020) sin chocar con virus ☣, tu propia cola ni las zonas de cuarentena ▓.`,
    en: `Eat ${GOAL} commits ● (your 2020 repos) without hitting viruses ☣, your own tail or the quarantine zones ▓.`,
  },
  tip: {
    es: "# sudo: modo root, atraviesas todo y te comes los virus · ↺ git reset corta la cola · ★ vale +2 · los bordes dan la vuelta · pierdes ♥ al chocar",
    en: "# sudo: root mode, pass through anything and eat viruses · ↺ git reset cuts your tail · ★ is worth +2 · edges wrap around · you lose ♥ when you crash",
  },
  ctrl: {
    desktop: { es: "flechas / WASD · o clic hacia donde quieras girar", en: "arrows / WASD · or click where you want to turn" },
    touch: { es: "desliza para girar", en: "swipe to turn" },
  },
};

export function create(E: Engine): Scene {
  const { ctx, C } = E;
  const t = E.t;
  type P = { x: number; y: number };
  type Kind = "sudo" | "reset" | "star";
  type Item = P & { kind: Kind; life: number };
  type Wall = { cells: P[]; age: number; life: number };
  type Line = { s: string; c: string };

  // la grilla se decide una sola vez (vertical u horizontal): redimensionar nunca pierde la partida
  const portrait = E.W < E.H;
  const COLS = portrait ? 18 : 30, ROWS = portrait ? 24 : 18;
  const WARN_S = 2.2, WALL_LIFE = 22;

  // los commits del 2020, en orden (repos reales del timeline)
  const COMMITS: [string, string, string][] = [
    ["Snake", "init: la serpiente antes de la cuarentena", "init: the snake before quarantine"],
    ["io-i", "IO1 en equipo con Mateo y Jose David", "IO1 as a team with Mateo and Jose David"],
    ["IntroductionDataScience", "notebook: intro a ciencia de datos", "notebook: intro to data science"],
    ["custom-linux", "ricing de AwesomeWM (gnubies)", "AwesomeWM ricing (gnubies)"],
    ["Material-Awesome", "fork: material-awesome", "fork: material-awesome"],
    ["custom-linux", "README: los 5 gnubies + logo UD", "README: the 5 gnubies + UD logo"],
    ["LinuxSysAdmin", "ejercicios de shell (Coursera)", "shell exercises (Coursera)"],
    ["LinuxSysAdmin", "seguridad de servidores Linux", "Linux server security"],
    ["numeric-methods", "modelo SIR v1", "SIR model v1"],
    ["numeric-methods", "modelo SIR v2: la pandemia en Colombia", "SIR model v2: the pandemic in Colombia"],
    ["numeric-methods", "notebook: percepción en Twitter", "notebook: Twitter perception"],
    ["grub2-theme-glud", "banner ASCII del GLUD", "GLUD ASCII banner"],
    ["grub2-theme-glud", "estilos Vimix, Stylish y Tela", "Vimix, Stylish and Tela styles"],
    ["grub2-theme-glud", "soporte ultrawide 2560x1080", "2560x1080 ultrawide support"],
    ["emotion-recognition-ICD", "reconocer emociones con deep learning", "emotion recognition with deep learning"],
    ["Juferoga", "The Secret Github Repository 👻", "The Secret Github Repository 👻"],
    ["Krita", "dibujos en Krita (arte libre)", "drawings in Krita (free art)"],
    ["playground-rnr", "demo de RNN en GitHub Pages", "RNN demo on GitHub Pages"],
  ];
  // árbol ~/2020: cada repo se "enciende" al hacerle su primer commit
  const TREE: [string, string][] = [
    ["Snake", ""], ["io-i", ""], ["custom-linux", "gnubies"], ["LinuxSysAdmin", ""], ["numeric-methods", "SIR"],
    ["grub2-theme-glud", "★7"], ["emotion-recognition-ICD", "DL"], ["Juferoga", "👻"], ["Krita", "🎨"], ["playground-rnr", ""],
  ];
  const firstCommit = TREE.map(([r]) => COMMITS.findIndex((c) => c[0] === r));

  // ── estado ──────────────────────────────────────────────────────────────────
  let body: P[] = [], dir: P = { x: 1, y: 0 };
  const queue: P[] = [];
  let food: P = { x: 0, y: 0 };
  const virus: P[] = [];
  const items: Item[] = [];
  const walls: Wall[] = [];
  const log: Line[] = [];
  let eaten = 0, stepT = 0, grace = 0, grow = 0, clock = 0, sudoT = 0, driftT = 0;
  let wallAt = [5, 11], sudoAt = [4, 9, 14];
  let turned = false, done = false;
  let prompt = "python3 snake.py", promptT = 0;
  // modelo SIR (fracciones de la población), integrado con Euler
  const sir = { S: 0.995, I: 0.005, R: 0, day: 0, next: 1 };
  const hist: number[] = [0.005];
  const DAY_RATE = 0.6; // días simulados por segundo de juego
  let dateStr = "", dateDay = -1;

  const say = (s: string, c: string = C.fg) => { log.push({ s, c }); if (log.length > 40) log.shift(); };
  const cmd = (s: string) => { prompt = s; promptT = 0; };
  const hash = () => Math.random().toString(16).slice(2, 9).padEnd(7, "0");

  // ── layout ──────────────────────────────────────────────────────────────────
  let SC = 1, cs = 20, gx = 0, gy = 0, gw = 0, gh = 0, pad = 10, TB = 26, SB = 20, PL = 24, fs = 12, lh = 16, chW = 7.2;
  let side = false, narrow = false;
  const win = { x: 0, y: 0, w: 0, h: 0 };
  const pan = { x: 0, y: 0, w: 0, h: 0 };
  // secciones del panel (y de cada cosa)
  let chartRows = 6, chartY = 0, statsY = 0, treeY = -1, logY = 0, logN = 0, chartCols = 20, chartX = 0;
  const bg = document.createElement("canvas");
  const cache = new Map<string, { c: HTMLCanvasElement; p: number }>();

  function layout() {
    const W = E.W, H = E.H;
    SC = ctx.getTransform().a || 1;
    narrow = W < 520;
    const m = narrow ? 6 : 20, top = 82, bot = H - 34;
    const aw = W - m * 2, ah = bot - top;
    side = W >= 760 && W > H * 1.05;
    TB = narrow ? 22 : 26; SB = narrow ? 0 : 20; PL = narrow ? 22 : 24; pad = narrow ? 6 : 10;
    fs = narrow ? 10 : W > 1100 ? 12.5 : 11.5; lh = Math.round(fs * 1.38);
    ctx.font = E.font(fs); chW = ctx.measureText("0").width;
    let pw = 0, bp = 0;
    if (side) {
      pw = clamp(Math.round(W * 0.27), 250, 380);
      cs = Math.floor(Math.min((aw - pad * 2 - 18 - pw) / COLS, (ah - TB - pad - PL - SB - 6) / ROWS));
    } else {
      bp = ah < 560 ? 0 : clamp(Math.round(ah * 0.26), 110, 190);
      cs = Math.floor(Math.min((aw - pad * 2) / COLS, (ah - TB - pad - PL - bp - SB - 6) / ROWS));
    }
    cs = Math.max(8, cs);
    gw = COLS * cs; gh = ROWS * cs;
    win.w = side ? pad + gw + 18 + pw + pad : Math.max(aw, gw + pad * 2);
    win.h = TB + pad + gh + PL + bp + SB + 6;
    win.x = Math.round((W - win.w) / 2); win.y = Math.round(top + Math.max(0, (ah - win.h) / 2));
    gx = side ? win.x + pad : Math.round(win.x + (win.w - gw) / 2); gy = win.y + TB + pad;
    if (side) { pan.x = gx + gw + 18; pan.y = gy; pan.w = pw; pan.h = gh + PL; }
    else { pan.x = win.x + pad; pan.y = gy + gh + PL + 2; pan.w = win.w - pad * 2; pan.h = bp - 4; }
    // secciones del panel
    chartRows = side ? 6 : 3;
    chartX = pan.x + chW * 5;
    chartCols = Math.max(8, Math.floor((pan.w - chW * 5) / chW) - 1);
    chartY = pan.y + lh * 1.5;
    statsY = chartY + chartRows * lh + lh * 1.1;
    const afterStats = statsY + lh * 1.3;
    treeY = side && pan.h - (afterStats - pan.y) > lh * (TREE.length + 8) ? afterStats : -1;
    logY = (treeY > 0 ? treeY + lh * (TREE.length + 1.4) : afterStats) + lh * 0.6;
    logN = Math.max(0, Math.floor((pan.y + pan.h - logY - lh * 0.6) / lh));
    if (!side && bp === 0) logN = 0;
    cache.clear();
    buildBg();
  }

  // números pseudoaleatorios estables (el fondo no cambia al redimensionar)
  function lcg(seed: number) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  /** fondo, ventana, grilla y rótulos fijos: todo pre-renderizado en un lienzo aparte */
  function buildBg() {
    const W = E.W, H = E.H;
    bg.width = Math.max(1, Math.round(W * SC)); bg.height = Math.max(1, Math.round(H * SC));
    const g = bg.getContext("2d")!;
    g.setTransform(SC, 0, 0, SC, 0, 0);
    g.fillStyle = "#010302"; g.fillRect(0, 0, W, H);
    // texto fantasma: un git log infinito de la cuarentena
    const r = lcg(2020);
    const WORDS = ["#QuédateEnCasa", "git push", "stay home", "numeric-methods", "grub2-theme-glud", "gnubies", "awesome-wm", "R0=3.5", "Krita", "GLUD", "👻", "sudo -s", "dI/dt = βSI − γI", "make install"];
    g.font = E.font(12); g.fillStyle = C.fg; g.globalAlpha = 0.05; g.textBaseline = "middle";
    for (let y = 10; y < H; y += 20) {
      let line = "";
      while (line.length < W / 6) line += `${Math.floor(r() * 0xfffffff).toString(16).padStart(7, "0")} ${WORDS[Math.floor(r() * WORDS.length)]}   `;
      g.fillText(line, -r() * 60, y);
    }
    g.globalAlpha = 1;
    // ventana
    g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(win.x + 6, win.y + 8, win.w, win.h); // sombra
    g.beginPath(); g.roundRect(win.x, win.y, win.w, win.h, 8); g.fillStyle = "#030a06"; g.fill();
    g.strokeStyle = C.dim; g.lineWidth = 1; g.stroke();
    g.save(); g.beginPath(); g.roundRect(win.x, win.y, win.w, TB, [8, 8, 0, 0]); g.clip();
    g.fillStyle = "rgba(255,255,255,0.07)"; g.fillRect(win.x, win.y, win.w, TB); g.restore();
    g.strokeStyle = "rgba(255,255,255,0.1)"; g.beginPath(); g.moveTo(win.x, win.y + TB + 0.5); g.lineTo(win.x + win.w, win.y + TB + 0.5); g.stroke();
    const dr = narrow ? 4 : 5;
    [C.err, C.warn, C.fg].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(win.x + 14 + i * (dr * 3.2), win.y + TB / 2, dr, 0, Math.PI * 2); g.fill(); });
    g.font = E.font(narrow ? 10 : 12, true); g.fillStyle = "rgba(255,255,255,0.7)"; g.textAlign = narrow ? "left" : "center";
    const title = narrow ? "juferoga@glud: ~/covid" : "juferoga@glud: ~/covid — python3 snake.py";
    g.fillText(title, narrow ? win.x + 14 + dr * 9 : win.x + win.w / 2, win.y + TB / 2 + 1);
    g.textAlign = "left";
    // grilla: un punto por celda y borde punteado (los bordes dan la vuelta)
    g.fillStyle = "rgba(255,255,255,0.018)"; g.fillRect(gx, gy, gw, gh);
    g.fillStyle = C.dim; g.globalAlpha = 0.4;
    const d = Math.max(1, cs * 0.07);
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) g.fillRect(gx + x * cs + cs / 2 - d / 2, gy + y * cs + cs / 2 - d / 2, d, d);
    g.globalAlpha = 1;
    g.strokeStyle = C.dim; g.setLineDash([3, 5]); g.strokeRect(gx - 0.5, gy - 0.5, gw + 1, gh + 1); g.setLineDash([]);
    // panel(es)
    g.font = E.font(fs); g.fillStyle = C.dim;
    if (side) {
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(pan.x - 9.5, gy - pad); g.lineTo(pan.x - 9.5, gy + gh + PL); g.stroke();
    } else if (pan.h > 0) {
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(win.x, pan.y - 2.5); g.lineTo(win.x + win.w, pan.y - 2.5); g.stroke();
    }
    const hdr = (s: string, y: number) => {
      const n = Math.floor(pan.w / chW);
      g.fillStyle = C.dim; g.fillText(`── ${s} ${"─".repeat(Math.max(0, n - s.length - 4))}`.slice(0, n), pan.x, y);
    };
    if (pan.h > 0) {
      hdr(side ? "python3 sir.py · numeric-methods" : "sir.py · Euler", pan.y + lh * 0.5);
      // ejes del gráfico de infectados
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < chartRows; i++) g.fillText(i === 0 ? " 40%┤" : i === chartRows - 1 ? "  0%┤" : "    │", pan.x, chartY + i * lh);
      if (side) g.fillText("    └" + "─".repeat(chartCols), pan.x, chartY + chartRows * lh - lh * 0.15);
      if (treeY > 0) {
        hdr("tree ~/2020", treeY);
      }
      if (logN > 0) hdr("tail -f ~/2020.log", logY - lh * 0.9);
    }
    // barra de estado estilo tmux
    if (SB > 0) {
      const sy = win.y + win.h - SB;
      g.save(); g.beginPath(); g.roundRect(win.x, sy, win.w, SB, [0, 0, 8, 8]); g.clip();
      g.fillStyle = C.fg; g.globalAlpha = 0.85; g.fillRect(win.x, sy, win.w, SB); g.restore();
      g.fillStyle = "#00140a"; g.font = E.font(fs, true);
      const left = side ? "[2020] 0:snake.py*  1:sir.py  2:tail-f" : "[2020] 0:snake.py*";
      g.fillText(left, win.x + 10, sy + SB / 2 + 1);
      if (side && win.w > 900) {
        g.textAlign = "center"; g.font = E.font(fs);
        g.fillText(t("● commit   ☣ virus   ▓ cuarentena   # sudo   ↺ reset   ★ grub", "● commit   ☣ virus   ▓ quarantine   # sudo   ↺ reset   ★ grub"), win.x + win.w * 0.52, sy + SB / 2 + 1);
        g.textAlign = "left";
      }
    }
    g.textBaseline = "alphabetic";
  }

  /** atlas de glifos: cada carácter+color se pinta una vez (con brillo horneado) y luego es un drawImage.
   *  `fit` estira el glifo para llenar la celda cuadrada (así ═║╔ se unen entre celdas). */
  function glyph(ch: string, col: string, fit: boolean, blur = 0) {
    const k = `${ch}|${col}|${fit ? 1 : 0}|${blur}`;
    let e = cache.get(k);
    if (e) return e;
    const p = Math.ceil(cs * 0.45);
    const c = document.createElement("canvas");
    c.width = c.height = Math.max(1, Math.ceil((cs + p * 2) * SC));
    const g = c.getContext("2d")!;
    g.setTransform(SC, 0, 0, SC, 0, 0);
    g.fillStyle = col;
    if (blur && E.hq) { g.shadowColor = col; g.shadowBlur = blur * SC; }
    if (fit) {
      g.font = E.font(cs);
      const m = g.measureText("█");
      const asc = m.actualBoundingBoxAscent || cs * 0.8, des = m.actualBoundingBoxDescent || cs * 0.2;
      g.translate(p, p); g.scale(cs / (m.width || cs * 0.6), cs / (asc + des));
      g.fillText(ch, 0, asc);
    } else {
      g.font = E.font(cs * 0.86, true); g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(ch, p + cs / 2, p + cs / 2 + cs * 0.04);
    }
    e = { c, p };
    cache.set(k, e);
    return e;
  }
  function put(ch: string, col: string, x: number, y: number, fit = false, blur = 0, scale = 1) {
    const e = glyph(ch, col, fit, blur);
    const s = (cs + e.p * 2) * scale;
    ctx.drawImage(e.c, gx + x * cs + cs / 2 - s / 2, gy + y * cs + cs / 2 - s / 2, s, s);
  }

  // ── reglas ──────────────────────────────────────────────────────────────────
  const same = (a: P, b: P) => a.x === b.x && a.y === b.y;
  const wallSolid = (w: Wall) => w.age >= WARN_S;
  const onBody = (x: number, y: number) => body.some((b) => b.x === x && b.y === y);
  const onWall = (x: number, y: number, solidOnly = false) => walls.some((w) => (!solidOnly || wallSolid(w)) && w.cells.some((c) => c.x === x && c.y === y));
  const taken = (x: number, y: number) =>
    onBody(x, y) || virus.some((v) => v.x === x && v.y === y) || onWall(x, y) ||
    items.some((i) => i.x === x && i.y === y) || (food.x === x && food.y === y);
  // distancia con vuelta en los bordes
  const dist = (a: P, b: P) => {
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    return Math.min(dx, COLS - dx) + Math.min(dy, ROWS - dy);
  };
  function freeCell(near = 4): P {
    const h = body[0];
    for (let i = 0; i < 600; i++) {
      const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!taken(p.x, p.y) && (!h || dist(p, h) > near)) return p;
    }
    return { x: 0, y: 0 };
  }

  function respawn() {
    // fila de salida sin muros cerca del centro
    const mid = Math.floor(ROWS / 2);
    let row = mid;
    for (let o = 0; o < ROWS; o++) {
      const r = mid + (o % 2 ? (o + 1) / 2 : -o / 2);
      if (r < 0 || r >= ROWS) continue;
      let ok = true;
      for (let x = 0; x < 14 && ok; x++) if (onWall(x, r)) ok = false;
      if (ok) { row = r; break; }
    }
    body = [0, 1, 2, 3].map((i) => ({ x: 6 - i, y: row }));
    dir = { x: 1, y: 0 }; queue.length = 0; grace = 1.6; grow = 0; stepT = 0;
    // los virus que estén en la línea de salida se van a otra parte
    for (const v of virus) if (Math.abs(v.y - row) <= 2 && v.x < 16) { v.x = -9; v.y = -9; const p = freeCell(6); v.x = p.x; v.y = p.y; }
  }

  function spawnVirus() { virus.push(freeCell(6)); }
  const virusTarget = () => Math.min(portrait ? 6 : 8, 2 + Math.floor(eaten / 3));

  function spawnItem(kind: Kind, life: number) {
    if (items.some((i) => i.kind === kind)) return;
    items.push({ ...freeCell(3), kind, life });
  }

  function spawnWall() {
    const len = portrait ? 5 : 6, h = body[0];
    for (let i = 0; i < 80; i++) {
      const horiz = Math.random() < 0.5;
      const sx = Math.floor(Math.random() * (COLS - (horiz ? len : 0))), sy = Math.floor(Math.random() * (ROWS - (horiz ? 0 : len)));
      const cells: P[] = [];
      for (let k = 0; k < len; k++) cells.push({ x: sx + (horiz ? k : 0), y: sy + (horiz ? 0 : k) });
      if (cells.every((c) => !taken(c.x, c.y) && dist(c, h) > 6)) {
        walls.push({ cells, age: 0, life: WALL_LIFE });
        say(t("[warn] zona de cuarentena detectada ▓", "[warn] quarantine zone detected ▓"), C.warn);
        cmd("sudo ufw default deny incoming");
        E.beep(330, 60, 0.03);
        return;
      }
    }
  }

  function die(why: "self" | "virus" | "wall") {
    const h = body[0];
    E.burst(gx + h.x * cs + cs / 2, gy + h.y * cs + cs / 2, C.err, 30, 300, 4);
    say(
      why === "self" ? t("[err] RecursionError: te mordiste la cola", "[err] RecursionError: you bit your own tail")
        : why === "virus" ? t("[err] contagio ☣: prueba positiva", "[err] infected ☣: positive test")
          : t("[err] rompiste la cuarentena ▓", "[err] you broke quarantine ▓"),
      C.err,
    );
    cmd("Traceback (most recent call last):");
    if (E.hurt()) { respawn(); say(t(`[info] reiniciando snake.py… (♥ ${E.lives()})`, `[info] restarting snake.py… (♥ ${E.lives()})`), C.dim); }
  }

  function commit() {
    const n = Math.min(eaten, COMMITS.length - 1);
    const [repo, es, en] = COMMITS[n];
    const msg = t(es, en);
    eaten++;
    say(`[ok] ${hash()} ${repo}: "${msg}"`, C.fg);
    cmd(`git commit -m "${msg}"`);
  }

  function afterCommit() {
    if (eaten >= GOAL) { win_(); return; }
    while (virus.length < virusTarget()) spawnVirus();
    while (wallAt.length && eaten >= wallAt[0]) { wallAt = wallAt.slice(1); spawnWall(); }
    while (sudoAt.length && eaten >= sudoAt[0]) { sudoAt = sudoAt.slice(1); spawnItem("sudo", 10); say(t("[info] apareció # sudo: pásale por encima", "[info] # sudo spawned: run over it"), C.pink); }
    if (body.length >= 11 && Math.random() < 0.4) spawnItem("reset", 10);
    if (eaten === 7 || (eaten < GOAL - 3 && Math.random() < 0.2)) spawnItem("star", 7);
  }

  function win_() {
    if (done) return;
    done = true;
    say(t("[ok] git push origin 2020 ✔", "[ok] git push origin 2020 ✔"), C.acc);
    cmd("git push origin 2020");
    E.clear();
  }

  function step() {
    if (queue.length) dir = queue.shift()!;
    const h = body[0];
    const n = { x: (h.x + dir.x + COLS) % COLS, y: (h.y + dir.y + ROWS) % ROWS };
    const root = sudoT > 0, safe = grace > 0 || root;
    const len = body.length - (grow > 0 ? 0 : 1);
    let hitSelf = false;
    for (let i = 0; i < len; i++) if (same(body[i], n)) { hitSelf = true; break; }
    const vi = virus.findIndex((v) => same(v, n));
    const hitWall = onWall(n.x, n.y, true);
    if (!safe && (hitSelf || vi >= 0 || hitWall)) { die(hitSelf ? "self" : vi >= 0 ? "virus" : "wall"); return; }
    const cx = gx + n.x * cs + cs / 2, cy = gy + n.y * cs + cs / 2;
    if (root && vi >= 0) {
      virus.splice(vi, 1);
      E.addScore(150); E.sfx.hit(); E.burst(cx, cy, C.err, 16, 200, 3);
      say(`[root] kill -9 ${1000 + Math.floor(Math.random() * 8999)} ☣ (+150)`, C.pink);
    }
    body.unshift(n);
    if (grow > 0) grow--; else body.pop();
    if (same(n, food)) {
      grow += 1; E.addScore(100); E.sfx.blip(); E.burst(cx, cy, C.acc, 12, 160, 2);
      commit();
      if (done) return;
      food = { x: -5, y: -5 };
      afterCommit();
      if (done) return;
      food = freeCell();
    }
    const ii = items.findIndex((i) => same(i, n));
    if (ii >= 0) {
      const it = items[ii];
      items.splice(ii, 1);
      if (it.kind === "sudo") {
        sudoT = SUDO_S; E.sfx.power(); E.burst(cx, cy, C.pink, 22, 240, 3);
        cmd("sudo -s");
        say(t(`[root] modo root ${SUDO_S} s: atraviesas todo y te comes los ☣`, `[root] root mode ${SUDO_S} s: pass through anything, eat the ☣`), C.pink);
      } else if (it.kind === "reset") {
        const cut = Math.floor(body.length / 2);
        if (cut > 0) {
          const gone = body.splice(body.length - cut, cut);
          for (const g of gone) E.burst(gx + g.x * cs + cs / 2, gy + g.y * cs + cs / 2, C.cyan, 3, 120, 2);
        }
        grow = 0;
        E.addScore(cut * 25); E.sfx.power();
        cmd(`git reset --hard HEAD~${cut}`);
        say(t(`[ok] HEAD~${cut}: cola recortada (+${cut * 25})`, `[ok] HEAD~${cut}: tail trimmed (+${cut * 25})`), C.cyan);
      } else {
        grow += 2; E.addScore(300); E.sfx.point(); E.burst(cx, cy, C.warn, 24, 240, 3);
        cmd("sudo update-grub");
        say(t("[★] grub2-theme-glud: +1 estrella (+2 commits)", "[★] grub2-theme-glud: +1 star (+2 commits)"), C.warn);
        eaten = Math.min(GOAL, eaten + 2);
        afterCommit();
      }
    }
  }

  function turn(nx: number, ny: number) {
    if (!nx && !ny) return;
    const last = queue[queue.length - 1] ?? dir;
    if ((nx === -last.x && ny === -last.y) || (nx === last.x && ny === last.y) || queue.length >= 2) return;
    queue.push({ x: nx, y: ny });
    turned = true;
  }
  const turnVec = (dx: number, dy: number) => { if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy)); };
  const speed = () => Math.min(11.5, 6.5 + eaten * 0.3);

  const DIRS: Record<string, [number, number]> = {
    arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  };

  // ── arranque ────────────────────────────────────────────────────────────────
  layout();
  respawn(); grace = 0.6;
  food = freeCell();
  spawnVirus(); spawnVirus();
  say("$ python3 snake.py", C.br);
  say(t("[info] 2020-03-25: cuarentena nacional", "[info] 2020-03-25: national lockdown"), C.dim);
  say(t(`[info] meta: ${GOAL} commits antes de que acabe el año`, `[info] goal: ${GOAL} commits before the year ends`), C.dim);

  // ── dibujo de cuerpo (box-drawing según los vecinos) ────────────────────────
  const dirOf = (a: P, b: P) => {
    let dx = b.x - a.x, dy = b.y - a.y;
    if (dx > 1) dx = -1; else if (dx < -1) dx = 1;
    if (dy > 1) dy = -1; else if (dy < -1) dy = 1;
    return dx > 0 ? "R" : dx < 0 ? "L" : dy > 0 ? "D" : "U";
  };
  const BOX: Record<string, string> = { LR: "═", DU: "║", DR: "╔", DL: "╗", RU: "╚", LU: "╝", LL: "═", RR: "═", UU: "║", DD: "║" };
  const HEAD: Record<string, string> = { R: "▶", L: "◀", U: "▲", D: "▼" };
  const SPARK = " ▁▂▃▄▅▆▇█";

  function text(s: string, x: number, y: number, col: string, max: number) {
    ctx.fillStyle = col;
    ctx.fillText(s.length > max ? s.slice(0, Math.max(0, max - 1)) + "…" : s, x, y);
  }

  return {
    cursor: "crosshair",
    resize: layout,
    objective: () =>
      t(`🎯 Commits ${eaten}/${GOAL}`, `🎯 Commits ${eaten}/${GOAL}`) + (sudoT > 0 ? ` · # root ${Math.ceil(sudoT)}s` : ""),
    key(k) { const d = DIRS[k]; if (d) turn(d[0], d[1]); },
    swipe(dx, dy) { if (Math.max(Math.abs(dx), Math.abs(dy)) >= 14) turnVec(dx, dy); },
    down(x, y, touch) {
      if (touch) return; // en táctil se gira deslizando
      const h = body[0];
      turnVec(x - (gx + h.x * cs + cs / 2), y - (gy + h.y * cs + cs / 2));
    },
    update(dt) {
      if (done) return;
      clock += dt; promptT += dt;
      grace = Math.max(0, grace - dt);
      if (sudoT > 0) { sudoT -= dt; if (sudoT <= 0) { sudoT = 0; grace = Math.max(grace, 0.8); say(t("[info] exit (se acabó el root)", "[info] exit (root is over)"), C.dim); cmd("exit"); } }
      // girar sin esperar a soltar el dedo
      for (const tc of E.touches.values()) {
        const dx = tc.x - tc.sx, dy = tc.y - tc.sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) { turnVec(dx, dy); tc.sx = tc.x; tc.sy = tc.y; }
      }
      // ítems y zonas con fecha de vencimiento
      for (const it of items) it.life -= dt;
      E.filter(items, (it) => it.life > 0);
      for (const w of walls) {
        w.age += dt;
        if (w.age > w.life) say(t("[ok] cuarentena levantada", "[ok] quarantine lifted"), C.fg);
      }
      E.filter(walls, (w) => w.age <= w.life);
      // los virus se mueven solos de vez en cuando (nunca junto a tu cabeza)
      driftT += dt;
      if (driftT > 1.4) {
        driftT = 0;
        const h = body[0];
        for (const v of virus) {
          if (Math.random() < 0.4) continue;
          const [ddx, ddy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
          const n = { x: (v.x + ddx + COLS) % COLS, y: (v.y + ddy + ROWS) % ROWS };
          if (!taken(n.x, n.y) && dist(n, h) > 3) { v.x = n.x; v.y = n.y; }
        }
      }
      // SIR con Euler: la cuarentena (β baja) aplana la curva
      const dd = dt * DAY_RATE;
      const beta = walls.some(wallSolid) ? 0.16 : 0.42, gamma = 0.12;
      const inf = beta * sir.S * sir.I, rec = gamma * sir.I;
      sir.S -= inf * dd; sir.I += (inf - rec) * dd; sir.R += rec * dd; sir.day += dd;
      if (sir.day >= sir.next) { sir.next++; hist.push(sir.I); if (hist.length > 300) hist.shift(); }
      // pasos de la serpiente
      stepT += dt;
      const iv = 1 / speed();
      while (stepT >= iv && E.playing() && !done) { stepT -= iv; step(); }
    },
    draw() {
      const W = E.W;
      ctx.drawImage(bg, 0, 0, W, E.H);
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      const root = sudoT > 0;

      // título: día de cuarentena
      const day = Math.floor(sir.day) + 1;
      if (!narrow) {
        ctx.font = E.font(11); ctx.textAlign = "right"; ctx.fillStyle = root ? C.pink : C.warn;
        ctx.fillText(root ? "root" : t(`día ${day} de cuarentena`, `lockdown day ${day}`), win.x + win.w - 12, win.y + TB / 2 + 1);
        ctx.textAlign = "left";
      }

      // zonas de cuarentena: parpadean (o se desvanecen) antes de volverse sólidas
      for (const w of walls) {
        const warn = w.age < WARN_S, ending = w.life - w.age < 2;
        let a = 1;
        if (warn) a = E.reduce ? 0.25 + (w.age / WARN_S) * 0.4 : Math.floor(w.age * 6) % 2 ? 0.25 : 0.65;
        else if (ending) a = E.reduce ? 0.3 + ((w.life - w.age) / 2) * 0.5 : Math.floor(w.age * 5) % 2 ? 0.4 : 0.9;
        ctx.globalAlpha = a * (root ? 0.45 : 1);
        for (const c of w.cells) put(warn ? "░" : "▓", C.warn, c.x, c.y, true);
      }
      ctx.globalAlpha = 1;

      // virus
      for (const v of virus) put("☣", C.err, v.x, v.y, false, root ? 0 : 8, 1 + Math.sin(clock * 4 + v.x) * 0.05);
      // ítems
      for (const it of items) {
        const fading = it.life < 2;
        ctx.globalAlpha = fading ? (E.reduce ? 0.35 + it.life * 0.3 : Math.floor(it.life * 8) % 2 ? 0.3 : 1) : 1;
        const [ch, col] = it.kind === "sudo" ? ["#", C.pink] : it.kind === "reset" ? ["↺", C.cyan] : ["★", C.warn];
        put(ch, col, it.x, it.y, false, 12, 1 + Math.sin(clock * 5) * 0.08);
      }
      ctx.globalAlpha = 1;
      // commit
      if (food.x >= 0) put("●", C.acc, food.x, food.y, false, 12, 0.85 + Math.sin(clock * 6) * 0.08);

      // serpiente
      const blink = grace > 0 && (E.reduce ? false : Math.floor(grace * 10) % 2 === 0);
      if (!blink) {
        const col = root ? C.pink : C.fg;
        const n = body.length;
        // "video inverso" tenue bajo el cuerpo: le da volumen sin perder los caracteres
        ctx.fillStyle = root ? "rgba(255,61,154,0.10)" : "rgba(51,255,102,0.08)";
        for (let i = 1; i < n; i++) ctx.fillRect(gx + body[i].x * cs + 1, gy + body[i].y * cs + 1, cs - 2, cs - 2);
        for (let i = n - 1; i >= 1; i--) {
          const b = body[i];
          const a = dirOf(b, body[i - 1]), z = i < n - 1 ? dirOf(b, body[i + 1]) : a;
          const ch = i >= n - 1 && n > 4 ? (a === "L" || a === "R" ? "═" : "║") : BOX[[a, z].sort().join("")] ?? "═";
          ctx.globalAlpha = (grace > 0 ? 0.5 : 1) * (0.4 + 0.6 * (1 - i / (n + 3)));
          put(ch, col, b.x, b.y, true);
        }
        ctx.globalAlpha = grace > 0 ? 0.6 : 1;
        const h = body[0];
        ctx.fillStyle = root ? "rgba(255,61,154,0.18)" : "rgba(170,255,187,0.12)";
        ctx.fillRect(gx + h.x * cs, gy + h.y * cs, cs, cs);
        put(root ? "#" : HEAD[dirOf({ x: 0, y: 0 }, dir)], root ? C.pink : C.br, h.x, h.y, false, 10);
        ctx.globalAlpha = 1;
      }
      if (root) E.hpBar(gx, gy - Math.min(pad, 7), gw, sudoT / SUDO_S, C.pink);

      // prompt
      const py = gy + gh + PL / 2 + 2;
      ctx.font = E.font(fs + (narrow ? 1 : 1.5));
      const pch = ctx.measureText("0").width;
      const user = narrow ? (root ? "# " : "~/covid$ ") : root ? "root@glud:~/covid# " : "juferoga@glud:~/covid$ ";
      ctx.fillStyle = root ? C.pink : C.acc; ctx.fillText(user, gx, py);
      const max = Math.floor(gw / pch) - user.length - 1;
      const shown = prompt.slice(0, Math.floor(promptT * 45));
      let tx = gx + user.length * pch;
      text(shown, tx, py, C.br, max);
      tx += Math.min(shown.length, max) * pch;
      if (!turned && shown.length === prompt.length) {
        const hint = E.coarse ? t("  # desliza para girar", "  # swipe to turn") : t("  # ← ↑ → ↓ / WASD", "  # ← ↑ → ↓ / WASD");
        text(hint, tx, py, "rgba(255,255,255,0.4)", Math.max(0, max - shown.length));
        tx += Math.min(hint.length, Math.max(0, max - shown.length)) * pch;
      }
      if (E.reduce || Math.floor(clock * 2) % 2 === 0) { ctx.fillStyle = C.br; ctx.fillRect(tx + 1, py - fs * 0.6, pch * 0.9, fs * 1.25); }

      // panel: curva SIR en ASCII
      if (pan.h > 0) {
        ctx.font = E.font(fs);
        const cols = Math.min(chartCols, hist.length), from = hist.length - cols;
        const SCALE = 0.4;
        ctx.fillStyle = sir.I > 0.2 ? C.err : sir.I > 0.08 ? C.warn : C.fg;
        for (let r = 0; r < chartRows; r++) {
          let s = "";
          const lvl = chartRows - 1 - r;
          for (let i = 0; i < cols; i++) {
            const v = clamp(hist[from + i] / SCALE, 0, 1) * chartRows - lvl;
            s += v >= 1 ? "█" : v <= 0 ? " " : SPARK[Math.max(1, Math.round(v * 8))];
          }
          ctx.fillText(s, chartX, chartY + r * lh);
        }
        const q = walls.some(wallSolid);
        const st = `S ${sir.S.toFixed(2)}  I ${sir.I.toFixed(2)}  R ${sir.R.toFixed(2)}  ${q ? t("β↓ cuarentena", "β↓ lockdown") : "R₀ 3.5"}`;
        text(st, pan.x + (side ? 0 : 0), statsY, q ? C.warn : "rgba(255,255,255,0.6)", Math.floor(pan.w / chW));
        if (side) {
          if (dateDay !== day) { dateDay = day; dateStr = new Date(Date.UTC(2020, 2, 24 + day)).toISOString().slice(0, 10); }
          ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText(t(`día ${day}`, `day ${day}`), pan.x + pan.w, chartY + chartRows * lh - lh * 0.15);
          ctx.textAlign = "left";
        }
        // árbol de repos
        if (treeY > 0) {
          for (let i = 0; i < TREE.length; i++) {
            const on = eaten > firstCommit[i];
            const [name, tag] = TREE[i];
            const s = `${i === TREE.length - 1 ? "└──" : "├──"} ${name}${tag ? "  " + tag : ""}`;
            text(s, pan.x, treeY + lh * (i + 1.2), on ? (name === "grub2-theme-glud" ? C.warn : C.br) : "rgba(255,255,255,0.22)", Math.floor(pan.w / chW));
          }
        }
        // log
        if (logN > 0) {
          const maxC = Math.floor(pan.w / chW);
          const shownLog = log.slice(-logN);
          for (let i = 0; i < shownLog.length; i++) {
            const l = shownLog[i];
            ctx.globalAlpha = 0.45 + 0.55 * ((i + 1) / shownLog.length);
            text(l.s, pan.x, logY + i * lh, l.c, maxC);
          }
          ctx.globalAlpha = 1;
        }
      }
      // fecha en la barra de tmux
      if (SB > 0) {
        if (dateDay !== day) { dateDay = day; dateStr = new Date(Date.UTC(2020, 2, 24 + day)).toISOString().slice(0, 10); }
        ctx.font = E.font(fs, true); ctx.textAlign = "right"; ctx.fillStyle = "#00140a";
        ctx.fillText(`"juferoga@glud" ${dateStr}`, win.x + win.w - 10, win.y + win.h - SB / 2 + 1);
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
    },
  };
}
