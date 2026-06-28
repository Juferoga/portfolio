# 💻 juferoga.pro — Portafolio Terminal

Portafolio personal interactivo de **Juan Felipe Rodríguez Galindo**, con estética
_hacker terminal_: el visitante escribe comandos para descubrir mi perfil, con
efectos CRT, temas de color y varios easter eggs ocultos.

Construido con [**Astro**](https://astro.build) · HTML/CSS/TS · sin dependencias de runtime.

## 🚀 Comandos del proyecto

| Comando           | Acción                                       |
| ----------------- | -------------------------------------------- |
| `npm install`     | Instala dependencias                         |
| `npm run dev`     | Servidor local en `http://localhost:4321`    |
| `npm run build`   | Genera el sitio estático en `dist/`          |
| `npm run preview` | Previsualiza el build de producción          |

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

## 🎨 Personalización rápida

- **Colores / temas:** `src/styles/global.css` (variables `--fg`, `--accent`, …).
- **Banner ASCII:** constante `BANNER` en `src/components/Terminal.astro`.
- **Comandos nuevos / easter eggs:** objeto `COMMANDS` en el mismo archivo.

---

_"Cambiando el mundo una línea a la vez."_
