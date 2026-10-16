// API compartida entre el motor de MUTANT.EXE (src/scripts/arcade.ts) y cada juego (games/*.ts).
// Cada juego es una fábrica `(E: Engine) => Scene`: el motor se encarga del lienzo, el HUD,
// las vidas, el puntaje, las transiciones y la entrada; el juego solo actualiza y dibuja su mundo.

export type Beep = (freq?: number, dur?: number, vol?: number) => void;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;

/** colores del tema activo de la terminal (verde / ámbar / cyber) + acentos fijos */
export interface Palette {
  fg: string; dim: string; br: string; acc: string; warn: string; err: string;
  pink: string; cyan: string; violet: string;
}

export interface Pointer {
  /** posición en coordenadas lógicas del juego (0..E.W, 0..E.H) */
  x: number; y: number;
  down: boolean;
  /** true cuando el ratón/dedo se movió desde la última tecla (el teclado lo pone en false) */
  moved: boolean;
  /** desplazamiento acumulado para cámaras (pointer lock o arrastre); el juego lo consume y lo pone en 0 */
  lookDX: number; lookDY: number;
}

export interface Touch { x: number; y: number; sx: number; sy: number }

export interface Sfx {
  blip(): void; bounce(): void; wall(): void; shoot(): void; hit(): void;
  boom(): void; hurt(): void; power(): void; point(): void;
}

export interface Scene {
  update(dt: number): void;
  draw(): void;
  /** el lienzo cambió de tamaño (E.W / E.H ya tienen el valor nuevo) */
  resize?(): void;
  /** clic o toque (coordenadas lógicas) */
  down?(x: number, y: number, touch: boolean): void;
  /** se soltó el clic o el toque */
  up?(x: number, y: number, touch: boolean): void;
  dispose?(): void;
  /** tecla pulsada (flanco). `k` en minúsculas: "arrowleft", " ", "w", "1"… */
  key?(k: string, repeat: boolean): void;
  /** gesto táctil al soltar: desplazamiento desde donde empezó el toque */
  swipe?(dx: number, dy: number): void;
  /** rueda del ratón (deltaY normalizado: +1 / -1) */
  wheel?(dir: number): void;
  /** objetivo actual con progreso (el motor lo muestra siempre bajo la barra superior) */
  objective(): string;
  /** cursor CSS sobre el lienzo (por defecto "none") */
  cursor?: string;
  /** cámara en primera persona: el clic pide pointer lock y el ratón alimenta lookDX/lookDY */
  look?: boolean;
}

export interface Engine {
  readonly ctx: CanvasRenderingContext2D;
  readonly cvs: HTMLCanvasElement;
  /** tamaño lógico del lienzo; cambia con resize() */
  readonly W: number;
  readonly H: number;
  readonly C: Palette;
  /** pantalla táctil (controles por toques/gestos) */
  readonly coarse: boolean;
  /** prefers-reduced-motion: evitar destellos, temblores y movimientos bruscos */
  readonly reduce: boolean;
  /** calidad alta (brillos/sombras). Si es false, evita shadowBlur y efectos caros */
  readonly hq: boolean;
  /** segundos desde que arrancó el arcade (para animaciones) */
  readonly time: number;
  t(es: string, en: string): string;
  font(px: number, bold?: boolean): string;

  readonly keys: Set<string>;
  /** ¿está presionada alguna de estas teclas? */
  key(...ks: string[]): boolean;
  readonly ptr: Pointer;
  readonly touches: Map<number, Touch>;

  beep: Beep;
  sfx: Sfx;

  burst(x: number, y: number, color: string, n?: number, speed?: number, size?: number): void;
  shake(n: number): void;
  /** destello rojo de pantalla (0..1) */
  flash(a: number): void;
  /** el jugador recibe daño; devuelve true si aún le quedan vidas */
  hurt(): boolean;
  addLife(): void;
  lives(): number;
  addScore(n: number): void;
  /** nivel superado */
  clear(): void;
  /** true mientras se está jugando (no en pausa / intro / transición) */
  playing(): boolean;

  glow(color: string | null, blur?: number): void;
  hpBar(x: number, y: number, w: number, f: number, col: string): void;
  filter<T>(arr: T[], keep: (x: T) => boolean): void;
}

export type GameFactory = (E: Engine) => Scene;

type I18n = { es: string; en: string };

/** textos de la tarjeta de inicio de cada nivel (el año y la era los pone el motor) */
export interface GameMeta {
  /** nombre corto en mayúsculas: "SNAKE", "CATASTRO"… */
  name: I18n;
  /** una línea que conecta el juego con lo que pasó ese año */
  story: I18n;
  /** 🎯 qué hay que lograr para pasar el nivel (concreto y medible) */
  goal: I18n;
  /** 💡 un consejo + cómo se pierde una vida */
  tip: I18n;
  /** 🕹 controles con ratón/teclado y con pantalla táctil */
  ctrl: { desktop: I18n; touch: I18n };
}
