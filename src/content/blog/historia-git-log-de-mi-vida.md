---
title: "git log --all: ocho años de commits contados como una historia"
description: "Post introductorio de la serie: por qué convertí mi historial de GitHub y GitLab en una línea de tiempo interactiva y qué vas a encontrar en ella."
date: 2026-07-13
tags: ["meta", "git", "timeline", "carrera"]
lang: es
---

```bash
juferoga@portfolio:~$ git log --all --oneline --author="yo"
```

Imagina que tu vida tuviera un `git log`. No las fotos, no el LinkedIn
maquillado: los **commits** de verdad, los que dejan huella con timestamp y
todo. Yo tengo uno, y arranca en un `HEAD` muy concreto.

## El commit inicial

`2018-08-30T18:47:11Z`: creo mi cuenta de GitHub. Minutos después, ese mismo
día, hago el primer `git init` de mi vida pública con
[C-BasicProyects](https://github.com/Juferoga/C-BasicProyects), unos
ejercicios de C/C++ de primer semestre. La cuenta y el repo número uno nacieron
prácticamente en el mismo `commit`. Ese año cerré con **2 contribuciones**. Dos.
El clásico "hola mundo" antes de que la cosa se pusiera seria.

Desde ahí, todo escaló. En 2019 salté a **186 commits**, y lo que empezó como
tareas de la Universidad Distrital se convirtió en ocho años de historia
repartida entre dos plataformas: GitHub, mi perfil principal con **más de 85
repos**, y GitLab, testigo de la época GLUD/gnubies.

## Cómo rescaté mi propia historia

El problema con ocho años de commits es que la memoria falla, pero `git` no.
Así que en lugar de reconstruir mi carrera de memoria, la saqué con datos duros.

Con `gh api` autenticado leí el header `Link` de cada repo pidiendo
`commits?per_page=1`: un truco viejo para que GitHub te diga cuántos commits
tiene un repo sin descargarlos todos. Para las contribuciones anuales de verdad
usé la GraphQL `contributionsCollection`, que es la fuente canónica de esos
cuadritos verdes. Y para la otra mitad de mi vida —la de GitLab— tiré de la API
pública v4 con mi `user id 2806791`.

El resultado no es un CV. Es una **línea de tiempo interactiva** que vive en
[/timeline](/timeline), donde cada era tiene su color, sus repos y sus datos
reales. Esta serie, "mi vida en git", es el recorrido comentado de esa línea.

## Las siete eras

Ocho años no caben en un solo post, así que los partí en siete eras, cada una
con su identidad:

1. **Los orígenes (2018-2019)** 🌱 — del SENA a la Distrital, ejercicios de C/C++
   y la entrada al GLUD.
2. **Pandemia y GLUD dorado (2020)** 🦠 — cuarentena, ciencia de datos aplicada
   al COVID-19 y la época dorada del ricing.
3. **Universidad plena (2021)** 🎓 — 173 commits, clases de Angular y Docker que
   dicté yo mismo, y un Monopoly en Java.
4. **El año callado (2022)** 🌵 — el más silencioso de todos, con apenas **41
   commits**. Sobre este hay que hablar aparte.
5. **El gran año (2023)** 🚀 — el pico absoluto: **380 commits, 29 repos nuevos**,
   29 PRs y 110 issues. Un año que fue casi el doble que cualquier otro.
6. **El salto profesional (2024)** 🏦 — la prueba técnica que abrió la puerta al
   Banco de Bogotá y el paso a cloud developer.
7. **Maestría y presente (2025-2026)** 🧠 — un 2025 con solo **19 commits**, el
   más callado de todos, seguido del regreso en 2026 con **190 commits** hasta
   julio, ya en modo maestría en IA.

## El fantasma en la máquina

Si te paseas por mis repos vas a notar una firma recurrente: el emoji fantasma
👻. Aparece en casi todos los README universitarios, empezando por mi repo de
perfil, [Juferoga](https://github.com/Juferoga/Juferoga), descrito nada menos
que como *"The Secret Github Repository 👻"*. No es casualidad; es mi marca de
agua desde 2020.

## El plot twist que promete la serie

Aquí viene el gancho. El **2022** es mi "año sabático" en GitHub: 41 commits, un
bajón brutal frente a los 173 del año anterior. La teoría cómoda sería que fue
simplemente un año flojo, sin más historia detrás.

Pues no. Cuando crucé los datos, la pista llevaba a otro lado: ese mismo 2022
fui director del GLUD, dicté clases presenciales y arranqué mi primer trabajo
serio — pero el código de ese trabajo vivía en un **GitLab privado e
institucional**, invisible para cualquier grafo público. El silencio no era
silencio de verdad: era trabajo real que un semáforo de cuadritos verdes no
sabe medir. Las razones completas de ese año ocupadísimo son una de las
historias que quiero contar en esta serie.

Ese es el tipo de cosas que solo salen cuando cruzas los datos en vez de
adornar la narrativa. Y hay varias más enterradas entre los 380 commits de 2023
y los 19 de 2025.

## Empieza por aquí

Este es el commit inicial de la serie: cortito, a propósito. Los siguientes
posts van era por era, con los repos, las anécdotas y los números reales de cada
una.

Si quieres adelantarte y ver el mapa completo antes de leer los capítulos,
pásate por [/timeline](/timeline) y navega las siete eras con tus propios ojos.
Ahí está todo, con `git` como única fuente de la verdad.

```bash
juferoga@portfolio:~$ echo "checkout /timeline y nos vemos en la era 1 👻"
```
