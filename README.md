# 💻 juferoga.pro — Portafolio Terminal

Portafolio personal interactivo de **Juan Felipe Rodríguez Galindo**, con estética
_hacker terminal_: el visitante escribe comandos para descubrir mi perfil, con
efectos CRT, temas de color y varios easter eggs ocultos.

Construido con [**Astro**](https://astro.build) · HTML/CSS/TS · sin dependencias de runtime.

**Accesibilidad y calidad:** landmarks y `h1` únicos por vista, lightbox como
diálogo con foco atrapado, `aria-live` en la salida de la terminal, contraste AA,
`prefers-reduced-motion`, fallback completo sin JavaScript (se sirve la versión
visual renderizada en build), JSON-LD, sitemap y `astro check` en CI.

## 🚀 Comandos del proyecto

| Comando           | Acción                                       |
| ----------------- | -------------------------------------------- |
| `npm install`     | Instala dependencias                         |
| `npm run dev`     | Servidor local en `http://localhost:4321`    |
| `npm run build`   | Genera el sitio estático en `dist/`          |
| `npm run preview` | Previsualiza el build de producción          |
| `npm run check`   | Chequeo de tipos y diagnósticos (`astro check`) |

> Requiere Node 18+ (probado con Node 26).

## ⌨️ Comandos de la terminal (para el visitante)

`help` · `whoami` · `about` · `skills` · `experience` · `education` ·
`projects` · `certs` · `contact` · `social` · `resume` · `goals` · `photo` ·
`theme` · `banner` · `clear`

Además soporta historial (↑/↓), autocompletado (Tab), `Ctrl+L` para limpiar,
y **easter eggs ocultos** 🥚 (pista: `sudo`, `matrix`, `neofetch`, el Konami Code…).

## ✏️ Cómo editar mi información

Todo mi contenido vive en un solo archivo:

```
src/data/profile.ts
```

Edita ahí experiencia, skills, proyectos, contacto, etc. No necesitas tocar la
lógica de la terminal.

## 🖼️ Fotos

Coloca tus imágenes en `public/assets/photos/` y referéncialas en
`src/data/profile.ts` (campo `avatar`) o en los slots de los comandos `about`,
`projects` y `photo` dentro de `src/components/Terminal.astro`.

## 🌐 Despliegue (GitHub Pages + dominio juferoga.pro)

El repo incluye un workflow en `.github/workflows/deploy.yml` que compila y
publica automáticamente en cada push a `main`.

**Pasos una sola vez:**

1. En GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz push a `main`. El workflow construirá y desplegará el sitio.
3. **Dominio propio** (`juferoga.pro`):
   - El archivo [`public/CNAME`](public/CNAME) ya contiene `juferoga.pro`.
   - En tu proveedor DNS, crea registros apuntando a GitHub Pages:
     - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - `AAAA` (opcional, IPv6) → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
     - O un `CNAME` de `www` → `juferoga.github.io`.
   - En GitHub → Settings → Pages → **Custom domain** escribe `juferoga.pro` y
     activa **Enforce HTTPS**.

## 📝 Blog

El blog vive en `/blog` (con feed RSS en `/rss.xml`). Para publicar un post,
crea un archivo Markdown en `src/content/blog/` con este frontmatter:

```markdown
---
title: "Título del post"
description: "Resumen corto (aparece en la lista, el RSS y los buscadores)."
date: 2026-07-12
tags: ["cloud", "linux"]
draft: false   # ponlo en true para guardarlo sin publicar
---

Contenido en **Markdown** normal…
```

El nombre del archivo es la URL (`mi-post.md` → `/blog/mi-post`). Al hacer
push, el post aparece en `/blog`, en el RSS, en el sitemap y en el comando
`blog` de la terminal (muestra los 5 más recientes). Con `draft: true` queda
oculto hasta que lo publiques.

## 📊 Analítica (GoatCounter)

El sitio usa [GoatCounter](https://www.goatcounter.com): open source, gratuito,
**sin cookies ni datos personales** (no requiere banner de consentimiento).

**Activarla (una sola vez):** crea una cuenta en goatcounter.com con el código
`juferoga` (URL del sitio: `https://juferoga.pro`). El script solo se inyecta
en builds de producción (`import.meta.env.PROD` en `src/pages/index.astro`).

Además de las visitas, se registran **eventos anónimos**: qué comandos ejecutan
los visitantes (`cmd-<nombre>`), el recorrido guiado (`tour`) y el cambio a la
versión visual (`gui-visual`). Panel: `https://juferoga.goatcounter.com`.

## 🎨 Personalización rápida

- **Colores / temas:** `src/styles/global.css` (variables `--fg`, `--accent`, …).
- **Banner ASCII:** constante `BANNER` en `src/components/Terminal.astro`.
- **Comandos nuevos / easter eggs:** objeto `COMMANDS` en el mismo archivo.

---

_"Cambiando el mundo una línea a la vez."_
