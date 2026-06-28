# 📄 CV — rendercv

Mi hoja de vida generada con [**rendercv**](https://github.com/rendercv/rendercv) (v2.8)
a partir de archivos YAML, en **dos idiomas** y **varios estilos**.

```
cv/
├── Juan_Felipe_Rodriguez_CV_es.yaml   ← contenido en español
├── Juan_Felipe_Rodriguez_CV_en.yaml   ← contenido en inglés
├── profile.jpg                        ← foto usada en el CV
├── render-all.sh                      ← genera todos los idiomas × estilos
└── out/                               ← PDFs generados (ignorado por git)
```

## Instalación

```bash
pip install "rendercv[full]"
# o, como en este repo, un venv local:
python3.12 -m venv .venv && ./.venv/bin/pip install "rendercv[full]"
```

## Renderizar

Un solo CV (idioma + tema por defecto del YAML):

```bash
rendercv render Juan_Felipe_Rodriguez_CV_es.yaml
```

Cambiar de **estilo** sobre la marcha (con un archivo de diseño):

```bash
echo "design:\n  theme: sb2nov" > /tmp/d.yaml
rendercv render Juan_Felipe_Rodriguez_CV_es.yaml -d /tmp/d.yaml
```

**Todos los idiomas × estilos de una vez:**

```bash
./render-all.sh        # genera cv/out/*.pdf
```

## Estilos disponibles (temas v2.8)

`classic` · `sb2nov` · `engineeringresumes` · `engineeringclassic` ·
`moderncv` · `harvard` · `ink` · `opal` · `ember`

## En el sitio web

El comando `resume` del portafolio enlaza los PDFs en tema **engineeringresumes**
(minimalista), copiados a `public/cv/`. Para actualizarlos tras un cambio:

```bash
cp out/JuanFelipeRodriguez_CV_es_engineeringresumes.pdf ../public/cv/JuanFelipeRodriguez_CV_es.pdf
cp out/JuanFelipeRodriguez_CV_en_engineeringresumes.pdf ../public/cv/JuanFelipeRodriguez_CV_en.pdf
```

## Editar el contenido

Toda la info vive en los dos `.yaml`. Edita experiencia, educación, skills, etc.
La estructura sigue el [esquema oficial de rendercv](https://docs.rendercv.com/).
