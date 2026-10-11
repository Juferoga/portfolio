// Idioma de las páginas estáticas (blog, timeline, 404). Comparte la clave
// "lang" de localStorage con la terminal y la versión visual, así el idioma
// elegido se mantiene en todo el sitio.

export type Lang = "es" | "en";

export const getLang = (): Lang => (document.documentElement.lang === "en" ? "en" : "es");

/** Cambia el idioma, lo persiste y avisa a los scripts de la página (evento "langchange"). */
export function setLang(lang: Lang) {
  document.documentElement.lang = lang;
  try { localStorage.setItem("lang", lang); } catch {}
  window.dispatchEvent(new CustomEvent<Lang>("langchange", { detail: lang }));
}

/** Elige el texto del idioma activo (para strings generados por JS). */
export const tr = (es: string, en: string) => (getLang() === "en" ? en : es);
