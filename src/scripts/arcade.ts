// MUTANT.EXE — el easter egg de `pong`: un pong que, al ganarlo, "se corrompe" y muta.
//   1. pong.sh      → pong clásico (con muro travieso)
//   2. pong3d.bin   → pong en un túnel 3D con efecto curva
//   3. naves.exe    → shoot'em up vertical con jefe final
//   4. doom.sh      → shooter en primera persona (raycaster) cazando bugs
// Todo en canvas 2D, sin dependencias. Las vidas se recargan en cada nivel; el puntaje se acumula.

type Beep = (freq?: number, dur?: number, vol?: number) => void;

export interface ArcadeResult { score: number; stage: number; cleared: boolean; hi: number; newHi: boolean }
export interface ArcadeOpts {
  lang: "es" | "en";
  beep: Beep;
  start?: number; // etapa inicial (0..STAGE_COUNT-1), solo si ya se desbloqueó
  onExit: (r: ArcadeResult) => void;
}

export const STAGE_COUNT = 4;
const LS_STAGE = "arcadeStage";
const LS_HI = "arcadeHi";

const lsGet = (k: string) => { try { return parseInt(localStorage.getItem(k) || "0", 10) || 0; } catch { return 0; } };
const lsSet = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch {} };

/** Última etapa a la que ha llegado este navegador (para `pong 3`, etc.). */
// en desarrollo todo está desbloqueado (para probar cualquier nivel con `pong N`)
export const unlockedStage = () => (import.meta.env.DEV ? STAGE_COUNT - 1 : Math.min(STAGE_COUNT - 1, lsGet(LS_STAGE)));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

interface Scene {
  update(dt: number): void;
  draw(): void;
  resize?(): void;
  down?(x: number, y: number, touch: boolean): void;
  dispose?(): void;
  /** objetivo actual con progreso (se muestra siempre bajo la barra superior) */
  objective(): string;
}

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
  const ptr = { x: 0, y: 0, down: false, moved: false, lookDX: 0 };
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

  const STAGES = [
    { file: "pong.sh", name: t("PONG", "PONG"), make: () => pong2D(),
      goal: t("Mete 3 goles: que la bola pase la pala rosada de la CPU (derecha).", "Score 3 goals: get the ball past the CPU's pink paddle (right)."),
      tip: t("Devuelve 3 seguidas y la bola se enciende 🔥 · pierdes ♥ si la bola pasa tu pala", "Return 3 in a row and the ball catches fire 🔥 · you lose ♥ if the ball gets past you"),
      ctrl: coarse ? t("arrastra para mover la pala", "drag to move the paddle") : t("ratón · W/S · ↑/↓", "mouse · W/S · ↑/↓") },
    { file: "pong3d.bin", name: t("PONG 3D", "PONG 3D"), make: () => pong3D(),
      goal: t("Mete 3 goles: que la bola pase la pala rosada del fondo del túnel.", "Score 3 goals: get the ball past the pink paddle at the end of the tunnel."),
      tip: t("El anillo verde marca qué tan lejos está la bola · muévete al golpear para darle efecto", "The green ring shows how far the ball is · move as you hit to add spin"),
      ctrl: coarse ? t("arrastra para mover la pala", "drag to move the paddle") : t("ratón · WASD · flechas", "mouse · WASD · arrows") },
    { file: "naves.exe", name: t("NAVES", "STARSHIPS"), make: () => shmup(),
      goal: t("Sobrevive a 3 oleadas de bugs y derriba al jefe: el MONOLITO LEGACY.", "Survive 3 bug waves and take down the boss: the LEGACY MONOLITH."),
      tip: t("Disparas solo: tú esquiva · recoge 3x (triple), ◇ (escudo) y ♥ (vida)", "You fire automatically: just dodge · grab 3x (triple), ◇ (shield) and ♥ (life)"),
      ctrl: coarse ? t("arrastra para volar · disparo automático", "drag to fly · auto-fire") : t("ratón o WASD · disparo automático", "mouse or WASD · auto-fire") },
    { file: "doom.sh", name: t("SHOOTER", "SHOOTER"), make: () => fps(),
      goal: t("Encuentra y elimina los 8 bugs del laberinto, incluido el jefe KERNEL PANIC.", "Find and wipe out the 8 bugs in the maze, boss KERNEL PANIC included."),
      tip: t("El minimapa (arriba a la derecha) muestra los bugs que ya viste · esquiva sus bolas rosadas", "The minimap (top right) shows the bugs you've spotted · dodge their pink orbs"),
      ctrl: coarse ? t("izq: moverse · der: girar y disparar", "left: move · right: turn & shoot") : t("WASD moverse · ratón/←→ girar · clic/espacio disparar", "WASD move · mouse/←→ turn · click/space shoot") },
  ];

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

  function saveHi() { if (score > hi) { hi = score; lsSet(LS_HI, hi); } }

  function startStage(i: number) {
    stage = i; lives = maxLives(); stageStartScore = score; hurtCool = 0;
    particles.length = 0;
    scene?.dispose?.();
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

    return {
      resize: fit,
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

    return {
      resize: fit,
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
    const boss = { on: false, x: W / 2, y: -140, hp: 120, max: 120, t: 0, cool: 0, ring: 0, flash: 0, w: 150 };

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

    return {
      objective: () => boss.on
        ? t(`🎯 Derriba al MONOLITO LEGACY · ${Math.ceil((boss.hp / boss.max) * 100)}%`, `🎯 Take down the LEGACY MONOLITH · ${Math.ceil((boss.hp / boss.max) * 100)}%`)
        : t(`🎯 Sobrevive · oleada ${Math.max(1, wave)}/3`, `🎯 Survive · wave ${Math.max(1, wave)}/3`),
      update(dt) {
        // estrellas en paralaje
        for (const s of stars) { s.y += s.z * dt * (boss.on ? 0.35 : 0.22); if (s.y > 1) { s.y -= 1; s.x = Math.random(); } }
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
            boss.cool = rage ? 0.75 : 1.05;
            const a = Math.atan2(ship.y - boss.y, ship.x - boss.x);
            for (const d of [-0.25, 0, 0.25]) fireAt(boss.x, boss.y + 30, a + d, rage ? 300 : 250);
          }
          if (boss.ring <= 0) {
            boss.ring = rage ? 1.6 : 2.4;
            const n = rage ? 16 : 12, off = boss.t;
            for (let i = 0; i < n; i++) fireAt(boss.x, boss.y, off + (i / n) * TAU, 170);
          }
          if (rage && Math.floor(boss.t * 12) % 2 === 0) fireAt(boss.x, boss.y, boss.t * 4, 190);
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

  // ═════════════════════════════════════════════════════════════════════════════
  // 4 · SHOOTER EN PRIMERA PERSONA (raycaster a lo Wolfenstein)
  // ═════════════════════════════════════════════════════════════════════════════
  function fps(): Scene {
    // # muro · 2 muro de servidores · 3 muro "vidrio" · e bug · B jefe · P jugador
    const MAP = [
      "################",
      "#P..#.....3....#",
      "#...#..e..3..e.#",
      "#.###.........##",
      "#.....##2##....#",
      "##.e..#...#..e.#",
      "#.....#.e.#....#",
      "#..2..##.##.2..#",
      "#..............#",
      "#.e.##3..3##.e.#", // puerta a la sala del jefe
      "#...#..B...#...#",
      "#...#......#...#",
      "################",
    ];
    const grid = MAP.map((r) => r.split(""));
    const MH = grid.length, MW = grid[0].length;
    const solid = (x: number, y: number) => { const c = grid[Math.floor(y)]?.[Math.floor(x)]; return c === undefined || c === "#" || c === "2" || c === "3"; };

    type Mob = { x: number; y: number; hp: number; max: number; cool: number; boss: boolean; flash: number; t: number; dead: number; seen: boolean };
    type Orb = { x: number; y: number; vx: number; vy: number; big: boolean };
    const pl = { x: 1.5, y: 1.5, a: 0, cool: 0, kick: 0, bob: 0, muzzle: 0 };
    const mobs: Mob[] = [], orbs: Orb[] = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const c = grid[y][x];
      if (c === "P") { pl.x = x + 0.5; pl.y = y + 0.5; grid[y][x] = "."; }
      if (c === "e" || c === "B") {
        const boss = c === "B";
        mobs.push({ x: x + 0.5, y: y + 0.5, hp: boss ? 16 : 3, max: boss ? 16 : 3, cool: rand(1, 2.5), boss, flash: 0, t: rand(0, 10), dead: 0, seen: false });
        grid[y][x] = ".";
      }
    }
    const total = mobs.length;
    let won = 0;
    const FOV = 0.66;
    let zbuf = new Float32Array(1);
    let colW = 2;

    // sprites pre-renderizados (se cortan por columnas según el z-buffer)
    const sprite = (draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      draw(c.getContext("2d")!); return c;
    };
    const drawBug = (g: CanvasRenderingContext2D, body: string, eye: string) => {
      g.shadowColor = body; g.shadowBlur = 8;
      g.strokeStyle = body; g.lineWidth = 3;
      g.beginPath();
      for (const k of [-1, 1]) for (const l of [30, 38, 46]) { g.moveTo(32 + k * 12, l); g.lineTo(32 + k * 26, l + 8); }
      g.moveTo(26, 16); g.lineTo(20, 6); g.moveTo(38, 16); g.lineTo(44, 6);
      g.stroke();
      g.fillStyle = body; g.beginPath(); g.ellipse(32, 38, 15, 20, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(32, 20, 10, 0, TAU); g.fill();
      g.shadowBlur = 0; g.fillStyle = eye;
      g.fillRect(26, 17, 4, 5); g.fillRect(34, 17, 4, 5);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(31, 26, 2, 30);
    };
    const SPR = {
      bug: sprite((g) => drawBug(g, C.pink, "#000")),
      hit: sprite((g) => drawBug(g, "#ffffff", C.pink)),
      boss: sprite((g) => drawBug(g, C.err, C.warn)),
      orb: sprite((g) => {
        const r = g.createRadialGradient(32, 32, 2, 32, 32, 22);
        r.addColorStop(0, "#fff"); r.addColorStop(0.4, "#ff9ccc"); r.addColorStop(1, "rgba(255,61,154,0)");
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      }),
    };

    const fit = () => { colW = Math.max(hq ? 2 : 3, Math.ceil(W / (hq ? 420 : 300))); zbuf = new Float32Array(Math.ceil(W / colW) + 1); };
    fit();

    function los(ax: number, ay: number, bx: number, by: number) {
      const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 6);
      for (let i = 1; i < n; i++) if (solid(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
      return true;
    }
    function move(o2: { x: number; y: number }, dx: number, dy: number, r = 0.22) {
      if (!solid(o2.x + dx + Math.sign(dx) * r, o2.y)) o2.x += dx;
      if (!solid(o2.x, o2.y + dy + Math.sign(dy) * r)) o2.y += dy;
    }
    /** Proyección de un punto del mundo a pantalla: { sx, depth } o null si está detrás. */
    function project(x: number, y: number) {
      const dirX = Math.cos(pl.a), dirY = Math.sin(pl.a);
      const plX = -dirY * FOV, plY = dirX * FOV;
      const rx = x - pl.x, ry = y - pl.y;
      const inv = 1 / (plX * dirY - dirX * plY);
      const tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry);
      if (ty <= 0.1) return null;
      return { sx: (W / 2) * (1 + tx / ty), depth: ty };
    }
    function shoot() {
      if (pl.cool > 0 || won) return;
      pl.cool = 0.28; pl.kick = 1; pl.muzzle = 0.06; sfx.shoot(); o.beep(180, 30, 0.04);
      // hitscan: el bug más cercano que cubra el centro de la mira y no esté detrás de un muro
      let best: Mob | null = null, bestD = Infinity;
      const zc = zbuf[Math.floor(W / 2 / colW)] ?? Infinity;
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const p = project(m.x, m.y);
        if (!p || p.depth > zc) continue;
        const half = (H / p.depth) * (m.boss ? 0.42 : 0.3);
        if (Math.abs(p.sx - W / 2) < half && p.depth < bestD) { best = m; bestD = p.depth; }
      }
      if (best) {
        best.hp--; best.flash = 0.12; best.seen = true;
        if (best.hp <= 0) {
          best.dead = 0.5; addScore(best.boss ? 4000 : 400); sfx.boom(); shakeIt(8);
          if (mobs.every((m) => m.hp <= 0)) { won = 2.2; flash = 0.5; }
        } else { o.beep(700, 10, 0.03); addScore(20); }
      }
    }

    const onLockClick = () => { if (!coarse && document.pointerLockElement !== cvs) cvs.requestPointerLock?.(); };

    return {
      resize: fit,
      objective: () => {
        const left = mobs.filter((m) => m.hp > 0).length;
        return t(`🎯 Bugs eliminados ${total - left}/${total}`, `🎯 Bugs wiped ${total - left}/${total}`);
      },
      down(x, _y, touch) {
        if (!touch) { onLockClick(); shoot(); }
        else if (x > W / 2) shoot();
      },
      dispose() { if (document.pointerLockElement === cvs) document.exitPointerLock?.(); },
      update(dt) {
        pl.cool = Math.max(0, pl.cool - dt); pl.kick = Math.max(0, pl.kick - dt * 5); pl.muzzle = Math.max(0, pl.muzzle - dt);
        // giro: ratón (con pointer lock o arrastrando), flechas, o mitad derecha en táctil
        pl.a += ptr.lookDX * 0.0028; ptr.lookDX = 0;
        if (key("arrowleft")) pl.a -= 2.6 * dt;
        if (key("arrowright")) pl.a += 2.6 * dt;
        let fw = 0, st = 0;
        if (key("w", "arrowup")) fw += 1;
        if (key("s", "arrowdown")) fw -= 1;
        if (key("a")) st -= 1;
        if (key("d")) st += 1;
        if (key(" ")) shoot();
        for (const tch of touches.values()) {
          if (tch.sx < W / 2) { fw += clamp(-(tch.y - tch.sy) / 60, -1, 1); st += clamp((tch.x - tch.sx) / 60, -1, 1); }
        }
        const dX = Math.cos(pl.a), dY = Math.sin(pl.a), spd = 2.8 * dt;
        const mx = (dX * fw - dY * st) * spd, my = (dY * fw + dX * st) * spd;
        if (mx || my) pl.bob += dt * 10;
        move(pl, mx, my);

        for (const m of mobs) {
          m.t += dt; m.flash = Math.max(0, m.flash - dt);
          if (m.hp <= 0) { m.dead = Math.max(0, m.dead - dt); continue; }
          const d = Math.hypot(pl.x - m.x, pl.y - m.y);
          const sees = d < 9 && los(m.x, m.y, pl.x, pl.y);
          if (sees) m.seen = true;
          if (m.seen && d > 1.3) move(m, ((pl.x - m.x) / d) * dt * (m.boss ? 0.9 : 1.25), ((pl.y - m.y) / d) * dt * (m.boss ? 0.9 : 1.25), 0.3);
          if (d < 0.7) hurt();
          m.cool -= dt;
          if (sees && m.cool <= 0) {
            m.cool = m.boss ? 1.1 : rand(1.6, 2.6);
            const a = Math.atan2(pl.y - m.y, pl.x - m.x);
            for (const off of m.boss ? [-0.22, 0, 0.22] : [0]) orbs.push({ x: m.x, y: m.y, vx: Math.cos(a + off) * 3.6, vy: Math.sin(a + off) * 3.6, big: m.boss });
            o.beep(m.boss ? 140 : 240, 30, 0.02);
          }
        }
        for (const b of orbs) {
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (solid(b.x, b.y)) b.vx = NaN;
          else if (Math.hypot(b.x - pl.x, b.y - pl.y) < 0.3) { b.vx = NaN; hurt(); }
        }
        filter(orbs, (b) => !Number.isNaN(b.vx));
        if (won > 0) { won -= dt; if (won <= 0) clearStage(); }
      },
      draw() {
        const dirX = Math.cos(pl.a), dirY = Math.sin(pl.a);
        const plX = -dirY * FOV, plY = dirX * FOV;
        const horizon = H / 2 + Math.sin(pl.bob) * 4;
        // cielo raso y piso con degradado + líneas de rejilla
        const g1 = ctx.createLinearGradient(0, 0, 0, horizon);
        g1.addColorStop(0, "#02030a"); g1.addColorStop(1, "#0b1020");
        ctx.fillStyle = g1; ctx.fillRect(0, 0, W, horizon);
        const g2 = ctx.createLinearGradient(0, horizon, 0, H);
        g2.addColorStop(0, "#050805"); g2.addColorStop(1, "#0f1a12");
        ctx.fillStyle = g2; ctx.fillRect(0, horizon, W, H - horizon);
        ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
        for (let i = 1; i < 14; i++) { const y = horizon + (H - horizon) * Math.pow(i / 14, 2.2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // muros: DDA por columna
        const cols = Math.ceil(W / colW);
        for (let i = 0; i < cols; i++) {
          const camX = (2 * i * colW) / W - 1;
          const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
          let mx = Math.floor(pl.x), my = Math.floor(pl.y);
          const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
          const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
          let sdx = rdx < 0 ? (pl.x - mx) * ddx : (mx + 1 - pl.x) * ddx;
          let sdy = rdy < 0 ? (pl.y - my) * ddy : (my + 1 - pl.y) * ddy;
          let side = 0, cell = "#";
          for (let k = 0; k < 64; k++) {
            if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
            const c = grid[my]?.[mx];
            if (c === undefined || c === "#" || c === "2" || c === "3") { cell = c ?? "#"; break; }
          }
          const dist = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
          zbuf[i] = dist;
          const h = H / dist;
          let wx = side === 0 ? pl.y + dist * rdy : pl.x + dist * rdx; wx -= Math.floor(wx);
          const shade = clamp(1.3 / (1 + dist * 0.3), 0.1, 1) * (side ? 0.7 : 1);
          const base = cell === "2" ? C.warn : cell === "3" ? C.cyan : C.fg;
          const x = i * colW, top = horizon - h / 2, cw = colW + 0.5;
          // estética "neón": muro oscuro teñido + bordes y juntas brillantes
          ctx.globalAlpha = 1; ctx.fillStyle = "#020403"; ctx.fillRect(x, top, cw, h);
          ctx.fillStyle = base;
          ctx.globalAlpha = (cell === "3" ? 0.1 : 0.2) * shade; ctx.fillRect(x, top, cw, h);
          ctx.globalAlpha = shade;
          const edge = Math.max(1, h * 0.012);
          ctx.fillRect(x, top, cw, edge); ctx.fillRect(x, top + h - edge, cw, edge);
          if (wx < 0.015 || wx > 0.985) ctx.fillRect(x, top, cw, h);
          if (cell === "#") { ctx.globalAlpha = 0.35 * shade; ctx.fillRect(x, top + h * 0.5, cw, Math.max(1, h * 0.006)); }
          if (cell === "2") {
            // rack de servidores con leds parpadeando
            ctx.globalAlpha = 0.45 * shade;
            for (let r = 1; r < 7; r++) ctx.fillRect(x, top + h * (r / 7), cw, Math.max(1, h * 0.008));
            if (wx > 0.15 && wx < 0.22) {
              for (let r = 0; r < 6; r++) {
                ctx.fillStyle = (Math.floor(performance.now() / 260 + mx * 7 + my * 3 + r * 5) % 4) ? C.acc : C.err;
                ctx.globalAlpha = shade; ctx.fillRect(x, top + h * (r / 7 + 0.07), cw, h * 0.03);
              }
            }
          }
          if (cell === "3" && Math.abs(wx - 0.3) < 0.04) { ctx.globalAlpha = 0.35 * shade; ctx.fillStyle = "#fff"; ctx.fillRect(x, top, cw, h); }
        }
        ctx.globalAlpha = 1;

        // sprites (bugs y proyectiles), de lejos a cerca, recortados con el z-buffer
        type Sp = { x: number; y: number; img: HTMLCanvasElement; scale: number; lift: number; alpha: number };
        const sps: Sp[] = [];
        for (const m of mobs) {
          if (m.hp <= 0 && m.dead <= 0) continue;
          const img = m.boss ? SPR.boss : m.flash > 0 ? SPR.hit : SPR.bug;
          sps.push({ x: m.x, y: m.y, img, scale: m.boss ? 1.25 : 0.8, lift: Math.sin(m.t * 6) * 0.03, alpha: m.hp > 0 ? 1 : m.dead / 0.5 });
        }
        for (const b of orbs) sps.push({ x: b.x, y: b.y, img: SPR.orb, scale: b.big ? 0.45 : 0.32, lift: 0.05, alpha: 1 });
        sps.sort((a, b) => Math.hypot(b.x - pl.x, b.y - pl.y) - Math.hypot(a.x - pl.x, a.y - pl.y));
        for (const s of sps) {
          const p = project(s.x, s.y);
          if (!p) continue;
          const size = (H / p.depth) * s.scale;
          const top = horizon + (H / p.depth) * (0.5 - s.lift) - size;
          const left = p.sx - size / 2;
          ctx.globalAlpha = s.alpha;
          for (let c0 = Math.max(0, Math.floor(left / colW)); c0 * colW < left + size && c0 < zbuf.length; c0++) {
            if (zbuf[c0] < p.depth) continue;
            const x0 = c0 * colW, u = ((x0 - left) / size) * 64;
            ctx.drawImage(s.img, clamp(u, 0, 63), 0, Math.max(1, (colW / size) * 64), 64, x0, top, colW + 0.5, size);
          }
          ctx.globalAlpha = 1;
          const m = mobs.find((mm) => mm.x === s.x && mm.y === s.y && mm.boss && mm.hp > 0);
          if (m && (zbuf[clamp(Math.floor(p.sx / colW), 0, zbuf.length - 1)] ?? 0) >= p.depth) hpBar(p.sx - size / 3, top - 10, (size * 2) / 3, m.hp / m.max, C.err);
        }

        // arma: un "blaster" de terminal con balanceo y retroceso
        const gx = W / 2 + Math.sin(pl.bob * 0.5) * 10, gy = H - 20 + Math.abs(Math.cos(pl.bob * 0.5)) * 8 + pl.kick * 26;
        const gs = clamp(H / 560, 0.7, 1.5);
        if (pl.muzzle > 0) {
          const r = ctx.createRadialGradient(gx, gy - 150 * gs, 0, gx, gy - 150 * gs, 60 * gs);
          r.addColorStop(0, "#fff"); r.addColorStop(0.3, C.warn); r.addColorStop(1, "rgba(255,200,0,0)");
          ctx.fillStyle = r; ctx.beginPath(); ctx.arc(gx, gy - 150 * gs, 60 * gs, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = "#111a14"; ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - 60 * gs, gy); ctx.lineTo(gx - 26 * gs, gy - 130 * gs); ctx.lineTo(gx + 26 * gs, gy - 130 * gs); ctx.lineTo(gx + 60 * gs, gy); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.acc; ctx.font = font(14 * gs, true); ctx.textAlign = "center";
        ctx.fillText(">_", gx, gy - 70 * gs);
        glow(C.acc, 14); ctx.fillStyle = C.br; ctx.fillRect(gx - 14 * gs, gy - 140 * gs, 28 * gs, 10 * gs); glow(null);

        // mira
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 12, H / 2); ctx.lineTo(W / 2 - 4, H / 2); ctx.moveTo(W / 2 + 4, H / 2); ctx.lineTo(W / 2 + 12, H / 2);
        ctx.moveTo(W / 2, H / 2 - 12); ctx.lineTo(W / 2, H / 2 - 4); ctx.moveTo(W / 2, H / 2 + 4); ctx.lineTo(W / 2, H / 2 + 12);
        ctx.stroke();

        // minimapa
        const ms = clamp(Math.min(W, H) / 110, 4, 8), ox = W - MW * ms - 16, oy = W < 640 ? 84 : 56;
        ctx.globalAlpha = 0.85; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(ox - 4, oy - 4, MW * ms + 8, MH * ms + 8);
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const c = grid[y][x];
          if (c !== ".") { ctx.fillStyle = c === "2" ? C.warn : c === "3" ? C.cyan : C.dim; ctx.fillRect(ox + x * ms, oy + y * ms, ms, ms); }
        }
        const reveal = mobs.filter((mm) => mm.hp > 0).length <= 2; // los últimos se marcan siempre
        for (const m of mobs) if (m.hp > 0 && (m.seen || reveal)) { ctx.fillStyle = m.boss ? C.err : C.pink; ctx.fillRect(ox + m.x * ms - 2, oy + m.y * ms - 2, 4, 4); }
        ctx.fillStyle = C.br; ctx.beginPath(); ctx.arc(ox + pl.x * ms, oy + pl.y * ms, 2.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = C.br; ctx.beginPath(); ctx.moveTo(ox + pl.x * ms, oy + pl.y * ms); ctx.lineTo(ox + (pl.x + dirX * 1.4) * ms, oy + (pl.y + dirY * 1.4) * ms); ctx.stroke();
        ctx.globalAlpha = 1;

        if (won > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, H / 2 - 50, W, 100);
          ctx.textAlign = "center"; ctx.fillStyle = C.acc; ctx.font = font(22, true);
          ctx.fillText("git commit -m \"fix: everything\" ✔", W / 2, H / 2 + 8);
        }

        // controles táctiles: guía del joystick
        if (coarse) {
          for (const tch of touches.values()) if (tch.sx < W / 2) {
            ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(tch.sx, tch.sy, 50, 0, TAU); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(tch.x, tch.y, 20, 0, TAU); ctx.fill();
          }
        }
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
    ctx.fillText(W < 520 ? `[${stage + 1}/${STAGE_COUNT}]` : `[${stage + 1}/${STAGE_COUNT}] ${S.file}`, 16, 20);
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
    t("pong.sh: Segmentation fault (core dumped)", "pong.sh: Segmentation fault (core dumped)"),
    t("pong3d.bin: kernel: out of memory — matando proceso", "pong3d.bin: kernel: out of memory — killing process"),
    t("naves.exe: stack smashing detected ***", "naves.exe: stack smashing detected ***"),
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
    ctx.fillText(`${t("mutando a", "mutating into")} ${STAGES[stage + 1].file} … ${pct}%`, W / 2, H / 2 + 16);
    ctx.textBaseline = "alphabetic";
    if (transT >= D) {
      stage++; reached = Math.max(reached, stage);
      scene?.dispose?.();
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
        { text: `${t("NIVEL", "LEVEL")} ${stage + 1} · ${S.name}`, color: C.acc, size: 30, bold: true },
        { text: `$ ./${S.file}`, color: "rgba(255,255,255,0.5)", size: 13 },
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
        { text: t("🏆 MUTANT.EXE COMPLETADO", "🏆 MUTANT.EXE COMPLETE"), color: C.acc, size: 30, bold: true },
        { text: `SCORE ${score}${score > startHi ? t(" · ¡NUEVO RÉCORD!", " · NEW HIGH SCORE!") : ""}`, color: C.warn, size: 18, bold: true },
        { text: t("pong → 3D → naves → shooter. Ya no queda nada que mutar… por ahora.", "pong → 3D → ships → shooter. Nothing left to mutate… for now."), size: 14 },
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
    if (k === "enter" || (k === " " && state !== "play")) { primary(); return; }
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
    scene?.down?.(x, y, touch);
  };
  const onPointerMove = (e: PointerEvent) => {
    const tch = touches.get(e.pointerId);
    if (tch) {
      const x = lx(e.clientX), y = ly(e.clientY);
      if (stage === 3 && tch.sx >= W / 2) ptr.lookDX += (x - tch.x) * 1.6;
      tch.x = x; tch.y = y;
      if (stage === 3) return;
    } else if (stage === 3 && (document.pointerLockElement === cvs || ptr.down)) {
      ptr.lookDX += e.movementX;
    }
    ptr.x = lx(e.clientX); ptr.y = ly(e.clientY); ptr.moved = true;
  };
  const onPointerUp = (e: PointerEvent) => { touches.delete(e.pointerId); ptr.down = touches.size > 0; };
  const onBlur = () => { keys.clear(); if (state === "play") state = "paused"; };
  const onVis = () => { if (document.hidden) onBlur(); };
  const noMenu = (e: Event) => e.preventDefault();

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  cvs.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  cvs.addEventListener("contextmenu", noMenu);
  window.addEventListener("resize", resize);

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    scene?.dispose?.();
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
