// MUTANT.EXE — el easter egg de `pong`: un pong que, al ganarlo, "se corrompe" y muta.
// Modo historia: un nivel por año del timeline (src/data/timeline.ts), cada uno inspirado en un hito real.
//   2019 pong.sh          → los orígenes: el pong clásico
//   2020 snake.py         → "la serpiente antes de la cuarentena"
//   2021 fisica3d.m       → Física 1 en MATLAB: pong en un túnel 3D
//   2022 catastro.exe     → el año "callado" en la Agencia Catastral: delimitar predios (estilo Xonix)
//   2023 bd-2.sql         → el gran año: breakout con exactamente 380 bloques (sus 380 commits)
//   2024 multimedia.gd    → "un shooter 2D en Godot" + el salto al banco: naves con jefe legacy
//   2025 clean-arch.nes   → Clean Architecture y second brain: plataformas old school
//   2026 kernel-panic.sh  → la maestría en IA: shooter en primera persona
// pong, pong 3D y naves viven aquí; el resto en arcade/games/*.ts (API en arcade/engine.ts).
// Todo en canvas 2D, sin dependencias. Las vidas se recargan en cada nivel; el puntaje se acumula.

import { clamp, rand, TAU, type Beep, type Engine, type GameFactory, type GameMeta, type Scene } from "./arcade/engine";
import * as snakeGame from "./arcade/games/snake";
import * as catastroGame from "./arcade/games/catastro";
import * as breakoutGame from "./arcade/games/breakout";
import * as platformerGame from "./arcade/games/platformer";
import * as fpsGame from "./arcade/games/fps";

export interface ArcadeResult { score: number; stage: number; cleared: boolean; hi: number; newHi: boolean }
export interface ArcadeOpts {
  lang: "es" | "en";
  beep: Beep;
  start?: number; // etapa inicial (0..STAGE_COUNT-1), solo si ya se desbloqueó
  onExit: (r: ArcadeResult) => void;
}

/** año y archivo de cada nivel (lo usa también la terminal para `pong 2023`) */
export const STAGE_INFO = [
  { year: 2019, file: "pong.sh" }, { year: 2020, file: "snake.py" }, { year: 2021, file: "fisica3d.m" },
  { year: 2022, file: "catastro.exe" }, { year: 2023, file: "bd-2.sql" }, { year: 2024, file: "multimedia.gd" },
  { year: 2025, file: "clean-arch.nes" }, { year: 2026, file: "kernel-panic.sh" },
] as const;
export const STAGE_COUNT = STAGE_INFO.length;
const LS_STAGE = "arcadeLevel"; // clave nueva: el progreso del arcade de 4 niveles no corresponde
const LS_HI = "arcadeHi";

const lsGet = (k: string) => { try { return parseInt(localStorage.getItem(k) || "0", 10) || 0; } catch { return 0; } };
const lsSet = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch {} };

/** Última etapa a la que ha llegado este navegador (para `pong 3`, etc.). */
// en desarrollo todo está desbloqueado (para probar cualquier nivel con `pong N`)
export const unlockedStage = () => (import.meta.env.DEV ? STAGE_COUNT - 1 : Math.min(STAGE_COUNT - 1, lsGet(LS_STAGE)));



interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

export function startArcade(o: ArcadeOpts): void {
  const t = (es: string, en: string) => (o.lang === "en" ? en : es);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  const cvs = document.createElement("canvas");
  cvs.id = "game-canvas";
  cvs.tabIndex = 0;
  cvs.setAttribute("role", "img");
  cvs.setAttribute("aria-label", t("Mini-juego MUTANT.EXE — Escape para salir", "MUTANT.EXE mini-game — Escape to quit"));
  document.body.appendChild(cvs);
  cvs.focus({ preventScroll: true });
  const ctx = cvs.getContext("2d")!;

  const css = getComputedStyle(document.body);
  const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
  const C = {
    fg: v("--fg", "#33ff66"), dim: v("--fg-dim", "#1f9943"), br: v("--fg-bright", "#aaffbb"),
    acc: v("--accent", "#00ffaa"), warn: v("--warn", "#ffcc33"), err: v("--error", "#ff5555"),
    pink: "#ff3d9a", cyan: "#3dd9ff", violet: "#a970ff",
  };
  const FONT = "JetBrains Mono, Courier New, monospace";
  const font = (px: number, bold = false) => `${bold ? "bold " : ""}${Math.round(px)}px ${FONT}`;

  // ── lienzo adaptado a la pantalla ───────────────────────────────────────────
  // El juego vive en un espacio lógico W×H: en pantallas grandes se escala (K > 1) para que
  // nada se vea diminuto, y el búfer real se limita a un presupuesto de píxeles (PX_BUDGET)
  // para que monitores 4K / retina no hundan los FPS. Si aun así va lento, baja la calidad.
  const PX_BUDGET = 2_000_000;
  let W = 0, H = 0, K = 1, S = 1; // S = píxeles del búfer por unidad lógica
  let hq = true; // brillos (shadowBlur) y scanlines: lo más caro, sobre todo en Firefox
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    K = Math.max(1, Math.min(vw, vh) / 820);
    W = vw / K; H = vh / K;
    const R = Math.min(window.devicePixelRatio || 1, hq ? 2 : 1, Math.sqrt(PX_BUDGET / (vw * vh)));
    cvs.width = Math.round(vw * R); cvs.height = Math.round(vh * R);
    // un <canvas> no se estira con inset:0 (usa su tamaño intrínseco): fijamos el tamaño CSS
    cvs.style.width = `${vw}px`; cvs.style.height = `${vh}px`;
    S = cvs.width / W;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = true;
    scene?.resize?.();
  }
  /** coordenadas de pantalla → espacio lógico del juego */
  const lx = (x: number) => x / K, ly = (y: number) => y / K;

  // gobernador de calidad: si el promedio de frame supera ~24 ms durante 1,5 s, apaga lo caro
  let frameAvg = 1 / 60, slowFor = 0;
  function governor(rawDt: number) {
    frameAvg = frameAvg * 0.95 + rawDt * 0.05;
    if (!hq) return;
    slowFor = frameAvg > 0.024 ? slowFor + rawDt : 0;
    if (slowFor > 1.5) { hq = false; resize(); }
  }

  // scanlines como patrón (una sola llamada de dibujo en vez de cientos de rectángulos)
  const scan = document.createElement("canvas");
  scan.width = 1; scan.height = 3;
  const sg = scan.getContext("2d")!; sg.fillStyle = "rgba(0,0,0,0.12)"; sg.fillRect(0, 0, 1, 1);
  const scanPattern = ctx.createPattern(scan, "repeat");

  // ── entrada ─────────────────────────────────────────────────────────────────
  const keys = new Set<string>();
  const key = (...ks: string[]) => ks.some((k) => keys.has(k));
  const ptr = { x: 0, y: 0, down: false, moved: false, lookDX: 0, lookDY: 0 };
  // toques activos (para el joystick virtual del shooter)
  const touches = new Map<number, { x: number; y: number; sx: number; sy: number }>();

  // ── sonido: todo pasa por el beep de la terminal (respeta 🔇) ───────────────
  const sfx = {
    blip: () => o.beep(660, 14),
    bounce: () => o.beep(420, 12),
    wall: () => o.beep(300, 20),
    shoot: () => o.beep(1250, 10, 0.02),
    hit: () => o.beep(200, 40),
    boom: () => { o.beep(90, 140, 0.06); setTimeout(() => o.beep(60, 160, 0.05), 60); },
    hurt: () => { o.beep(160, 120, 0.06); setTimeout(() => o.beep(110, 160, 0.05), 90); },
    power: () => { o.beep(880, 40); setTimeout(() => o.beep(1320, 60), 60); },
    point: () => { o.beep(990, 50); setTimeout(() => o.beep(1480, 70), 70); },
  };

  // ── estado global ───────────────────────────────────────────────────────────
  type State = "intro" | "play" | "paused" | "trans" | "over" | "end";
  let state: State = "intro";
  let stage = clamp(o.start ?? 0, 0, unlockedStage());
  let score = 0, stageStartScore = 0, lives = 3;
  const maxLives = () => (stage === 0 ? 5 : 3); // el pong de entrada perdona más
  let hi = lsGet(LS_HI);
  const startHi = hi;
  let reached = stage;
  let scene: Scene | null = null;
  let nextScene: Scene | null = null;
  let transT = 0, introT = 0, shake = 0, flash = 0, hurtCool = 0;
  const particles: Particle[] = [];

  const mouseOr = (m: string, k: string) => (coarse ? m : k);
  type Stage = { era: string; name: string; story: string; goal: string; tip: string; ctrl: string; make: () => Scene };
  /** un juego en módulo (games/*.ts) aporta sus textos con `meta` */
  const mod = (era: string, g: { meta: GameMeta; create: GameFactory }): Stage => {
    const L = (x: { es: string; en: string }) => t(x.es, x.en);
    return {
      era, name: L(g.meta.name), story: L(g.meta.story), goal: L(g.meta.goal), tip: L(g.meta.tip),
      ctrl: coarse ? L(g.meta.ctrl.touch) : L(g.meta.ctrl.desktop), make: () => g.create(E),
    };
  };
  const STAGES = ([
    { era: t("los orígenes", "the origins"), name: "PONG", make: () => pong2D(),
      story: t("SENA, primer repo y ejercicios en C/C++. Todo empieza con algo simple.", "SENA, first repo and C/C++ exercises. It all starts with something simple."),
      goal: t("Mete 3 goles: que la bola pase la pala rosada de la CPU (derecha).", "Score 3 goals: get the ball past the CPU's pink paddle (right)."),
      tip: t("Devuelve 3 seguidas y la bola se enciende 🔥 · pierdes ♥ si la bola pasa tu pala", "Return 3 in a row and the ball catches fire 🔥 · you lose ♥ if the ball gets past you"),
      ctrl: mouseOr(t("arrastra para mover la pala", "drag to move the paddle"), t("ratón · W/S · ↑/↓", "mouse · W/S · ↑/↓")) },
    mod(t("pandemia y GLUD dorado", "pandemic and GLUD's golden age"), snakeGame),
    { era: t("universidad plena", "full-on university"), name: t("PONG 3D", "3D PONG"), make: () => pong3D(),
      story: t("Física 1 en MATLAB (y en YouTube): el pong ahora tiene profundidad.", "Physics 1 in MATLAB (and on YouTube): pong now has depth."),
      goal: t("Mete 3 goles: que la bola pase la pala rosada del fondo del túnel.", "Score 3 goals: get the ball past the pink paddle at the end of the tunnel."),
      tip: t("El anillo verde marca qué tan lejos está la bola · muévete al golpear para darle efecto", "The green ring shows how far the ball is · move as you hit to add spin"),
      ctrl: mouseOr(t("arrastra para mover la pala", "drag to move the paddle"), t("ratón · WASD · flechas", "mouse · WASD · arrows")) },
    mod(t("el año callado (solo en apariencia)", "the quiet year (only on the surface)"), catastroGame),
    mod(t("el gran año", "the big year"), breakoutGame),
    { era: t("el salto profesional", "the professional leap"), name: t("NAVES", "STARSHIPS"), make: () => shmup(),
      story: t("\"Un shooter 2D en Godot\" y la prueba técnica que abrió la puerta del banco.", "\"A 2D shooter in Godot\" and the tech test that opened the bank's door."),
      goal: t("Sobrevive a 3 oleadas de bugs y derriba al jefe: el MONOLITO LEGACY.", "Survive 3 bug waves and take down the boss: the LEGACY MONOLITH."),
      tip: t("Disparas solo: tú esquiva · recoge 3x (triple), ◇ (escudo) y ♥ (vida)", "You fire automatically: just dodge · grab 3x (triple), ◇ (shield) and ♥ (life)"),
      ctrl: mouseOr(t("arrastra para volar · disparo automático", "drag to fly · auto-fire"), t("ratón o WASD · disparo automático", "mouse or WASD · auto-fire")) },
    mod(t("un 2025 callado", "a quiet 2025"), platformerGame),
    mod(t("maestría y presente", "master's and the present"), fpsGame),
  ] as Stage[]).map((st, i) => ({ ...st, ...STAGE_INFO[i] }));


  const addScore = (n: number) => { score += n; };

  function burst(x: number, y: number, color: string, n = 18, speed = 220, size = 3) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(0.25, 1) * speed, life = rand(0.35, 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: rand(size * 0.6, size * 1.4) });
    }
  }
  function shakeIt(n: number) { if (!reduce) shake = Math.max(shake, n); }

  /** El jugador recibe daño. Devuelve true si aún le quedan vidas. */
  function hurt(): boolean {
    if (hurtCool > 0 || state !== "play") return true;
    hurtCool = 0.9;
    lives--;
    sfx.hurt(); shakeIt(14); flash = 0.35;
    if (lives <= 0) { state = "over"; saveHi(); return false; }
    return true;
  }

  // ── API que reciben los juegos en módulo (ver arcade/engine.ts) ─────────────
  let elapsed = 0;
  const E: Engine = {
    ctx, cvs, C, coarse, reduce, keys, ptr, touches, sfx,
    get W() { return W; }, get H() { return H; }, get hq() { return hq; }, get time() { return elapsed; },
    t, font, key,
    beep: o.beep,
    burst: (x, y, color, n, speed, size) => burst(x, y, color, n, speed, size),
    shake: (n) => shakeIt(n),
    flash: (a) => { if (!reduce) flash = Math.max(flash, a); },
    hurt: () => hurt(),
    addLife: () => { lives = Math.min(5, lives + 1); },
    lives: () => lives,
    addScore: (n) => addScore(n),
    clear: () => clearStage(),
    playing: () => state === "play",
    glow: (c, b) => glow(c, b),
    hpBar: (x, y, w, f, col) => hpBar(x, y, w, f, col),
    filter: (arr, keep) => filter(arr, keep),
  };

  function saveHi() { if (score > hi) { hi = score; lsSet(LS_HI, hi); } }

  function startStage(i: number) {
    stage = i; lives = maxLives(); stageStartScore = score; hurtCool = 0;
    particles.length = 0;
    scene?.dispose?.(); if (document.pointerLockElement === cvs) document.exitPointerLock?.();
    scene = STAGES[i].make();
    state = "intro"; introT = 0;
  }

  /** Nivel superado: el programa "crashea" y muta en el siguiente. */
  function clearStage() {
    if (state !== "play") return;
    addScore(1000 * (stage + 1) + lives * 250);
    sfx.point();
    saveHi();
    if (stage + 1 >= STAGE_COUNT) {
      reached = STAGE_COUNT - 1; lsSet(LS_STAGE, reached);
      state = "end"; burstConfetti();
      return;
    }
    reached = Math.max(reached, stage + 1);
    lsSet(LS_STAGE, Math.max(lsGet(LS_STAGE), stage + 1));
    state = "trans"; transT = 0; nextScene = null;
  }

  function burstConfetti() {
    for (let i = 0; i < 6; i++) burst(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.6), [C.acc, C.pink, C.warn, C.cyan][i % 4], 30, 320, 4);
  }

  // ── fondos de época: capas pre-renderizadas ────────────────────────────────
  // Se pintan una vez (al crear la escena y en cada resize) a la resolución real del búfer (S)
  // y por frame solo se copian con drawImage: lo único que se anima son trazos baratos.
  function bgLayer(paint: (g: CanvasRenderingContext2D) => void, w = W, h = H): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.ceil(w * S)); cv.height = Math.max(1, Math.ceil(h * S));
    const g = cv.getContext("2d")!;
    g.scale(S, S); g.lineCap = "round"; g.lineJoin = "round";
    paint(g);
    return cv;
  }
  /** pseudoaleatorio determinista (el fondo no cambia al redimensionar) */
  const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  /** pixel art: cada carácter es un píxel ('.' transparente) y `pal` asigna su color */
  function pix(g: CanvasRenderingContext2D, rows: string[], x: number, y: number, px: number, pal: Record<string, string>) {
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]];
      if (col) { g.fillStyle = col; g.fillRect(x + c * px, y + r * px, px + 0.25, px + 0.25); }
    }
  }
  /** viñeta CRT: oscurece las esquinas como un tubo de fósforo */
  function vignette(g: CanvasRenderingContext2D, a: number, rgb = "0,0,0") {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    vg.addColorStop(0, `rgba(${rgb},0)`); vg.addColorStop(1, `rgba(${rgb},${a})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 1 · PONG 2D
  // ═════════════════════════════════════════════════════════════════════════════
  function pong2D(): Scene {
    // Es la puerta de entrada: tiene que sentirse ganable al primer intento.
    // Pala grande y hitbox generoso, CPU con puntería imperfecta, y una mecánica de racha:
    // tras 3 devoluciones seguidas la bola se enciende 🔥, la CPU se marea y el muro se rompe.
    const WIN = 3, PW = 12, M = 40, FIRE_AT = 3;
    let PH = 120, CH = 90;
    const p = { y: 0, score: 0, vy: 0 }, c = { y: 0, score: 0 };
    const wall = { w: 12, h: 90, y: 0, vy: 90, broken: 0 };
    const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 9 };
    const trail: { x: number; y: number }[] = [];
    let serveT = 0, rally = 0, aimErr = 0, touched = false, hintT = 0, popT = 0, popText = "";
    const fire = () => rally >= FIRE_AT;
    const fit = () => { PH = clamp(H * 0.2, 96, 150); CH = clamp(H * 0.15, 70, 110); wall.h = clamp(H * 0.12, 60, 110); };
    fit();
    p.y = H / 2 - PH / 2; c.y = H / 2 - CH / 2; wall.y = H / 2 - wall.h / 2;
    function serve(dir: number) {
      ball.x = W / 2; ball.y = H / 2;
      // el primer saque va lento hacia el jugador para que entre en calor
      const sp = touched ? 320 + p.score * 25 : 260, a = rand(-0.3, 0.3);
      ball.vx = dir * sp * Math.cos(a); ball.vy = sp * Math.sin(a);
      trail.length = 0; serveT = 0.9; rally = 0;
    }
    serve(-1);
    const pop = (txt: string) => { popText = txt; popT = 1.1; };

    // ── fondo 2019 · los orígenes ──
    // código en fósforo que sube despacio (C de Fundamentos, hilos en Java, A-Frame, AMPL, Arch-Matic),
    // un horizonte en malla con la escena "hola mundo" de A-Frame, Tux y GLUDZILLA-VR en píxeles,
    // el prompt de la terminal y un marco de monitor CRT
    const CODE = [
      t("/* fundamentos.c — 82 commits en equipo */", "/* fundamentos.c — 82 team commits */"), "#include <stdio.h>", "",
      "int main(void) {", "    int n, i;", "    scanf(\"%d\", &n);", "    for (i = 1; i <= n; i++)", "        printf(\"%d\\n\", i * i);", "    return 0;", "}", "",
      "$ gcc fundamentos.c -o fund -Wall", "$ ./fund", "",
      t("// hilos: ¿Quién ganará la carrera?", "// threads: who will win the race?"),
      "class Corredor extends Thread {", "    public void run() {", "        while (pos < META) avanzar();", "    }", "}", "",
      "<a-scene>", "  <a-box color=\"#4CC3D9\"></a-box>", "  <a-sphere color=\"#EF2D5E\"></a-sphere>", "  <a-cylinder color=\"#FFC65D\"></a-cylinder>", "</a-scene>", "",
      t("# optimización en AMPL", "# optimization in AMPL"), "minimize costo: sum {i in I} c[i] * x[i];", "",
      "$ git init   # 2018-08-30", "$ git push origin master", "",
      "# arch-matic.sh", t("# NO EJECUTAR DIRECTAMENTE", "# DO NOT RUN DIRECTLY"), "$ sudo pacman -Syu", "",
      "/* JuanFelipeCV — GNU GPL v3 */", "$ man gnubies", "",
    ];
    const LH = 15;
    let codeL: HTMLCanvasElement | null = null, bgL: HTMLCanvasElement | null = null, hz = 0, promptW = 0, promptY = 0;
    function buildBg() {
      hz = Math.round(H * 0.8);
      const u = clamp(Math.min(W, H) * 0.045, 14, 30), narrow = W < 600;
      codeL = bgLayer((g) => {
        g.font = font(narrow ? 10 : 12); g.textBaseline = "top"; g.fillStyle = C.fg;
        const n = CODE.length, colW = Math.max(300, W / 2);
        for (let col = 0, x = M + PW + 26; x < W - 40; col++, x += colW) {
          for (let i = 0; i < n; i++) {
            const line = CODE[(i + col * 19) % n];
            g.globalAlpha = (line.startsWith("$") ? 0.17 : line.startsWith("/") || line.startsWith("#") ? 0.08 : 0.11) * (narrow ? 0.7 : 1);
            g.fillText(line, x, i * LH);
          }
        }
      }, W, CODE.length * LH);
      bgL = bgLayer((g) => {
        // suelo: tapa el código bajo el horizonte y recibe la malla en perspectiva
        const fl = g.createLinearGradient(0, hz - 50, 0, H);
        fl.addColorStop(0, "rgba(0,0,0,0)"); fl.addColorStop(50 / (H - hz + 50), "rgba(0,0,0,0.92)"); fl.addColorStop(1, "rgba(0,0,0,0.96)");
        g.fillStyle = fl; g.fillRect(0, hz - 50, W, H - hz + 50);
        g.strokeStyle = C.fg; g.lineWidth = 1;
        g.globalAlpha = 0.16; g.beginPath();
        for (let i = -24; i <= 24; i++) { g.moveTo(W / 2 + i * 22, hz); g.lineTo(W / 2 + i * 120, H); }
        g.stroke();
        g.globalAlpha = 0.45; g.beginPath(); g.moveTo(0, hz); g.lineTo(W, hz); g.stroke();
        // la escena de ejemplo de A-Frame en alambre: caja, esfera y cilindro
        const ax = W * (narrow ? 0.2 : 0.335), ay = hz - u * 0.15;
        g.globalAlpha = 0.5; g.lineWidth = 1.2;
        g.strokeStyle = "#4CC3D9"; // caja (dos caras visibles + profundidad)
        const bx = ax - u * 2.1, bs = u * 1.1, d = bs * 0.45;
        g.strokeRect(bx, ay - bs, bs, bs);
        g.beginPath(); g.moveTo(bx, ay - bs); g.lineTo(bx + d, ay - bs - d); g.lineTo(bx + bs + d, ay - bs - d); g.lineTo(bx + bs, ay - bs);
        g.moveTo(bx + bs + d, ay - bs - d); g.lineTo(bx + bs + d, ay - d); g.lineTo(bx + bs, ay); g.stroke();
        g.strokeStyle = "#EF2D5E"; // esfera con meridianos
        const sr = u * 0.75, sy = ay - sr - u * 0.35;
        g.beginPath(); g.arc(ax, sy, sr, 0, TAU); g.stroke();
        g.beginPath(); g.ellipse(ax, sy, sr * 0.4, sr, 0, 0, TAU); g.ellipse(ax, sy, sr, sr * 0.32, 0, 0, TAU); g.stroke();
        g.strokeStyle = "#FFC65D"; // cilindro
        const cxl = ax + u * 1.9, cr = u * 0.5, ch = u * 1.5;
        g.beginPath(); g.ellipse(cxl, ay - ch, cr, cr * 0.32, 0, 0, TAU); g.stroke();
        g.beginPath(); g.ellipse(cxl, ay, cr, cr * 0.32, 0, 0, Math.PI); g.moveTo(cxl - cr, ay); g.lineTo(cxl - cr, ay - ch); g.moveTo(cxl + cr, ay); g.lineTo(cxl + cr, ay - ch); g.stroke();
        g.globalAlpha = 0.32; g.fillStyle = C.fg; g.font = font(10); g.textAlign = "center";
        g.fillText("<a-scene>", ax, hz + 16);
        // Tux (linuxero de corazón) y GLUDZILLA-VR, en píxeles de fósforo
        const px = Math.max(2, Math.round(u / 7));
        const TUX = [
          "...kkkk...", "..kkkkkk..", "..kwkkwk..", "..kkyykk..", ".kkwwwwkk.", ".kwwwwwwk.",
          "kkwwwwwwkk", "kwwwwwwwwk", "kwwwwwwwwk", ".kwwwwwwk.", ".yykkkkyy.", "yyy....yyy",
        ];
        g.globalAlpha = 0.42;
        pix(g, TUX, Math.round(W * 0.44), hz - TUX.length * px + px, px, { k: C.dim, w: C.br, y: C.warn });
        const ZILLA = [
          ".........ggggg..", "........ggwgggg.", "........ggggggg.", "........gggg....", "...s...ggggggg..",
          "...ss.ggggggg...", "s..sssgggggg....", "ss..sggggggggg..", ".ssggggggggg.g..", "..gggggggggg....",
          "...ggggggggg....", ".....gg..gg.....", ".....gg...gg....",
        ];
        const zpx = px + 1, zx = Math.round(W * 0.72);
        g.globalAlpha = 0.4;
        pix(g, ZILLA, zx, hz - ZILLA.length * zpx + zpx, zpx, { g: C.fg, w: C.br, s: C.pink });
        g.globalAlpha = 0.3; g.font = font(9); g.fillStyle = C.fg;
        g.fillText("GLUDZILLA-VR", zx + 8 * zpx, hz + 16);
        g.fillText("GNU/Linux", Math.round(W * 0.44) + 5 * px, hz + 16);
        // prompt de la terminal sobre el horizonte (el cursor parpadea en draw)
        g.globalAlpha = 0.5; g.textAlign = "left"; g.font = font(12); g.fillStyle = C.fg;
        const pr = narrow ? "~/sena$ ./pong.sh " : "juferoga@arch:~/sena$ ./pong.sh ";
        promptY = narrow ? hz + 44 : hz - 12;
        g.fillText(pr, M + PW + 26, promptY); promptW = g.measureText(pr).width;
        // monitor CRT: viñeta + bisel redondeado
        g.globalAlpha = 1; vignette(g, 0.6);
        g.globalAlpha = 0.28; g.strokeStyle = C.dim; g.lineWidth = 2;
        g.beginPath(); g.roundRect(5, 5, W - 10, H - 10, 22); g.stroke();
      });
    }
    buildBg();

    return {
      resize: () => { fit(); buildBg(); },
      objective: () => t(`🎯 Goles ${p.score}/${WIN}`, `🎯 Goals ${p.score}/${WIN}`),
      update(dt) {
        const py0 = p.y;
        if (ptr.moved) p.y = ptr.y - PH / 2;
        if (key("arrowup", "w")) p.y -= 620 * dt;
        if (key("arrowdown", "s")) p.y += 620 * dt;
        p.y = clamp(p.y, 0, H - PH);
        p.vy = (p.y - py0) / Math.max(dt, 1e-3);
        if (p.y !== py0) touched = true;
        hintT += dt; popT = Math.max(0, popT - dt);

        // CPU: solo reacciona cuando la bola pasa de cierto punto y apunta con error;
        // con la bola en llamas se "marea" y se mueve más lento
        let target = H / 2 - CH / 2;
        if (ball.vx > 0 && ball.x > W * 0.4) target = ball.y - CH / 2 + aimErr;
        const cs = (220 + c.score * 20 + p.score * 15) * (fire() ? 0.55 : 1);
        c.y = clamp(c.y + clamp(target - c.y, -cs * dt, cs * dt), 0, H - CH);

        // el muro travieso aparece cuando anotas el primer punto
        const wallOn = p.score > 0 && wall.broken <= 0;
        wall.broken = Math.max(0, wall.broken - dt);
        if (p.score > 0) {
          wall.y += wall.vy * dt;
          if (wall.y <= 0 || wall.y + wall.h >= H) { wall.vy *= -1; wall.y = clamp(wall.y, 0, H - wall.h); }
        }

        if (serveT > 0) { serveT -= dt; return; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        trail.push({ x: ball.x, y: ball.y }); if (trail.length > (fire() ? 22 : 12)) trail.shift();

        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); sfx.bounce(); }
        else if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); sfx.bounce(); }

        const VMAX = 680, slack = ball.r * 1.6; // hitbox generoso: rozar la pala cuenta
        if (ball.vx < 0 && ball.x - ball.r <= M + PW && ball.x > M - 14 && ball.y >= p.y - slack && ball.y <= p.y + PH + slack) {
          // el ángulo depende de dónde pega en la pala (control clásico) + un poco del movimiento
          const off = clamp((ball.y - (p.y + PH / 2)) / (PH / 2), -1, 1);
          const sp = Math.min(VMAX, Math.hypot(ball.vx, ball.vy) * 1.04);
          const ang = off * 0.85 + clamp(p.vy / 4000, -0.25, 0.25);
          ball.vx = Math.cos(ang) * sp; ball.vy = Math.sin(ang) * sp;
          ball.x = M + PW + ball.r;
          rally++; addScore(fire() ? 50 : 10);
          aimErr = rand(-1, 1) * CH * (fire() ? 0.95 : 0.6);
          if (rally === FIRE_AT) { pop(t("🔥 ¡EN LLAMAS!", "🔥 ON FIRE!")); sfx.power(); shakeIt(6); }
          else if (rally > FIRE_AT) pop(`RALLY x${rally}`);
          sfx.blip(); burst(ball.x, ball.y, fire() ? C.warn : C.acc, fire() ? 16 : 8, 180, 2);
        }
        if (ball.vx > 0 && ball.x + ball.r >= W - M - PW && ball.x < W - M + 6 && ball.y >= c.y - ball.r && ball.y <= c.y + CH + ball.r) {
          const off = clamp((ball.y - (c.y + CH / 2)) / (CH / 2), -1, 1);
          const sp = Math.hypot(ball.vx, ball.vy);
          ball.vx = -Math.cos(off * 0.7) * sp; ball.vy = Math.sin(off * 0.7) * sp;
          ball.x = W - M - PW - ball.r; o.beep(600, 14);
        }
        const wx = W / 2 - wall.w / 2;
        if (wallOn && ball.x + ball.r >= wx && ball.x - ball.r <= wx + wall.w && ball.y + ball.r >= wall.y && ball.y - ball.r <= wall.y + wall.h) {
          if (fire()) {
            // la bola en llamas atraviesa y rompe el muro por un rato
            wall.broken = 4; addScore(150); pop(t("💥 ¡MURO ROTO!", "💥 WALL SMASHED!"));
            sfx.boom(); shakeIt(10); burst(W / 2, wall.y + wall.h / 2, C.warn, 34, 320, 4);
          } else {
            if (ball.vx > 0) { ball.vx = -Math.abs(ball.vx); ball.x = wx - ball.r; } else { ball.vx = Math.abs(ball.vx); ball.x = wx + wall.w + ball.r; }
            sfx.wall(); burst(ball.x, ball.y, C.warn, 10, 180, 2);
          }
        }

        if (ball.x < -30) {
          c.score++; burst(10, ball.y, C.err, 24, 300);
          if (hurt()) serve(-1);
        } else if (ball.x > W + 30) {
          p.score++; addScore(250); sfx.point(); burst(W - 10, ball.y, C.acc, 24, 300);
          if (p.score >= WIN) clearStage(); else { pop(p.score === 1 ? t("¡PUNTO! …¿y ese muro?", "POINT! …what's that wall?") : t("¡PUNTO!", "POINT!")); serve(-1); }
        }
      },
      draw() {
        ctx.fillStyle = "rgba(0,0,0,0.88)"; ctx.fillRect(0, 0, W, H);
        // fondo de época: código que sube, suelo en malla con líneas que avanzan, cursor
        if (codeL && bgL) {
          const ch = CODE.length * LH, off = reduce ? 0 : (elapsed * 9) % ch;
          for (let y = 70 - off; y < hz; y += ch) ctx.drawImage(codeL, 0, y, W, ch);
          ctx.drawImage(bgL, 0, 0, W, H);
          ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
          const ph = reduce ? 0.5 : (elapsed * 0.3) % 1;
          for (let i = 0; i < 7; i++) {
            const k = (i + ph) / 7, y = hz + (H - hz) * k * k;
            ctx.globalAlpha = 0.05 + k * 0.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }
          if (reduce || Math.floor(elapsed * 2) % 2 === 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = C.fg; ctx.fillRect(M + PW + 26 + promptW, promptY - 11, 7, 13); }
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.setLineDash([8, 14]);
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.font = font(64, true); ctx.textAlign = "center";
        ctx.fillText(String(p.score), W / 2 - 90, 120); ctx.fillText(String(c.score), W / 2 + 90, 120);
        ctx.font = font(12); ctx.fillText(t("TÚ", "YOU"), W / 2 - 90, 142); ctx.fillText("CPU", W / 2 + 90, 142);
        const hot = fire();
        for (let i = 0; i < trail.length; i++) {
          ctx.globalAlpha = (i / trail.length) * (hot ? 0.7 : 0.45); ctx.fillStyle = hot ? (i % 2 ? C.warn : C.err) : C.acc;
          const sz = hot ? 4 + (i / trail.length) * 8 : 8;
          ctx.fillRect(trail[i].x - sz / 2, trail[i].y - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
        glow(C.br, 14); ctx.fillStyle = C.br; ctx.fillRect(M, p.y, PW, PH);
        glow(C.pink, 10); ctx.fillStyle = hot ? "rgba(255,61,154,0.55)" : C.pink; ctx.fillRect(W - M - PW, c.y, PW, CH);
        if (p.score > 0 && wall.broken <= 0) { glow(C.warn, 18); ctx.fillStyle = C.warn; ctx.fillRect(W / 2 - wall.w / 2, wall.y, wall.w, wall.h); }
        if (serveT <= 0 || Math.floor(serveT * 10) % 2 === 0) {
          glow(hot ? C.warn : C.acc, hot ? 26 : 18); ctx.fillStyle = hot ? "#fff3c4" : C.fg;
          ctx.fillRect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
        }
        glow(null);
        // racha visible (barra de 3 pasos hacia el modo fuego)
        ctx.textAlign = "left"; ctx.font = font(12, true);
        for (let i = 0; i < FIRE_AT; i++) { ctx.fillStyle = i < rally ? C.warn : "rgba(255,255,255,0.15)"; ctx.fillRect(M + i * 16, H - 52, 12, 6); }
        ctx.fillStyle = hot ? C.warn : "rgba(255,255,255,0.45)";
        ctx.fillText(hot ? `🔥 x${rally}` : t("racha", "streak"), M + FIRE_AT * 16 + 6, H - 46);
        // pista inicial si aún no ha movido la pala
        if (!touched && hintT > 0.6) {
          const a = 0.5 + Math.sin(hintT * 5) * 0.3;
          ctx.globalAlpha = a; ctx.fillStyle = C.br; ctx.textAlign = "left"; ctx.font = font(14, true);
          ctx.fillText(coarse ? t("↕ arrastra", "↕ drag") : t("↕ mueve el ratón", "↕ move your mouse"), M + PW + 16, p.y + PH / 2 + 5);
          ctx.globalAlpha = 1;
        }
        if (popT > 0) {
          ctx.globalAlpha = Math.min(1, popT * 2); ctx.textAlign = "center"; ctx.font = font(26, true);
          ctx.fillStyle = popText.startsWith("🔥") || popText.startsWith("💥") ? C.warn : C.acc;
          ctx.fillText(popText, W / 2, H / 2 - 60 - (1.1 - popT) * 30); ctx.globalAlpha = 1;
        }
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 2 · PONG 3D (túnel en perspectiva, estilo "curveball")
  // ═════════════════════════════════════════════════════════════════════════════
  function pong3D(): Scene {
    const WIN = 3, PW = 0.3, PHh = 0.22, BR = 0.07, K = 2.6;
    let RX = 0, RY = 0, cx = 0, cy = 0;
    const fit = () => { cx = W / 2; cy = H / 2 + 10; RY = H * 0.36; RX = Math.min(W * 0.44, RY * 1.45); };
    fit();
    const pl = { x: 0, y: 0, vx: 0, vy: 0, score: 0 };
    const cp = { x: 0, y: 0, score: 0 };
    const b = { x: 0, y: 0, z: 0.5, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0 };
    let serveT = 0, rally = 0;
    const s = (z: number) => 1 / (1 + z * K);
    const proj = (x: number, y: number, z: number) => ({ X: cx + x * RX * s(z), Y: cy + y * RY * s(z), S: s(z) });

    function serve(toPlayer: boolean) {
      b.x = 0; b.y = 0; b.z = toPlayer ? 0.95 : 0.05;
      const sp = 0.75 + (pl.score + cp.score) * 0.08;
      b.vz = toPlayer ? -sp : sp; b.vx = rand(-0.5, 0.5); b.vy = rand(-0.4, 0.4); b.sx = b.sy = 0;
      serveT = 0.8; rally = 0;
    }
    serve(false);

    function rect(z: number, color: string, lw = 1) {
      const a = proj(-1, -1, z), c = proj(1, 1, z);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(a.X, a.Y, c.X - a.X, c.Y - a.Y);
    }

    // ── fondo 2021 · universidad plena ──
    // una figura de MATLAB (ejes, `grid on`, tiros parabólicos de Física 1 con su leyenda y fórmulas),
    // malla en las paredes del túnel, un portal estilo Rick & Morty al fondo (la práctica de Angular),
    // el letrero ON AIR de la radio del GLUD con su onda, y el ruteo de Traefik hacia las clases que dictó
    const MB = "#0072BD", MO = "#D95319", MY = "#EDB120", PORTAL = "#97ce4c"; // colores por defecto de MATLAB
    let bgL: HTMLCanvasElement | null = null, portalL: HTMLCanvasElement | null = null, portalR = 0;
    let wide = false, air = { x: 0, y: 0 }, wave = { x: 0, y: 0, w: 0 };
    let routes: { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }[] = [];
    function buildBg() {
      const mg = cx - RX; wide = mg >= 170;
      const top = 86, bot = H - 64;
      const lineAt = (g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => { g.moveTo(x1, y1); g.lineTo(x2, y2); };
      // tiro parabólico normalizado (alcance máx. 1 a 45°) dentro de una caja
      const parabolas = (g: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, a: number) => {
        [[30, MO], [45, MB], [60, MY]].forEach(([deg, col], k) => {
          const th = (deg as number) * Math.PI / 180, R = Math.sin(2 * th), Hm = Math.sin(th) ** 2 / 2;
          g.strokeStyle = col as string; g.fillStyle = col as string; g.globalAlpha = a; g.lineWidth = 1.5; g.beginPath();
          for (let i = 0; i <= 40; i++) {
            const f = i / 40, x = bx + f * R * bw, y = by - (4 * Hm * f * (1 - f)) / 0.5 * bh * 0.5;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
          for (let i = 0; i <= 40; i += 5) { // marcadores 'o' de plot()
            const f = i / 40; g.beginPath(); g.arc(bx + f * R * bw, by - (4 * Hm * f * (1 - f)) / 0.5 * bh * 0.5, 2.2, 0, TAU); g.stroke();
          }
          if (k === 1) { // vector velocidad inicial
            g.beginPath(); lineAt(g, bx, by, bx + bw * 0.16, by - bh * 0.16 * 1.4);
            lineAt(g, bx + bw * 0.16, by - bh * 0.224, bx + bw * 0.16 - 8, by - bh * 0.224 + 2); lineAt(g, bx + bw * 0.16, by - bh * 0.224, bx + bw * 0.16 - 3, by - bh * 0.224 + 8); g.stroke();
          }
        });
        // ejes de la figura
        g.globalAlpha = a * 0.8; g.strokeStyle = "#9aa4b1"; g.lineWidth = 1; g.beginPath();
        lineAt(g, bx, by - bh, bx, by); lineAt(g, bx, by, bx + bw, by);
        for (let i = 0; i <= 4; i++) { lineAt(g, bx + (bw * i) / 4, by, bx + (bw * i) / 4, by + 4); lineAt(g, bx - 4, by - (bh * i) / 4, bx, by - (bh * i) / 4); }
        g.stroke();
        g.fillStyle = "#9aa4b1"; g.font = font(9); g.textAlign = "center";
        for (let i = 0; i <= 4; i++) g.fillText(String(i * 10), bx + (bw * i) / 4, by + 14);
        g.textAlign = "right"; for (let i = 1; i <= 4; i++) g.fillText(String(i * 5), bx - 6, by - (bh * i) / 4 + 3);
        g.textAlign = "center"; g.fillText("x [m]", bx + bw / 2, by + 26);
      };
      bgL = bgLayer((g) => {
        // grid on: cuadrícula punteada de fondo
        g.strokeStyle = "#ffffff"; g.globalAlpha = 0.035; g.lineWidth = 1; g.setLineDash([2, 4]); g.beginPath();
        for (let x = 40; x < W; x += 40) lineAt(g, x, top, x, bot);
        for (let y = top; y < bot; y += 40) lineAt(g, 0, y, W, y);
        g.stroke(); g.setLineDash([]);
        // malla longitudinal en las cuatro caras del túnel (estilo mesh() / display vectorial)
        g.strokeStyle = C.fg; g.globalAlpha = 0.07; g.beginPath();
        for (let k = -3; k <= 3; k++) {
          const f = k / 4;
          for (const [x, y] of [[f, 1], [f, -1], [1, f], [-1, f]]) { const a = proj(x, y, 0), b = proj(x, y, 1); lineAt(g, a.X, a.Y, b.X, b.Y); }
        }
        g.stroke();
        if (wide) {
          // margen izquierdo: fórmulas arriba, gráfica abajo
          const lx = 22;
          g.textAlign = "left"; g.font = font(11); g.fillStyle = C.fg;
          const F = [
            ">> fisica3d", "", "F = m·a", "x(t) = v₀·cos θ·t", t("y(t) = v₀·sen θ·t − ½·g·t²", "y(t) = v₀·sin θ·t − ½·g·t²"),
            "g = 9.81 m/s²", "", ">> plot(x, y, 'o-')", ">> legend('30°','45°','60°')",
          ];
          F.forEach((l, i) => { g.globalAlpha = l.startsWith(">>") ? 0.28 : 0.4; g.fillText(l, lx, top + 28 + i * 18); });
          const bw = Math.min(mg - 70, 230), bh = bw * 0.8;
          parabolas(g, lx + 18, Math.min(bot - 30, top + 230 + bh), bw, bh, 0.5);
          // leyenda de MATLAB
          const ly = Math.min(bot - 30, top + 230 + bh) - bh - 6;
          g.globalAlpha = 0.35; g.strokeStyle = "#9aa4b1"; g.strokeRect(lx + 18 + bw - 74, ly, 74, 48);
          [["30°", MO], ["45°", MB], ["60°", MY]].forEach(([l, col], i) => {
            g.globalAlpha = 0.6; g.strokeStyle = col; g.beginPath(); lineAt(g, lx + bw - 48, ly + 12 + i * 13, lx + bw - 30, ly + 12 + i * 13); g.stroke();
            g.fillStyle = "#c9d1d9"; g.textAlign = "left"; g.font = font(9); g.fillText(l, lx + bw - 24, ly + 15 + i * 13);
          });
          // margen derecho: radio del GLUD + ruteo de Traefik
          const rx = W - mg / 2;
          air = { x: rx, y: top + 30 };
          g.globalAlpha = 0.4; g.fillStyle = "#c9d1d9"; g.textAlign = "center"; g.font = font(10);
          g.fillText(t("radio GLUD · OBS", "GLUD radio · OBS"), rx, top + 64);
          wave = { x: rx - Math.min(mg * 0.38, 90), y: top + 96, w: Math.min(mg * 0.76, 180) };
          g.globalAlpha = 0.15; g.strokeStyle = C.fg; g.strokeRect(wave.x, wave.y - 18, wave.w, 36);
          // traefik: :443 → proxy → servicios (las clases de Angular y Docker, la API de Rick & Morty)
          const ty = top + 176, tw = Math.min(mg - 40, 200), tx = rx - tw / 2;
          const box = (x: number, y: number, w: number, label: string, col: string) => {
            g.globalAlpha = 0.18; g.fillStyle = col; g.fillRect(x, y - 11, w, 22);
            g.globalAlpha = 0.5; g.strokeStyle = col; g.strokeRect(x, y - 11, w, 22);
            g.globalAlpha = 0.7; g.fillStyle = "#c9d1d9"; g.font = font(10); g.textAlign = "center"; g.fillText(label, x + w / 2, y + 4);
          };
          const srv = ["angularClass", "dockerClass", "rick&morty API"], sy0 = ty + 52;
          g.globalAlpha = 0.25; g.strokeStyle = C.cyan; g.setLineDash([3, 3]); g.beginPath();
          lineAt(g, rx, ty - 28, rx, ty - 11);
          lineAt(g, tx + tw * 0.2, ty, tx - 6, ty);
          for (let i = 0; i < 3; i++) { lineAt(g, tx - 6, ty, tx - 6, sy0 + i * 40); lineAt(g, tx - 6, sy0 + i * 40, tx + 4, sy0 + i * 40); }
          g.stroke(); g.setLineDash([]);
          routes = srv.map((_, i) => ({ x1: tx + tw * 0.2, y1: ty, x2: tx - 6, y2: ty, x3: tx + 4, y3: sy0 + i * 40 }));
          g.globalAlpha = 0.45; g.fillStyle = "#c9d1d9"; g.font = font(10); g.textAlign = "center"; g.fillText(":443 → web", rx, ty - 32);
          box(tx + tw * 0.2, ty, tw * 0.6, "traefik", C.cyan);
          srv.forEach((l, i) => box(tx + 4, sy0 + i * 40, tw - 4, l, i === 2 ? PORTAL : i === 1 ? "#2496ED" : "#DD0031"));
          g.globalAlpha = 0.3; g.font = font(9); g.fillStyle = "#c9d1d9"; g.fillText("acme.json · chmod 600", rx, sy0 + 3 * 40 + 4);
        } else {
          // pantalla angosta: la gráfica tenue detrás del túnel y las fórmulas abajo
          const bw = W * 0.7;
          parabolas(g, W * 0.15, H * 0.82, bw, bw * 0.75, 0.16);
          air = { x: W - 54, y: 96 };
          g.globalAlpha = 0.4; g.textAlign = "center"; g.font = font(10); g.fillStyle = C.fg;
          g.fillText("F = m·a   ·   g = 9.81 m/s²", W / 2, H - 74 + 8);
        }
        g.globalAlpha = 1; vignette(g, 0.5);
      });
      // portal al fondo del túnel (gira en draw)
      const back = proj(1, 1, 1), c0 = proj(0, 0, 1);
      portalR = Math.min(back.X - c0.X, back.Y - c0.Y) * 0.92;
      const d = portalR * 2 + 4;
      portalL = bgLayer((g) => {
        const m = d / 2;
        const rg = g.createRadialGradient(m, m, 0, m, m, portalR);
        rg.addColorStop(0, "rgba(220,255,180,0.5)"); rg.addColorStop(0.5, "rgba(151,206,76,0.25)"); rg.addColorStop(1, "rgba(151,206,76,0)");
        g.fillStyle = rg; g.beginPath(); g.arc(m, m, portalR, 0, TAU); g.fill();
        g.strokeStyle = PORTAL; g.lineWidth = 1.5;
        for (let arm = 0; arm < 4; arm++) {
          g.globalAlpha = 0.55; g.beginPath();
          for (let i = 0; i <= 30; i++) { const f = i / 30, a = arm * TAU / 4 + f * 3.6, r = f * portalR * 0.95; if (i) g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); else g.moveTo(m, m); }
          g.stroke();
        }
      }, d, d);
    }
    buildBg();

    return {
      resize: () => { fit(); buildBg(); },
      objective: () => t(`🎯 Goles ${pl.score}/${WIN}`, `🎯 Goals ${pl.score}/${WIN}`),
      update(dt) {
        const px0 = pl.x, py0 = pl.y;
        if (ptr.moved) { pl.x = (ptr.x - cx) / RX; pl.y = (ptr.y - cy) / RY; }
        const sp = 2.2 * dt;
        if (key("a", "arrowleft")) pl.x -= sp;
        if (key("d", "arrowright")) pl.x += sp;
        if (key("w", "arrowup")) pl.y -= sp;
        if (key("s", "arrowdown")) pl.y += sp;
        pl.x = clamp(pl.x, -1 + PW, 1 - PW); pl.y = clamp(pl.y, -1 + PHh, 1 - PHh);
        pl.vx = pl.vx * 0.6 + ((pl.x - px0) / Math.max(dt, 1e-3)) * 0.4;
        pl.vy = pl.vy * 0.6 + ((pl.y - py0) / Math.max(dt, 1e-3)) * 0.4;

        // CPU al fondo: persigue la bola con velocidad limitada
        const cs = (0.75 + cp.score * 0.12 + rally * 0.03) * dt;
        const tx = b.vz > 0 ? b.x : 0, ty = b.vz > 0 ? b.y : 0;
        cp.x = clamp(cp.x + clamp(tx - cp.x, -cs, cs), -1 + PW, 1 - PW);
        cp.y = clamp(cp.y + clamp(ty - cp.y, -cs, cs), -1 + PHh, 1 - PHh);

        if (serveT > 0) { serveT -= dt; return; }
        // efecto: la curva acelera la bola lateralmente y se va apagando
        b.vx += b.sx * dt; b.vy += b.sy * dt; b.sx *= 1 - 0.9 * dt; b.sy *= 1 - 0.9 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        if (Math.abs(b.x) > 1 - BR) { b.x = Math.sign(b.x) * (1 - BR); b.vx *= -1; b.sx *= -0.5; sfx.bounce(); }
        if (Math.abs(b.y) > 1 - BR) { b.y = Math.sign(b.y) * (1 - BR); b.vy *= -1; b.sy *= -0.5; sfx.bounce(); }

        if (b.z <= 0) {
          if (Math.abs(b.x - pl.x) < PW + BR && Math.abs(b.y - pl.y) < PHh + BR) {
            b.z = 0; rally++;
            b.vz = Math.min(2.2, Math.abs(b.vz) * 1.06);
            b.vx += (b.x - pl.x) * 1.2; b.vy += (b.y - pl.y) * 1.2;
            b.sx = clamp(-pl.vx * 1.4, -4, 4); b.sy = clamp(-pl.vy * 1.4, -4, 4);
            sfx.blip(); addScore(25);
            const P = proj(b.x, b.y, 0); burst(P.X, P.Y, C.acc, 14, 260, 3); shakeIt(4);
          } else {
            cp.score++; const P = proj(b.x, b.y, 0); burst(P.X, P.Y, C.err, 30, 380, 4);
            if (hurt()) serve(false);
          }
        } else if (b.z >= 1) {
          if (Math.abs(b.x - cp.x) < PW + BR && Math.abs(b.y - cp.y) < PHh + BR) {
            b.z = 1; b.vz = -Math.abs(b.vz); b.vx += (b.x - cp.x) * 0.8; b.vy += (b.y - cp.y) * 0.8; o.beep(560, 14);
          } else {
            pl.score++; addScore(300); sfx.point();
            const P = proj(b.x, b.y, 1); burst(P.X, P.Y, C.acc, 30, 200, 3);
            if (pl.score >= WIN) clearStage(); else serve(true);
          }
        }
      },
      draw() {
        ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fillRect(0, 0, W, H);
        // fondo de época: figura de MATLAB, portal girando, ON AIR, onda de radio y paquetes por Traefik
        if (bgL && portalL) {
          ctx.drawImage(bgL, 0, 0, W, H);
          const pc = proj(0, 0, 1), d = portalR * 2 + 4;
          ctx.save(); ctx.translate(pc.X, pc.Y); if (!reduce) ctx.rotate(-elapsed * 0.6);
          ctx.globalAlpha = 0.45; ctx.drawImage(portalL, -d / 2, -d / 2, d, d); ctx.restore();
          // letrero ON AIR: la luz respira (fija con movimiento reducido)
          const on = reduce ? 0.8 : 0.55 + 0.35 * Math.sin(elapsed * 3);
          const aw = wide ? 92 : 64, ah = wide ? 24 : 18;
          ctx.globalAlpha = 0.25 * on; ctx.fillStyle = C.err; ctx.fillRect(air.x - aw / 2, air.y - ah / 2, aw, ah);
          ctx.globalAlpha = 0.45 + 0.4 * on; ctx.strokeStyle = C.err; ctx.lineWidth = 1.5; ctx.strokeRect(air.x - aw / 2, air.y - ah / 2, aw, ah);
          ctx.fillStyle = C.err; ctx.font = font(wide ? 12 : 10, true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("● ON AIR", air.x, air.y + 1); ctx.textBaseline = "alphabetic";
          if (wide) {
            const tt = reduce ? 1 : elapsed;
            ctx.globalAlpha = 0.5; ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.beginPath();
            for (let i = 0; i <= 60; i++) {
              const f = i / 60, x = wave.x + f * wave.w;
              const y = wave.y + Math.sin(f * 26 + tt * 7) * Math.sin(f * 5 - tt * 2.3) * 13 * Math.sin(f * Math.PI);
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke();
            if (!reduce) { // paquetes HTTP que Traefik reparte entre los servicios
              ctx.fillStyle = C.cyan; ctx.globalAlpha = 0.7;
              routes.forEach((r, i) => {
                const k = (elapsed * 0.35 + i / 3) % 1, l1 = Math.hypot(r.x2 - r.x1, r.y2 - r.y1), l2 = Math.abs(r.y3 - r.y2), l3 = r.x3 - r.x2, L = l1 + l2 + l3, s0 = k * L;
                const [x, y] = s0 < l1 ? [r.x1 + (r.x2 - r.x1) * s0 / l1, r.y1 + (r.y2 - r.y1) * s0 / l1] : s0 < l1 + l2 ? [r.x2, r.y2 + (s0 - l1)] : [r.x2 + (s0 - l1 - l2), r.y3];
                ctx.fillRect(x - 2, y - 2, 4, 4);
              });
            }
          }
          ctx.globalAlpha = 1;
        }
        // túnel: anillos de profundidad + aristas
        for (let i = 0; i <= 8; i++) rect(i / 8, `rgba(255,255,255,${0.05 + (1 - i / 8) * 0.1})`);
        ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
        for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const a = proj(x, y, 0), c = proj(x, y, 1);
          ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(c.X, c.Y); ctx.stroke();
        }
        // CPU al fondo
        const ca = proj(cp.x - PW, cp.y - PHh, 1), cb = proj(cp.x + PW, cp.y + PHh, 1);
        ctx.fillStyle = "rgba(255,61,154,0.35)"; ctx.fillRect(ca.X, ca.Y, cb.X - ca.X, cb.Y - ca.Y);
        ctx.strokeStyle = C.pink; ctx.lineWidth = 2; ctx.strokeRect(ca.X, ca.Y, cb.X - ca.X, cb.Y - ca.Y);
        // anillo que marca la profundidad de la bola (la gran pista visual del 3D)
        rect(clamp(b.z, 0, 1), C.acc, 2);
        // sombra en el suelo
        const sh = proj(b.x, 1, b.z);
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath();
        ctx.ellipse(sh.X, sh.Y, BR * RX * sh.S * 1.2, BR * RY * sh.S * 0.35, 0, 0, TAU); ctx.fill();
        // bola
        const P = proj(b.x, b.y, b.z);
        if (serveT <= 0 || Math.floor(serveT * 10) % 2 === 0) {
          const r = BR * RX * P.S;
          const g = ctx.createRadialGradient(P.X - r * 0.3, P.Y - r * 0.3, r * 0.1, P.X, P.Y, r);
          g.addColorStop(0, "#fff"); g.addColorStop(0.4, C.br); g.addColorStop(1, C.fg);
          glow(C.acc, 22); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.X, P.Y, r, 0, TAU); ctx.fill(); glow(null);
        }
        // pala del jugador (delante de todo, translúcida)
        const pa = proj(pl.x - PW, pl.y - PHh, 0), pb = proj(pl.x + PW, pl.y + PHh, 0);
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(pa.X, pa.Y, pb.X - pa.X, pb.Y - pa.Y);
        glow(C.acc, 12); ctx.strokeStyle = C.br; ctx.lineWidth = 3; ctx.strokeRect(pa.X, pa.Y, pb.X - pa.X, pb.Y - pa.Y); glow(null);
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
        const mx = (pa.X + pb.X) / 2, my = (pa.Y + pb.Y) / 2;
        ctx.beginPath(); ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my); ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my + 10); ctx.stroke();
        // marcador
        ctx.textAlign = "center"; ctx.font = font(13); ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(`${t("TÚ", "YOU")} ${pl.score} · ${cp.score} CPU`, W / 2, H - 46);
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3 · NAVES (shoot'em up vertical)
  // ═════════════════════════════════════════════════════════════════════════════
  function shmup(): Scene {
    type Enemy = { x: number; y: number; vx: number; vy: number; hp: number; max: number; r: number; kind: "bug" | "tank" | "rock"; t: number; cool: number; base: number; amp: number; flash: number };
    type Bullet = { x: number; y: number; vx: number; vy: number; r: number };
    type Power = { x: number; y: number; kind: "triple" | "shield" | "life"; t: number };
    const ship = { x: W / 2, y: H - 110, r: 14, cool: 0, triple: 0, shield: true, inv: 0 }; // escudo de regalo
    const shots: Bullet[] = [], foes: Bullet[] = [], enemies: Enemy[] = [], powers: Power[] = [];
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) }));
    let wave = 0, waveT = 1.2, spawnQ: (() => void)[] = [], spawnT = 0, bossDead = 0;
    const boss = { on: false, x: W / 2, y: -140, hp: 96, max: 96, t: 0, cool: 0, ring: 0, flash: 0, w: 150 };

    const enemy = (e: Partial<Enemy> & Pick<Enemy, "x" | "y" | "kind">) => {
      const base: Enemy = { vx: 0, vy: 110, hp: 1, max: 1, r: 16, t: 0, cool: rand(1, 2.5), base: e.x, amp: 0, flash: 0, ...e } as Enemy;
      base.max = base.hp; enemies.push(base);
    };
    const WAVES: (() => void)[] = [
      () => { for (let i = 0; i < 8; i++) spawnQ.push(() => enemy({ kind: "bug", x: W * (0.2 + (i % 4) * 0.2), y: -30, vy: 120, amp: 80 })); },
      () => {
        for (let i = 0; i < 6; i++) spawnQ.push(() => enemy({ kind: "bug", x: rand(W * 0.15, W * 0.85), y: -30, vy: 150, amp: 120 }));
        spawnQ.push(() => enemy({ kind: "tank", x: W * 0.3, y: -40, vy: 55, hp: 6, r: 24 }));
        spawnQ.push(() => enemy({ kind: "tank", x: W * 0.7, y: -40, vy: 55, hp: 6, r: 24 }));
        for (let i = 0; i < 4; i++) spawnQ.push(() => enemy({ kind: "rock", x: rand(W * 0.1, W * 0.9), y: -40, vy: rand(90, 160), vx: rand(-40, 40), hp: 3, r: rand(18, 28) }));
      },
      () => {
        for (let i = 0; i < 10; i++) spawnQ.push(() => enemy({ kind: "bug", x: W / 2 + Math.sin(i) * W * 0.3, y: -30, vy: 170, amp: 150 }));
        for (let i = 0; i < 3; i++) spawnQ.push(() => enemy({ kind: "tank", x: W * (0.25 + i * 0.25), y: -40, vy: 60, hp: 8, r: 26 }));
      },
    ];

    function fireAt(x: number, y: number, ang: number, sp: number) { foes.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5 }); }
    function kill(e: Enemy) {
      addScore(e.kind === "tank" ? 300 : e.kind === "rock" ? 150 : 100);
      burst(e.x, e.y, e.kind === "rock" ? C.warn : C.pink, 20, 240); sfx.hit();
      if (Math.random() < (e.kind === "tank" ? 0.6 : 0.1)) {
        const r = Math.random();
        powers.push({ x: e.x, y: e.y, kind: r < 0.55 ? "triple" : r < 0.88 ? "shield" : "life", t: 0 });
      }
    }
    function playerHit() {
      if (ship.inv > 0) return;
      if (ship.shield) { ship.shield = false; ship.inv = 1; sfx.wall(); burst(ship.x, ship.y, C.cyan, 20, 200); return; }
      burst(ship.x, ship.y, C.acc, 30, 300, 4);
      if (hurt()) { ship.inv = 2; ship.triple = 0; }
    }

    // ── fondo 2024 · el salto profesional ──
    // el visor 2D del editor de Godot (reglas, ejes rojo/verde, rectángulo del viewport),
    // objetos lejanos en paralaje: nebulosa "cloud", satélite-robot de Godot, el planeta catastral
    // (IGAC · XTF), el ícono de accesibilidad (MinTIC) y la constelación gitflow de ptbdb;
    // un sismógrafo (gritos en terremotos con IA) y, al despegar, el skyline de Bogotá con Monserrate.
    let frameL: HTMLCanvasElement | null = null, skyL: HTMLCanvasElement | null = null, rageL: HTMLCanvasElement | null = null;
    let sprites: { cv: HTMLCanvasElement; w: number; h: number }[] = [];
    let skyH = 0, bgT = 0, beacon = { x: 0, y: 0 };
    // posición de cada objeto lejano: x en fracción del ancho, y en px; aparecen escalonados
    const decos = [0, 1, 2, 3, 4, 5].map((i) => ({ i, x: [0.78, 0.22, 0.72, 0.28, 0.8, 0.2][i], y: [0.08, 0.3, -0.35, -0.75, -1.1, -1.5][i], sp: [18, 26, 22, 30, 24, 28][i] }));
    function buildBg() {
      const u = clamp(Math.min(W, H) / 800, 0.6, 1.2), lab = (g: CanvasRenderingContext2D, txt: string, x: number, y: number) => {
        g.globalAlpha = 0.45; g.fillStyle = "#c9d1d9"; g.font = font(9); g.textAlign = "center"; g.fillText(txt, x, y);
      };
      // los adornos se pintan como hologramas lejanos (monocromo, tenue y con rayas) para no confundirse con enemigos
      const sp = (w: number, h: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void) => ({
        cv: bgLayer((g) => {
          paint(g, w, h);
          g.globalAlpha = 1; g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(70,96,128,0.82)"; g.fillRect(0, 0, w, h);
          g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
          for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
          g.globalCompositeOperation = "source-over";
        }, w, h), w, h });
      sprites = [
        // 0 · nebulosa cloud (naranja tipo consola de nube + violeta)
        sp(260 * u, 150 * u, (g, w, h) => {
          g.globalCompositeOperation = "lighter";
          for (const [fx, fy, fr, col] of [[0.3, 0.6, 0.3, "255,153,0"], [0.52, 0.42, 0.36, "169,112,255"], [0.72, 0.6, 0.28, "255,153,0"], [0.5, 0.66, 0.3, "61,217,255"]] as [number, number, number, string][]) {
            const r = fr * w, rg = g.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, r);
            rg.addColorStop(0, `rgba(${col},0.16)`); rg.addColorStop(1, `rgba(${col},0)`);
            g.fillStyle = rg; g.fillRect(0, 0, w, h);
          }
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = 0.22; g.strokeStyle = "#ff9900"; g.lineWidth = 1.5; g.beginPath(); // silueta de nube en vector
          g.arc(w * 0.36, h * 0.6, h * 0.16, Math.PI * 0.5, Math.PI * 1.5); g.arc(w * 0.5, h * 0.42, h * 0.22, Math.PI, 0); g.arc(w * 0.64, h * 0.6, h * 0.16, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); g.stroke();
          lab(g, "☁ cloud developer", w / 2, h * 0.92);
        }),
        // 1 · satélite-robot de Godot
        sp(120 * u, 74 * u, (g, w, h) => {
          const px = Math.max(2, Math.round(3 * u)), rows = [
            "..b..bbbb..b..", ".bbb.bbbb.bbb.", ".bbbbbbbbbbbb.", "bbwwwbbbbwwwbb", "bbwkwbbbbwkwbb", "bbwwwbbbbwwwbb",
            "bbbbbbwwbbbbbb", "bbbbbbbbbbbbbb", ".bwbwbbbbwbwb.", "..bbbbbbbbbb..",
          ], gw = rows[0].length * px, gx = Math.round(w / 2 - gw / 2), gy = 6;
          g.globalAlpha = 0.5; g.strokeStyle = C.cyan; g.lineWidth = 1; // paneles solares
          for (const sx of [gx - 30 * u, gx + gw + 4]) {
            g.strokeRect(sx, gy + px * 2, 26 * u, px * 6); g.beginPath();
            for (let k = 1; k < 3; k++) { g.moveTo(sx + (26 * u * k) / 3, gy + px * 2); g.lineTo(sx + (26 * u * k) / 3, gy + px * 8); }
            g.stroke();
          }
          g.globalAlpha = 0.65; pix(g, rows, gx, gy, px, { b: "#478cbf", w: "#e8f1f8", k: "#0b1530" });
          lab(g, "godot · 2D", w / 2, h - 6);
        }),
        // 2 · planeta catastral: predios (polígonos) sobre la superficie
        sp(130 * u, 130 * u, (g, w) => {
          const m = w / 2, r = w * 0.32;
          const rg = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
          rg.addColorStop(0, "#1d4a3a"); rg.addColorStop(1, "#06140f");
          g.globalAlpha = 0.85; g.fillStyle = rg; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
          g.save(); g.clip(); g.globalAlpha = 0.45; g.strokeStyle = C.fg; g.lineWidth = 1; g.beginPath();
          for (let k = 0; k < 9; k++) { const y = m - r + (k + hash(k)) * r * 0.24; g.moveTo(m - r, y); g.lineTo(m + r, y + (hash(k + 9) - 0.5) * r * 0.5); }
          for (let k = 0; k < 9; k++) { const x = m - r + (k + hash(k + 20)) * r * 0.24; g.moveTo(x, m - r); g.lineTo(x + (hash(k + 30) - 0.5) * r * 0.6, m + r); }
          g.stroke(); g.restore();
          g.globalAlpha = 0.5; g.strokeStyle = C.warn; g.beginPath(); g.ellipse(m, m, r * 1.45, r * 0.32, -0.3, 0, TAU); g.stroke();
          lab(g, "IGAC · XTF · LADM-COL", m, w - 6);
        }),
        // 3 · accesibilidad (MinTIC)
        sp(100 * u, 80 * u, (g, w, h) => {
          const m = w / 2, cy0 = h * 0.4, r = h * 0.28;
          g.globalAlpha = 0.6; g.strokeStyle = C.cyan; g.lineWidth = 2;
          g.beginPath(); g.arc(m, cy0, r, 0, TAU); g.stroke();
          g.fillStyle = C.cyan; g.beginPath(); g.arc(m, cy0 - r * 0.55, r * 0.14, 0, TAU); g.fill();
          g.lineWidth = 2.2; g.beginPath();
          g.moveTo(m - r * 0.6, cy0 - r * 0.28); g.lineTo(m + r * 0.6, cy0 - r * 0.28);
          g.moveTo(m, cy0 - r * 0.3); g.lineTo(m, cy0 + r * 0.15);
          g.moveTo(m - r * 0.35, cy0 + r * 0.65); g.lineTo(m, cy0 + r * 0.15); g.lineTo(m + r * 0.35, cy0 + r * 0.65); g.stroke();
          lab(g, "a11y · MinTIC", m, h - 6);
        }),
        // 4 · constelación gitflow (la prueba técnica ptbdb)
        sp(150 * u, 90 * u, (g, w, h) => {
          const x0 = 12, dx = (w - 24) / 6, rowsY = [h * 0.18, h * 0.42, h * 0.64];
          const nodes: [number, number][] = [[0, 0], [3, 0], [6, 0], [1, 1], [2, 1], [4, 1], [5, 1], [2, 2], [3, 2], [4, 2]];
          g.globalAlpha = 0.35; g.lineWidth = 1;
          for (const [row, col] of [[0, "#7ee787"], [1, C.cyan], [2, C.violet]] as [number, string][]) {
            const ns = nodes.filter((n) => n[1] === row).map((n) => [x0 + n[0] * dx, rowsY[row]]);
            g.strokeStyle = col; g.beginPath(); ns.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
          }
          g.beginPath(); // ramas y merges
          for (const [a, b, ra, rb] of [[0, 1, 0, 1], [5, 6, 1, 0], [1, 2, 1, 2], [4, 5, 2, 1], [6, 6, 1, 0]] as number[][]) {
            g.moveTo(x0 + a * dx, rowsY[ra]); g.lineTo(x0 + b * dx, rowsY[rb]);
          }
          g.strokeStyle = "#9aa4b1"; g.stroke();
          g.globalAlpha = 0.85; g.fillStyle = "#e6edf3";
          for (const [c, r] of nodes) g.fillRect(x0 + c * dx - 1.5, rowsY[r] - 1.5, 3, 3);
          lab(g, "ptbdb · gitflow ✓", w / 2, h - 6);
        }),
        // 5 · estación sísmica (antena parabólica)
        sp(90 * u, 70 * u, (g, w, h) => {
          const m = w / 2, y = h * 0.5;
          g.globalAlpha = 0.55; g.strokeStyle = C.warn; g.lineWidth = 1.5;
          g.beginPath(); g.ellipse(m, y - 8 * u, 16 * u, 7 * u, -0.5, 0, Math.PI); g.stroke();
          g.beginPath(); g.moveTo(m, y - 6 * u); g.lineTo(m, y + 10 * u); g.moveTo(m - 9 * u, y + 10 * u); g.lineTo(m + 9 * u, y + 10 * u); g.stroke();
          g.beginPath(); g.moveTo(m - 2 * u, y - 10 * u); g.lineTo(m + 6 * u, y - 22 * u); g.stroke();
          lab(g, t("sismo · IA", "quake · AI"), m, h - 4);
        }),
      ];
      // skyline de Bogotá: Monserrate (con su iglesia) detrás y torres delante
      skyH = clamp(H * 0.24, 110, 210);
      skyL = bgLayer((g) => {
        const h = skyH, base = h;
        g.fillStyle = "#0a1220"; g.beginPath(); g.moveTo(0, base);
        for (let i = 0; i <= 40; i++) { const f = i / 40, x = f * W; const y = h * (0.62 - 0.4 * Math.exp(-(((f - 0.68) / 0.13) ** 2)) - 0.12 * Math.exp(-(((f - 0.25) / 0.2) ** 2)) + 0.03 * Math.sin(i * 1.7)); g.lineTo(x, y); }
        g.lineTo(W, base); g.closePath(); g.fill();
        g.globalAlpha = 0.4; g.strokeStyle = C.dim; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
        const px = W * 0.68, py = h * 0.22 - 0.03 * h * Math.sin(27 * 1.7); // iglesia en la cima
        g.fillStyle = "#1a2638"; g.fillRect(px - 6, py - 7, 12, 7); g.fillRect(px - 1, py - 13, 2, 6); g.fillRect(px - 3, py - 11, 6, 1.5);
        // torres
        const towers: [number, number, number][] = [];
        for (let x = 0; x < W; ) { const bw = 14 + hash(x) * 26, bh = h * (0.18 + hash(x + 5) * 0.28); towers.push([x, bw, bh]); x += bw + 2; }
        const colp = W * 0.36, bac = W * 0.52;
        towers.push([colp - 13, 26, h * 0.86], [bac - 22, 18, h * 0.8], [bac + 2, 18, h * 0.72]);
        for (const [x, bw, bh] of towers) {
          g.fillStyle = "#04070d"; g.fillRect(x, base - bh, bw, bh);
          g.strokeStyle = "rgba(255,255,255,0.06)"; g.strokeRect(x + 0.5, base - bh + 0.5, bw - 1, bh);
          for (let wy = base - bh + 6; wy < base - 4; wy += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
            if (hash(wx * 3.1 + wy * 7.7) > 0.78) { g.fillStyle = hash(wx + wy) > 0.5 ? "rgba(255,204,51,0.55)" : "rgba(170,255,187,0.35)"; g.fillRect(wx, wy, 2, 3); }
          }
        }
        // corona escalonada de la Colpatria y techos inclinados del BD Bacatá
        g.fillStyle = "#04070d";
        g.fillRect(colp - 9, base - h * 0.86 - 8, 18, 8); g.fillRect(colp - 5, base - h * 0.86 - 14, 10, 6); g.fillRect(colp - 1, base - h * 0.86 - 26, 2, 12);
        g.beginPath(); g.moveTo(bac - 22, base - h * 0.8); g.lineTo(bac - 4, base - h * 0.8 - 12); g.lineTo(bac - 4, base - h * 0.8); g.fill();
        g.beginPath(); g.moveTo(bac + 2, base - h * 0.72 - 10); g.lineTo(bac + 20, base - h * 0.72); g.lineTo(bac + 2, base - h * 0.72); g.fill();
        beacon = { x: colp, y: base - h * 0.86 - 26 };
        g.globalAlpha = 0.45; g.fillStyle = C.br; g.font = font(10); g.textAlign = "left";
        g.fillText("BOGOTÁ · 2024", 22, h * 0.42);
      }, W, skyH);
      // marco del editor de Godot: reglas, ejes del origen y el rectángulo del viewport
      frameL = bgLayer((g) => {
        const top = 40, rw = 14;
        g.fillStyle = "rgba(33,38,46,0.55)"; g.fillRect(0, top, W, rw); g.fillRect(0, top, rw, H - top);
        g.strokeStyle = "#8b949e"; g.lineWidth = 1; g.globalAlpha = 0.5; g.beginPath();
        for (let x = rw; x < W; x += 10) { const L = (x - rw) % 100 === 0 ? rw : (x - rw) % 50 === 0 ? 7 : 3; g.moveTo(x + 0.5, top + rw); g.lineTo(x + 0.5, top + rw - L); }
        for (let y = top + rw; y < H; y += 10) { const L = (y - top - rw) % 100 === 0 ? rw : (y - top - rw) % 50 === 0 ? 7 : 3; g.moveTo(rw, y + 0.5); g.lineTo(rw - L, y + 0.5); }
        g.stroke();
        g.fillStyle = "#8b949e"; g.font = font(8); g.textAlign = "left";
        for (let x = rw + 100; x < W - 30; x += 100) g.fillText(String(x - rw), x + 2, top + 8);
        g.globalAlpha = 0.45; g.lineWidth = 1.5; // ejes X (rojo) e Y (verde) del origen
        g.strokeStyle = "#ff5b5b"; g.beginPath(); g.moveTo(rw, top + rw + 1); g.lineTo(W, top + rw + 1); g.stroke();
        g.strokeStyle = "#7ee787"; g.beginPath(); g.moveTo(rw + 1, top + rw); g.lineTo(rw + 1, H); g.stroke();
        g.globalAlpha = 0.22; g.strokeStyle = "#a970ff"; g.lineWidth = 1; g.strokeRect(rw + 8, top + rw + 8, W - rw - 16, H - top - rw - 16);
        g.globalAlpha = 0.4; g.fillStyle = "#c9d1d9"; g.font = font(10); g.textAlign = "right";
        g.fillText("res://multimedia.gd", W - 22, H - 40);
        g.globalAlpha = 1; vignette(g, 0.45);
      });
      rageL = bgLayer((g) => vignette(g, 0.5, "255,40,40"));
    }
    buildBg();

    return {
      resize: buildBg,
      objective: () => boss.on
        ? t(`🎯 Derriba al MONOLITO LEGACY · ${Math.ceil((boss.hp / boss.max) * 100)}%`, `🎯 Take down the LEGACY MONOLITH · ${Math.ceil((boss.hp / boss.max) * 100)}%`)
        : t(`🎯 Sobrevive · oleada ${Math.max(1, wave)}/3`, `🎯 Survive · wave ${Math.max(1, wave)}/3`),
      update(dt) {
        // estrellas en paralaje
        for (const s of stars) { s.y += s.z * dt * (boss.on ? 0.35 : 0.22); if (s.y > 1) { s.y -= 1; s.x = Math.random(); } }
        // objetos del fondo (solo visual): bajan más lento que las estrellas y se reciclan arriba
        bgT += dt;
        for (const d of decos) {
          const sh = sprites[d.i]?.h ?? 100;
          d.y += (d.sp * (boss.on ? 1.6 : 1) * dt) / H;
          if (d.y * H > H + 10) { d.y = -sh / H - rand(0.15, 0.6); d.x = rand(0.12, 0.88); }
        }
        // nave: sigue al puntero (con algo de inercia) o al teclado
        if (ptr.moved || (coarse && ptr.down)) {
          const tx = ptr.x, ty = ptr.y - (coarse ? 70 : 0);
          ship.x += (tx - ship.x) * Math.min(1, dt * 14); ship.y += (ty - ship.y) * Math.min(1, dt * 14);
        }
        const sp = 420 * dt;
        if (key("a", "arrowleft")) ship.x -= sp;
        if (key("d", "arrowright")) ship.x += sp;
        if (key("w", "arrowup")) ship.y -= sp;
        if (key("s", "arrowdown")) ship.y += sp;
        ship.x = clamp(ship.x, 20, W - 20); ship.y = clamp(ship.y, H * 0.3, H - 30);
        ship.inv = Math.max(0, ship.inv - dt); ship.triple = Math.max(0, ship.triple - dt);

        ship.cool -= dt;
        if (ship.cool <= 0) {
          ship.cool = 0.11;
          shots.push({ x: ship.x, y: ship.y - 18, vx: 0, vy: -820, r: 4 });
          if (ship.triple > 0) {
            shots.push({ x: ship.x - 10, y: ship.y - 10, vx: -170, vy: -780, r: 4 });
            shots.push({ x: ship.x + 10, y: ship.y - 10, vx: 170, vy: -780, r: 4 });
          }
          if (Math.random() < 0.35) sfx.shoot();
        }

        // oleadas → jefe
        if (!boss.on) {
          if (spawnQ.length) { spawnT -= dt; if (spawnT <= 0) { spawnQ.shift()!(); spawnT = 0.38; } }
          else if (!enemies.length) {
            waveT -= dt;
            if (waveT <= 0) {
              if (wave < WAVES.length) { WAVES[wave++](); waveT = 1.4; }
              else { boss.on = true; boss.y = -140; o.beep(110, 400, 0.05); }
            }
          }
        }

        for (const e of enemies) {
          e.t += dt; e.flash = Math.max(0, e.flash - dt);
          e.y += e.vy * dt;
          if (e.kind === "bug") e.x = e.base + Math.sin(e.t * 2.2) * e.amp;
          else e.x += e.vx * dt;
          if (e.kind === "tank" && e.y > 40) {
            e.cool -= dt;
            if (e.cool <= 0) { e.cool = rand(1.6, 2.4); const a = Math.atan2(ship.y - e.y, ship.x - e.x); for (const d of [-0.18, 0, 0.18]) fireAt(e.x, e.y, a + d, 230); }
          }
          if (Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + ship.r * 0.7) { e.hp = 0; kill(e); playerHit(); }
        }

        // jefe: entra, patrulla y alterna patrones (anillo, ráfaga apuntada, espiral)
        if (boss.on && boss.hp > 0) {
          boss.t += dt; boss.flash = Math.max(0, boss.flash - dt);
          const rage = boss.hp < boss.max / 2;
          boss.y += (130 - boss.y) * Math.min(1, dt * 1.5);
          boss.x = W / 2 + Math.sin(boss.t * (rage ? 0.9 : 0.6)) * W * 0.3;
          boss.cool -= dt; boss.ring -= dt;
          if (boss.cool <= 0) {
            boss.cool = rage ? 0.95 : 1.3;
            const a = Math.atan2(ship.y - boss.y, ship.x - boss.x);
            for (const d of [-0.25, 0, 0.25]) fireAt(boss.x, boss.y + 30, a + d, rage ? 260 : 220);
          }
          if (boss.ring <= 0) {
            boss.ring = rage ? 2 : 3;
            const n = rage ? 13 : 10, off = boss.t;
            for (let i = 0; i < n; i++) fireAt(boss.x, boss.y, off + (i / n) * TAU, 150);
          }
          if (rage && Math.floor(boss.t * 12) % 3 === 0) fireAt(boss.x, boss.y, boss.t * 4, 170);
        }

        for (const b of shots) { b.x += b.vx * dt; b.y += b.vy * dt; }
        for (const b of foes) { b.x += b.vx * dt; b.y += b.vy * dt; }
        for (const b of shots) {
          for (const e of enemies) {
            if (e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
              e.hp--; e.flash = 0.08; b.y = -999;
              if (e.hp <= 0) kill(e); else o.beep(900, 6, 0.015);
              break;
            }
          }
          if (boss.on && boss.hp > 0 && Math.abs(b.x - boss.x) < boss.w / 2 && Math.abs(b.y - boss.y) < 44) {
            boss.hp--; boss.flash = 0.06; b.y = -999; addScore(10);
            if (boss.hp <= 0) {
              addScore(5000); sfx.boom(); shakeIt(26); flash = 0.6;
              for (let i = 0; i < 8; i++) burst(boss.x + rand(-70, 70), boss.y + rand(-30, 30), [C.pink, C.warn, C.acc][i % 3], 26, 360, 4);
              foes.length = 0; bossDead = 1.6;
            }
          }
        }
        for (const b of foes) if (Math.hypot(b.x - ship.x, b.y - ship.y) < b.r + ship.r * 0.55) { b.y = 9999; playerHit(); }
        for (const p of powers) {
          p.t += dt; p.y += 90 * dt;
          if (Math.hypot(p.x - ship.x, p.y - ship.y) < 30) {
            p.y = 9999; sfx.power();
            if (p.kind === "triple") ship.triple = 10;
            else if (p.kind === "shield") ship.shield = true;
            else lives = Math.min(5, lives + 1);
          }
        }
        const inside = (b: { x: number; y: number }) => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60;
        filter(shots, inside); filter(foes, inside); filter(powers, (p) => p.y < H + 40);
        filter(enemies, (e) => e.hp > 0 && e.y < H + 60);

        if (bossDead > 0) { bossDead -= dt; if (bossDead <= 0) clearStage(); }
      },
      draw() {
        ctx.fillStyle = "#03040a"; ctx.fillRect(0, 0, W, H);
        for (const s of stars) {
          ctx.globalAlpha = s.z; ctx.fillStyle = s.z > 0.8 ? C.br : "#9fb3c8";
          ctx.fillRect(s.x * W, s.y * H, s.z * 2, s.z * (boss.on ? 6 : 3));
        }
        ctx.globalAlpha = 1;
        // fondo de época: objetos lejanos, skyline al despegar, sismógrafo, marco del editor
        for (const d of decos) {
          const sp = sprites[d.i]; if (!sp) continue;
          const y = d.y * H; if (y > H || y + sp.h < 0) continue;
          ctx.globalAlpha = 0.55; ctx.drawImage(sp.cv, d.x * W - sp.w / 2, y, sp.w, sp.h); ctx.globalAlpha = 1;
        }
        const skyY = H - skyH + bgT * 7;
        if (skyL && skyY < H) {
          ctx.drawImage(skyL, 0, skyY, W, skyH);
          if (reduce || Math.floor(elapsed * 1.5) % 2 === 0) { ctx.fillStyle = C.err; ctx.fillRect(beacon.x - 1.5, skyY + beacon.y - 3, 3, 3); }
        }
        {
          // sismógrafo en el borde derecho: ruido de fondo y un evento que baja con el papel
          const sx = W - 30, y0 = 84, y1 = H - 60, ev = reduce ? (y1 - y0) * 0.5 : ((elapsed * 60) % ((y1 - y0) * 1.6)) - (y1 - y0) * 0.3;
          ctx.globalAlpha = 0.4; ctx.strokeStyle = C.warn; ctx.lineWidth = 1; ctx.beginPath();
          for (let y = y0; y <= y1; y += 4) {
            const q = y - y0, n = (hash(Math.floor(q / 4) + Math.floor(reduce ? 0 : elapsed * 15)) - 0.5) * 3;
            const e = Math.exp(-(((q - ev) / 26) ** 2)) * 11 * Math.sin(q * 0.9);
            if (y === y0) ctx.moveTo(sx + n + e, y); else ctx.lineTo(sx + n + e, y);
          }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (frameL) ctx.drawImage(frameL, 0, 0, W, H);
        if (rageL && boss.on) { ctx.globalAlpha = clamp((boss.y + 140) / 270, 0, 1) * (boss.hp < boss.max / 2 ? 1 : 0.6); ctx.drawImage(rageL, 0, 0, W, H); ctx.globalAlpha = 1; }
        // power-ups
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const p of powers) {
          const col = p.kind === "triple" ? C.warn : p.kind === "shield" ? C.cyan : C.pink;
          glow(col, 16); ctx.strokeStyle = col; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, 13 + Math.sin(p.t * 6) * 2, 0, TAU); ctx.stroke(); glow(null);
          ctx.fillStyle = col; ctx.font = font(13, true);
          ctx.fillText(p.kind === "triple" ? "3x" : p.kind === "shield" ? "◇" : "♥", p.x, p.y + 1);
        }
        // enemigos
        for (const e of enemies) {
          const col = e.flash > 0 ? "#fff" : e.kind === "rock" ? C.warn : e.kind === "tank" ? C.violet : C.pink;
          glow(col, 14); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
          if (e.kind === "bug") {
            ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 0.8, e.r * 0.6, 0, 0, TAU); ctx.fill();
            ctx.beginPath();
            for (const k of [-1, 1]) for (const l of [-0.4, 0.1, 0.6]) {
              ctx.moveTo(e.x + k * e.r * 0.6, e.y + l * e.r * 0.6);
              ctx.lineTo(e.x + k * e.r * 1.15, e.y + l * e.r * 0.6 + Math.sin(e.t * 18 + l * 4) * 4);
            }
            ctx.stroke();
            glow(null); ctx.fillStyle = "#000"; ctx.fillRect(e.x - 6, e.y - 3, 4, 4); ctx.fillRect(e.x + 2, e.y - 3, 4, 4);
          } else if (e.kind === "tank") {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + e.t; ctx.lineTo(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r); }
            ctx.closePath(); ctx.stroke(); ctx.fillStyle = "rgba(169,112,255,0.25)"; ctx.fill();
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, TAU); ctx.fill();
            hpBar(e.x - e.r, e.y - e.r - 8, e.r * 2, e.hp / e.max, col);
          } else {
            ctx.beginPath();
            for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + e.t; const rr = e.r * (0.75 + ((i * 37) % 10) / 40); ctx.lineTo(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr); }
            ctx.closePath(); ctx.stroke();
          }
          glow(null);
        }
        // jefe: el MONOLITO LEGACY (un bloque de código viejo con un ojo)
        if (boss.on && boss.hp > 0) {
          const col = boss.flash > 0 ? "#fff" : C.err;
          const bw = boss.w;
          glow(col, 26); ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(boss.x - bw / 2, boss.y - 30); ctx.lineTo(boss.x + bw / 2, boss.y - 30);
          ctx.lineTo(boss.x + bw / 2 + 24, boss.y); ctx.lineTo(boss.x + bw / 2, boss.y + 34);
          ctx.lineTo(boss.x - bw / 2, boss.y + 34); ctx.lineTo(boss.x - bw / 2 - 24, boss.y); ctx.closePath();
          ctx.fillStyle = "rgba(255,85,85,0.16)"; ctx.fill(); ctx.stroke(); glow(null);
          ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = font(9);
          ctx.fillText("<?php goto legacy; ?>", boss.x, boss.y - 16);
          const ex = clamp((ship.x - boss.x) / 40, -10, 10);
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(boss.x, boss.y + 8, 15, 0, TAU); ctx.fill();
          ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(boss.x + ex, boss.y + 10, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = C.err; ctx.font = font(11, true);
          ctx.fillText(t("MONOLITO LEGACY", "LEGACY MONOLITH"), W / 2, 94);
          hpBar(W * 0.2, 102, W * 0.6, boss.hp / boss.max, C.err);
        }
        // balas
        glow(C.acc, 10); ctx.fillStyle = C.br;
        for (const b of shots) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 14);
        glow(C.pink, 10); ctx.fillStyle = "#ffd0e6";
        for (const b of foes) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
        glow(null);
        // nave
        if (lives > 0 && (ship.inv <= 0 || Math.floor(ship.inv * 14) % 2 === 0)) {
          const { x, y } = ship;
          const fl = rand(8, 16);
          ctx.fillStyle = C.warn; ctx.beginPath(); ctx.moveTo(x - 5, y + 12); ctx.lineTo(x, y + 12 + fl); ctx.lineTo(x + 5, y + 12); ctx.fill();
          glow(C.acc, 16); ctx.fillStyle = C.fg; ctx.strokeStyle = C.br; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 16, y + 12); ctx.lineTo(x + 5, y + 7); ctx.lineTo(x - 5, y + 7); ctx.lineTo(x - 16, y + 12); ctx.closePath();
          ctx.fill(); ctx.stroke(); glow(null);
          ctx.fillStyle = "#001a10"; ctx.fillRect(x - 2, y - 6, 4, 8);
          if (ship.shield) { glow(C.cyan, 16); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.stroke(); glow(null); }
        }
        ctx.textBaseline = "alphabetic";
        if (!boss.on && wave > 0 && waveT > 0.6 && !enemies.length && !spawnQ.length && wave < WAVES.length) {
          ctx.fillStyle = C.br; ctx.font = font(18, true); ctx.textAlign = "center";
          ctx.fillText(t(`OLEADA ${wave + 1}/3`, `WAVE ${wave + 1}/3`), W / 2, H / 2);
        }
        if (ship.triple > 0) { ctx.textAlign = "left"; ctx.font = font(12); ctx.fillStyle = C.warn; ctx.fillText(`3x ${ship.triple.toFixed(1)}s`, 20, H - 46); }
      },
    };
  }

  // ── utilidades de dibujo ────────────────────────────────────────────────────
  function glow(color: string | null, blur = 12) {
    if (!color || !hq) { ctx.shadowBlur = 0; return; }
    ctx.shadowColor = color; ctx.shadowBlur = blur;
  }
  function hpBar(x: number, y: number, w: number, f: number, col: string) {
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(f, 0, 1), 5);
  }
  function filter<T>(arr: T[], keep: (x: T) => boolean) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i];
    arr.length = j;
  }

  function drawHUD() {
    const S = STAGES[stage];
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, 40);
    ctx.textBaseline = "middle"; ctx.font = font(13, true);
    ctx.textAlign = "left"; ctx.fillStyle = C.acc;
    ctx.fillText(W < 520 ? `${S.year}` : `${S.year} · ${S.file}`, 16, 20);
    ctx.textAlign = "center"; ctx.fillStyle = C.br;
    ctx.fillText(`SCORE ${String(score).padStart(6, "0")}`, W / 2, 20);
    ctx.textAlign = "right";
    const right = coarse ? W - 56 : W - 16; // en táctil, la ✕ ocupa la esquina
    ctx.fillStyle = C.err; ctx.fillText("♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, maxLives() - lives)), right, 20);
    if (W > 620) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = font(12); ctx.fillText(`HI ${String(Math.max(hi, score)).padStart(6, "0")}`, right - 94, 20); }
    if (coarse) { ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = font(20, true); ctx.fillText("✕", W - 16, 21); }
    // objetivo siempre visible, justo bajo la barra
    if (scene && state !== "trans") {
      const txt = scene.objective();
      ctx.font = font(W < 520 ? 12 : 13, true);
      const tw = ctx.measureText(txt).width + 24;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, 48, tw, 26, 13); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.br; ctx.textAlign = "center"; ctx.fillText(txt, W / 2, 61);
    }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center"; ctx.font = font(W < 520 ? 10 : 12); ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`${S.ctrl} · ${coarse ? t("✕ salir", "✕ quit") : t("P pausa · ESC salir", "P pause · ESC quit")}`, W / 2, H - 18);
  }

  function panel(lines: { text: string; color?: string; size?: number; bold?: boolean }[]) {
    // cada línea se parte en renglones que quepan en pantalla (móvil)
    const rows: { text: string; color?: string; sz: number; bold?: boolean }[] = [];
    for (const l of lines) {
      const sz = Math.min(l.size ?? 16, W / 16);
      ctx.font = font(sz, l.bold);
      let cur = "";
      for (const w of l.text.split(" ")) {
        const next = cur ? `${cur} ${w}` : w;
        if (cur && ctx.measureText(next).width > W - 40) { rows.push({ ...l, text: cur, sz }); cur = w; } else cur = next;
      }
      rows.push({ ...l, text: cur, sz });
    }
    const h = rows.reduce((acc, r) => acc + r.sz * 1.7, 0) + 40;
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, H / 2 - h / 2, W, h);
    ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2 - h / 2); ctx.lineTo(W, H / 2 - h / 2); ctx.moveTo(0, H / 2 + h / 2); ctx.lineTo(W, H / 2 + h / 2); ctx.stroke();
    let y = H / 2 - h / 2 + 20;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const r of rows) {
      ctx.font = font(r.sz, r.bold); ctx.fillStyle = r.color ?? C.br;
      ctx.fillText(r.text, W / 2, y + r.sz * 0.85); y += r.sz * 1.7;
    }
    ctx.textBaseline = "alphabetic";
  }
  const pressKey = coarse ? t("toca para continuar", "tap to continue") : t("Enter / clic para continuar", "Enter / click to continue");

  // ── transición "glitch": el proceso actual crashea y muta en el siguiente ────
  const CRASH = [
    "pong.sh: Segmentation fault (core dumped)",
    "snake.py: RecursionError: maximum recursion depth exceeded",
    "fisica3d.m: Out of memory. Type \"help memory\" for your options.",
    "catastro.exe: ORA-00060: deadlock detected while waiting for resource",
    "bd-2.sql: FATAL: too many connections for role \"juferoga\"",
    "multimedia.gd: stack smashing detected ***",
    "second-brain.md: kernel: Out of memory: Killed process (brain)",
  ];

  function drawTransition(dt: number) {
    transT += dt;
    const D = reduce ? 1.6 : 2.4;
    const half = D * 0.55;
    if (transT >= half && !nextScene) { nextScene = STAGES[stage + 1].make(); }
    const current = transT < half ? scene : nextScene;
    current?.draw();
    const k = transT < half ? transT / half : 1 - (transT - half) / (D - half); // intensidad 0→1→0
    if (!reduce) {
      // franjas desplazadas (se copia el propio lienzo sobre sí mismo)
      const n = Math.floor((hq ? 4 : 2) + k * (hq ? 18 : 6));
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = rand(4, 40) * k + 2, dx = rand(-1, 1) * 90 * k;
        ctx.drawImage(cvs, 0, y * S, cvs.width, h * S, dx, y, W, h);
      }
      // aberración cromática a lo bruto
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.18 * k;
      ctx.fillStyle = "#f0f"; ctx.fillRect(0, rand(0, H), W, rand(6, 40));
      ctx.fillStyle = "#0ff"; ctx.fillRect(0, rand(0, H), W, rand(6, 40));
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      for (let i = 0; i < 60 * k; i++) { ctx.fillStyle = Math.random() < 0.5 ? "#fff" : C.acc; ctx.fillRect(Math.random() * W, Math.random() * H, rand(2, 30), 2); }
    } else {
      ctx.fillStyle = `rgba(0,0,0,${k * 0.85})`; ctx.fillRect(0, 0, W, H);
    }
    // mensaje de crash + "recompilando"
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = C.err; ctx.font = font(Math.min(18, W / 34), true);
    ctx.fillText(CRASH[stage] ?? "", W / 2, H / 2 - 18);
    const pct = Math.min(100, Math.round((transT / D) * 100));
    ctx.fillStyle = C.acc; ctx.font = font(Math.min(15, W / 40));
    ctx.fillText(`${t("avanzando a", "fast-forwarding to")} ${STAGES[stage + 1].year} · ${STAGES[stage + 1].file} … ${pct}%`, W / 2, H / 2 + 16);
    ctx.textBaseline = "alphabetic";
    if (transT >= D) {
      stage++; reached = Math.max(reached, stage);
      scene?.dispose?.(); if (document.pointerLockElement === cvs) document.exitPointerLock?.(); if (document.pointerLockElement === cvs) document.exitPointerLock?.();
      scene = nextScene ?? STAGES[stage].make(); nextScene = null;
      lives = maxLives(); stageStartScore = score; particles.length = 0;
      state = "intro"; introT = 0;
    }
  }

  // ── bucle principal ─────────────────────────────────────────────────────────
  let last = performance.now(), raf = 0;
  function frame(now: number) {
    const raw = (now - last) / 1000;
    const dt = Math.min(1 / 30, raw);
    last = now;
    if (state === "play" && raw < 0.25) governor(raw);
    elapsed += dt;
    const cur = state === "play" ? scene?.cursor ?? "none" : "default";
    if (cvs.style.cursor !== cur) cvs.style.cursor = cur;
    hurtCool = Math.max(0, hurtCool - dt);

    if (state === "play") scene?.update(dt);
    if (state === "intro") introT += dt;

    ctx.save();
    if (shake > 0) { ctx.translate(rand(-shake, shake), rand(-shake, shake)); shake = Math.max(0, shake - dt * 60); }
    if (state === "trans") drawTransition(dt);
    else scene?.draw();

    // partículas
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    filter(particles, (p) => p.life > 0);
    ctx.restore();

    if (flash > 0) { ctx.fillStyle = `rgba(255,60,60,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.5); }
    // scanlines muy suaves para mantener la estética CRT de la terminal
    if (!reduce && hq && scanPattern) { ctx.fillStyle = scanPattern; ctx.fillRect(0, 0, W, H); }

    if (state !== "trans") drawHUD();

    const S = STAGES[stage];
    if (state === "intro") {
      panel([
        { text: `${S.year} · ${S.era}`, color: C.warn, size: 14, bold: true },
        { text: `${t("NIVEL", "LEVEL")} ${stage + 1}/${STAGE_COUNT} · ${S.name}`, color: C.acc, size: 30, bold: true },
        { text: S.story, color: "rgba(255,255,255,0.6)", size: 13 },
        { text: `$ ./${S.file}`, color: "rgba(255,255,255,0.4)", size: 12 },
        { text: `🎯 ${S.goal}`, size: 15, bold: true },
        { text: `🕹  ${S.ctrl}`, color: C.warn, size: 13 },
        { text: `💡 ${S.tip}`, color: "rgba(255,255,255,0.7)", size: 12 },
        { text: Math.floor(introT * 2) % 2 ? pressKey : " ", color: "rgba(255,255,255,0.6)", size: 13 },
      ]);
    } else if (state === "paused") {
      panel([{ text: t("⏸ PAUSA", "⏸ PAUSED"), color: C.warn, size: 28, bold: true }, { text: t("P / clic para seguir · ESC para salir", "P / click to resume · ESC to quit"), size: 13 }]);
    } else if (state === "over") {
      panel([
        { text: "💀 GAME OVER", color: C.err, size: 32, bold: true },
        { text: `${t("llegaste a", "you reached")} ${S.file} · ${score} pts`, size: 15 },
        { text: coarse ? t("toca para reintentar el nivel · ✕ salir", "tap to retry the level · ✕ quit") : t("Enter: reintentar el nivel · ESC: salir", "Enter: retry the level · ESC: quit"), color: "rgba(255,255,255,0.6)", size: 13 },
      ]);
    } else if (state === "end") {
      if (Math.random() < 0.05) burstConfetti();
      panel([
        { text: t("🏆 2019 → 2026 COMPLETADO", "🏆 2019 → 2026 COMPLETE"), color: C.acc, size: 30, bold: true },
        { text: `SCORE ${score}${score > startHi ? t(" · ¡NUEVO RÉCORD!", " · NEW HIGH SCORE!") : ""}`, color: C.warn, size: 18, bold: true },
        { text: t("8 años, 8 juegos. Lo que sigue aún no está escrito… continuará en 2027.", "8 years, 8 games. What's next isn't written yet… to be continued in 2027."), size: 14 },
        { text: coarse ? t("toca para jugar otra vez · ✕ salir", "tap to play again · ✕ quit") : t("Enter: jugar otra vez · ESC: salir", "Enter: play again · ESC: quit"), color: "rgba(255,255,255,0.6)", size: 13 },
      ]);
    }

    raf = requestAnimationFrame(frame);
  }

  /** Acción principal (Enter / clic / toque) según el estado. */
  function primary() {
    if (state === "intro") { if (introT > 0.35) { state = "play"; ptr.moved = false; } }
    else if (state === "paused") state = "play";
    else if (state === "over") { score = stageStartScore; startStage(stage); }
    else if (state === "end") { score = 0; startStage(0); }
  }

  // ── listeners ───────────────────────────────────────────────────────────────
  const GAME_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"]);
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    e.stopPropagation(); // que la terminal (y el código Konami) no reaccionen mientras se juega
    if (k === "escape" || k === "q") { e.preventDefault(); stop(); return; }
    if (GAME_KEYS.has(k) || k === "enter") e.preventDefault();
    if (k === "p" && (state === "play" || state === "paused")) { state = state === "play" ? "paused" : "play"; return; }
    if (state === "play") scene?.key?.(k, e.repeat);
    if ((k === "enter" && state !== "play") || (k === " " && state !== "play")) { primary(); return; }
    keys.add(k);
    if (k !== " ") ptr.moved = false; // el teclado toma el control hasta que se mueva el ratón
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); };
  const onPointerDown = (e: PointerEvent) => {
    const touch = e.pointerType === "touch";
    const x = lx(e.clientX), y = ly(e.clientY);
    ptr.x = x; ptr.y = y; ptr.down = true;
    if (touch) {
      touches.set(e.pointerId, { x, y, sx: x, sy: y });
      if (x > W - 56 && y < 44) { stop(); return; } // ✕
      ptr.moved = true;
    }
    if (state !== "play") { primary(); return; }
    // cámara en primera persona: el clic captura el ratón (Escape lo suelta)
    if (scene?.look && !touch && document.pointerLockElement !== cvs) cvs.requestPointerLock?.();
    scene?.down?.(x, y, touch);
  };
  const onPointerMove = (e: PointerEvent) => {
    const tch = touches.get(e.pointerId);
    if (tch) {
      const x = lx(e.clientX), y = ly(e.clientY);
      if (!!scene?.look && tch.sx >= W / 2) { ptr.lookDX += (x - tch.x) * 1.6; ptr.lookDY += (y - tch.y) * 1.2; }
      tch.x = x; tch.y = y;
      if (!!scene?.look) return;
    } else if (!!scene?.look && (document.pointerLockElement === cvs || ptr.down)) {
      ptr.lookDX += e.movementX; ptr.lookDY += e.movementY;
    }
    ptr.x = lx(e.clientX); ptr.y = ly(e.clientY); ptr.moved = true;
  };
  const onPointerUp = (e: PointerEvent) => {
    const tch = touches.get(e.pointerId);
    if (tch && state === "play") scene?.swipe?.(tch.x - tch.sx, tch.y - tch.sy);
    if (state === "play") scene?.up?.(lx(e.clientX), ly(e.clientY), e.pointerType === "touch");
    touches.delete(e.pointerId); ptr.down = touches.size > 0;
  };
  const onBlur = () => { keys.clear(); if (state === "play") state = "paused"; };
  const onVis = () => { if (document.hidden) onBlur(); };
  const noMenu = (e: Event) => e.preventDefault();
  const onWheel = (e: WheelEvent) => { e.preventDefault(); if (state === "play" && e.deltaY) scene?.wheel?.(Math.sign(e.deltaY)); };

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  cvs.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  cvs.addEventListener("contextmenu", noMenu);
  cvs.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    scene?.dispose?.(); if (document.pointerLockElement === cvs) document.exitPointerLock?.();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", resize);
    cvs.remove();
    saveHi();
    o.onExit({ score, stage: reached, cleared: state === "end", hi, newHi: score > startHi && score > 0 });
  }

  // atajo solo en desarrollo para probar transiciones sin jugar cada nivel
  if (import.meta.env.DEV) (window as unknown as { __arcade: object }).__arcade = { clear: clearStage, stop };

  resize();
  startStage(stage);
  raf = requestAnimationFrame(frame);
}
