---
title: "hola mundo: por qué mi portafolio es una terminal"
description: "Primer post del blog. La historia detrás de este portafolio interactivo tipo terminal, hecho con Astro y sin frameworks de runtime."
date: 2026-07-12
tags: ["meta", "astro", "terminal"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ cat hola-mundo.md
```

Bienvenido al blog. Este es el primer post — el clásico *hola mundo* — y qué
mejor tema para estrenarlo que explicar **por qué este portafolio es una
terminal**.

## La idea

Llevo años viviendo dentro de una terminal: GNU/Linux, `vim`, `ssh`, pipelines.
Cuando llegó el momento de hacer un portafolio, las plantillas de siempre no me
representaban. Quería que quien entrara **jugara** un poco: que escribiera
`help`, descubriera easter eggs, se ganara un logro con `clear` → `ls`.

## El stack

- **[Astro](https://astro.build)** — genera HTML estático; el único JavaScript
  es el de la propia terminal.
- **Cero frameworks de runtime** — sin React, sin Vue: TypeScript vanilla.
- **GitHub Pages** — deploy automático en cada push con GitHub Actions.
- **[GoatCounter](https://www.goatcounter.com)** — analítica open source y sin
  cookies.

## Lo que viene

Iré publicando notas sobre cloud, backend, IA aplicada al desarrollo y software
libre. Cositas cortas y al grano, como un buen commit.

```bash
juferoga@portfolio:~/blog$ echo "nos vemos en el próximo post 🚀"
```
