/** Minutos de lectura estimados (≈200 palabras/min, sin contar bloques de código). */
export function readingMinutes(markdown = ""): number {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`[\]()-]/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
