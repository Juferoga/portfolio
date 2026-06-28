#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Renderiza el CV en varios IDIOMAS (es, en) y varios ESTILOS (temas).
#  Genera un PDF por combinación en cv/out/.
#
#  Uso:   ./render-all.sh
#  Requisito: rendercv instalado.  Por defecto usa el venv local (.venv).
#             Puedes forzar otro con:  RENDERCV=rendercv ./render-all.sh
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

RENDERCV="${RENDERCV:-./.venv/bin/rendercv}"
if [ ! -x "$RENDERCV" ]; then
  if command -v rendercv >/dev/null 2>&1; then RENDERCV="rendercv"; else
    echo "✗ No encuentro 'rendercv'. Instálalo:  pip install \"rendercv[full]\"" >&2
    exit 1
  fi
fi

# Estilos a generar (los 9 temas oficiales de rendercv v2.8)
THEMES=(classic sb2nov engineeringresumes engineeringclassic moderncv harvard ink opal ember)
LANGS=(es en)

mkdir -p out .tmp
for theme in "${THEMES[@]}"; do
  printf 'design:\n  theme: %s\n' "$theme" > ".tmp/design_${theme}.yaml"
done

for lang in "${LANGS[@]}"; do
  for theme in "${THEMES[@]}"; do
    echo "▶  ${lang}  ·  ${theme}"
    "$RENDERCV" render "Juan_Felipe_Rodriguez_CV_${lang}.yaml" \
      -d ".tmp/design_${theme}.yaml" \
      -o "out/_work" \
      -pdf "out/JuanFelipeRodriguez_CV_${lang}_${theme}.pdf" \
      -nohtml -nomd -nopng >/dev/null
  done
done

rm -rf out/_work .tmp
echo
echo "✓ Listo. PDFs generados en: $(pwd)/out/"
ls -1 out/*.pdf
