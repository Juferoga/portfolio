---
title: "2025-2026: del año más callado al ascenso en banca, con la maestría de fondo"
description: "Un 2025 en silencio público mientras el banco me absorbía, seguido de un 2026 de ascenso a Analista de sistemas II, maestría en curso y esteganografía sobre difusión."
date: 2026-07-20
tags: ["maestria", "ia", "banco", "cloud", "software-libre"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --since="2025-01-01" --oneline | wc -l
```

Séptima era. Si vienes siguiendo la serie *mi vida en git*, sabes que cada
capítulo se lee en los commits. Este es distinto: es el primero donde el
`git log` todavía está escribiéndose mientras lo cuento.

## 2025: 19 commits públicos, y una razón

El número no miente: **19 commits públicos en todo 2025** (verificados vía la
`contributionsCollection` de GitHub). Después de años de 100, 173, hasta 380
commits, sonará a bajón. Pero no fue silencio: fue que el trabajo se mudó de
repo.

Ese año estuve de lleno en el **Banco de Bogotá**, remoto, metido en
infraestructura como código sobre AWS, microservicios y frontend moderno para el
sector financiero. Nada de eso vive en mi GitHub público. Y por si fuera poco,
tuve un segundo contrato con el **IGAC** que apenas alcancé a trabajar unos dos
meses antes de tener que cederlo. Entre la banca comiéndose la agenda y ese
contrato que se me escapó de las manos, 2025 quedó callado *hacia afuera*, no
hacia adentro.

Lo poco que sí quedó en abierto lo resume bien
[second-brain](https://github.com/Juferoga/second-brain), un sistema personal de
gestión del conocimiento con estructura tipo PARA que abre con una cita de David
Allen:

> Your brain is for having ideas, not for holding them.

Ahí estaba la tesis del año: dejar de aguantar todo en la cabeza, ordenar
dotfiles, sedimentar. Un año callado no es un año vacío; es un `git stash` largo.

## El linuxero no murió: SLUD XXII

Y para que nadie crea que la banca me volvió corporativo del todo: en septiembre
de 2025, del **15 al 19**, di conferencias en la **SLUD XXII** —la Semana Linux
de la Universidad Distrital—. El mismo evento donde años atrás hablé de fractales
y software libre desde la dirección del GLUD. El linuxero del Grupo GNU/Linux
nunca se apagó; solo cambió de escenario un rato.

## Febrero de 2026: el ascenso

En el banco entré como **Analista de sistemas III** en octubre de 2024. En
**febrero de 2026 ascendí a Analista de sistemas II** —en la escala interna, el
"II" está por encima del "III"—, liderando ahora el desarrollo de soluciones
Cloud de alto impacto y la automatización de procesos financieros. Lo que más me
marcó no fue el cargo, sino el reconocimiento de la **tribu ecosistemas de
pago**: cuando el equipo con el que peleas los despliegues te lo dice, pega
distinto.

De actualizar la web de una agencia catastral en 2022 a liderar soluciones cloud
en banca. El `git log` interno cuenta esa curva mejor que cualquier CV.

## La maestría, de fondo pero siempre encendida

En paralelo arrancó la **Maestría en Ciencias de la Información y las
Comunicaciones** (MCIC) en la Universidad Distrital, énfasis en IA, modalidad
investigación. Soy oficialmente **MSc Student @UD**, y como buen obseso de la
documentación, la maestría tiene su propio dashboard público:
[mcic](https://github.com/Juferoga/mcic), con plan de créditos, barra de progreso
en ASCII y el semestre I ya cerrado. Sí, documenté mi propia maestría como si
fuera un proyecto con roadmap. Coherente con la casa.

El corazón es [mcic-tesis](https://github.com/Juferoga/mcic-tesis):

> Sistema de Esteganografía Pure Coverless sobre Modelos de Difusión.

Traduzco. La esteganografía clásica esconde un mensaje *dentro* de una imagen que
ya existe: modificas píxeles y algo chirría. **Coverless** le da la vuelta: no
hay portadora que retocar. El mensaje vive en el **espacio latente caótico de
Stable Diffusion** —un atractor hipercaótico memristivo 5D— y la imagen que sale
del modelo no se toca. El secreto no está en la imagen; está en el camino que la
generó. La recuperación usa un **estimador libre de iteración** sobre inversión
DDIM, firmado con **RSA-2048** para que nadie meta mano.

Quien siguió la serie reconocerá el hilo: la vieja `se-tesis` de 2023 era
esteganografía sobre audio con atractores caóticos. Cambió el medio —del sonido a
la difusión de imágenes—, pero el caos sigue siendo el escondite favorito.

## Papel de por medio: certificaciones

Entre el banco y la maestría igual saqué tiempo para afilar el filo. Sumé
*Engineering Practices for Building Quality Software* (University of Minnesota,
2026), *Intermediate Web and Front-End Development* (IBM, 2025), *Comunicación
efectiva para el líder actual* (Tecnológico de Monterrey, 2025) y un curso de
*ArcGIS Dashboards* con Esri Colombia. Nótese la que rompe el patrón: la de
comunicación y liderazgo. Ascender a liderar equipos también se estudia.

## Sí, también hubo ricing

Que la maestría y el banco consuman no significa que el ricer se apagara.
[ActivSpot](https://github.com/Juferoga/ActivSpot) es mi versión de una *dynamic
island* para Hyprland, en QML/Quickshell. Nació para mí, pero el README lo cuenta
solo:

> Originally developed for personal use, shared after genuine interest from the
> Reddit community.

Reddit lo pidió, Reddit lo tuvo. Software libre hasta en los ratos de descanso.

## El presente: este mismo archivo

Y así llegamos a acá, literalmente. Este
[portfolio](https://github.com/Juferoga/portfolio) —Astro sin dependencias de
runtime, estética hacker de terminal, easter eggs (prueba `sudo`, `matrix`,
`neofetch` o el Konami Code)— es el sitio donde estás leyendo esto. Su
descripción en GitHub lo dice mejor que yo:

> About me, really me :v

Ese es el punto de la serie entera. Empecé con un `C-BasicProyects` en 2018,
pasé por el GLUD, por el catastro, por el IGAC, y termino —por ahora— como
**Analista de sistemas II** en banca y maestrante escribiendo sobre difusión
latente en un blog que también es una consola. De C++ básico a cloud financiero,
sin soltar nunca el software libre. Si quieres ver el recorrido completo, está
todo mapeado en [/timeline](/timeline).

El `git log` sigue abierto. Nos vemos en el próximo commit.

```bash
juferoga@portfolio:~/blog$ git tag -a analista-ii -m "ascenso + maestría, mismo kernel" && git log --oneline -1
```
