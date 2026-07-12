---
title: "2021: dirigí el glud, dicté clases de angular y armé un monopoly en java"
description: "El año de universidad plena: dirección del GLUD, docencia comunitaria de Angular y Docker, la Academia Héroes Tech y el proyecto final más grande de la carrera."
date: 2026-07-16
tags: ["glud", "angular", "docker", "java", "devops"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --oneline --since=2021-01-01 --until=2021-12-31 | wc -l
173
```

Ciento setenta y tres commits en GitHub. Cero en GitLab — ni uno, todo el año.
Si 2020 fue el GLUD dorado desde el sofá de la cuarentena, 2021 fue el año en
que dejé de ser solo alumno del [Grupo GNU/Linux de la Distrital](https://github.com/Juferoga)
y me tocó pararme al frente. Literalmente: en enero pasé de profesor voluntario
a **director general del grupo**. Universidad plena, el pico académico de la
carrera y, sin darme cuenta todavía, la primera semilla de todo lo que vendría
después.

## De profesor a director

Venía enseñando fundamentos de GNU/Linux y software libre desde 2019, pero
dirigir es otra cosa. Ya no era llegar, dictar mi clase y devolverme: era
sostener el grupo, cuidar el proceso de formación de los nuevos —los famosos
**GNUBIES**— y ponerle la cara a la comunidad. Dirigir el GLUD me enseñó que el
software libre no es solo código: es gente que se junta, que se organiza y que
mantiene viva una cosa que nadie les paga por mantener.

De esa etapa me quedó especial cariño por una charla que di en el **#SLUDXVIII**:
*"Fractales y software libre"*. Mezclar matemáticas que se dibujan a sí mismas
con la filosofía de lo libre y lo compartido fue una de esas veces en que sentí
que la dirección tenía sentido más allá de lo administrativo. Ese rol de
director general lo sostuve hasta marzo de 2022.

## De aprender a enseñar

Dirigir no me sacó del tablero, al contrario. En marzo publiqué el mismo día el
material de dos clases que **dicté yo** como voluntario del grupo:
[angularClass](https://github.com/Juferoga/angularClass) y
[dockerClass](https://github.com/Juferoga/dockerClass). Fue raro y bonito seguir
del otro lado del tablero mientras, al tiempo, me tocaba coordinar quién más se
paraba a enseñar.

El guion de Angular tenía la solemnidad que se merecía la ocasión:

```bash
ng new la_mejor_app_del_mundo
ng g c holi
```

Sí, así, `la_mejor_app_del_mundo` y un componente llamado `holi`. Si alguien
esperaba nombres profesionales, se equivocó de profe. La idea era que la primera
vez que tocas un CLI no te dé miedo, que te rías un poco mientras Angular te
genera cuatro archivos por un `holi`.

La de Docker seguía el mismo espíritu. Antes de meternos con imágenes de verdad,
armamos una imagen de prueba tagueada `perrito:1.0`, y para celebrar que el
contenedor arrancaba metíamos un pipe absurdo:

```bash
cowsay | fortune | figlet
```

Una vaca ASCII diciéndote una galletita de la fortuna en letras gigantes. No
enseña nada de orquestación, pero enseña lo importante: que la terminal es un
lugar donde uno se puede divertir. Esa era toda mi pedagogía, y la sostengo.

## Enseñar dejó de ser solo voluntariado

En noviembre pasó algo que le dio otra dimensión a todo esto: empecé en
**Dominio Estudio de Diseño** como Desarrollador Web Front-End e Instructor
Especialista. Por un lado hacía lo mío de siempre —captura de requerimientos,
front-end web y mobile, diseño responsive—, pero por el otro me pusieron a
liderar la **Academia Héroes Tech**: cursos de Python y JavaScript para
beneficiarios de la **Corporación Mariano Matamoros D'Acosta**.

Fue el momento en que mi vocación de enseñar dejó de ser solo un voluntariado
del GLUD y se volvió también un oficio. Resultó que toda esa pedagogía de la vaca
ASCII y el `la_mejor_app_del_mundo` servía igual de bien dentro de un aula del
grupo que frente a gente que estaba aprendiendo a programar para cambiarse la
vida. Enseñar bien es enseñar bien, con o sin nómina de por medio.

## El pico académico

Enseñar iba por un lado; la carga de la carrera, por otro, y en 2021 estuvo
pesada. El repo que más sudé fue
[modelos-i-final](https://github.com/Juferoga/modelos-i-final): **79 commits**
para un **Monopoly funcional en Java**, el proyecto final de Modelos de
Programación 1. Lo hice en pareja con Brayan Stiven Yate Prada — un nombre que
va a aparecer varias veces este año — y hasta le montamos su propio sitio en
[GitHub Pages](https://juferoga.github.io/modelos-i-final/). Un Monopoly
completo, con su banca, sus cárceles y sus peleas por la avenida cara, escrito
en Java desde cero. Sigue siendo uno de los proyectos de los que más orgulloso
estoy de toda la universidad.

Modelos 1 fue solo el aperitivo. En noviembre llegó
[modelos-2](https://github.com/Juferoga/modelos-2), otra vez con Brayan, y ahí
me presentaron a un bicho raro: **Oz**, un lenguaje multiparadigma que casi nadie
usa fuera de un aula. Programar en Oz es como visitar un país cuyo idioma no
tiene traducción directa: te reordena la cabeza sobre qué significa "computar".
Rarísimo, y por eso mismo inolvidable.

El resto del semestre fue igual de intenso y de variado:

- [arquitectura](https://github.com/Juferoga/arquitectura) — Arquitectura de
  Computadores, **40 commits** documentados enteros en **TeX**, en equipo con
  Laura Montenegro y Nicolas Baena. Porque si vas a explicar pipelines y
  memoria caché, lo mínimo es que el PDF quede hermoso.
- [Fisica-i](https://github.com/Juferoga/Fisica-i) — trabajo grupal con Juan
  Esteban Velásquez, Santiago Herrera Rocha y Vivian Sofía Gonzáles, coronado
  con un video de YouTube sobre movimiento parabólico. Física con producción
  audiovisual incluida.

Y por supuesto, entre tanto proyecto de nota, seguía practicando por deporte:
[angular-practice](https://github.com/Juferoga/angular-practice), de mayo, donde
consumía la API de Rick & Morty "para practicar Angular". La descripción del
repo lo dice tal cual: *"...también utilizo el API de Rick & Morty XD"*. El `XD`
era parte del commit message espiritual de ese año.

## La semilla de la nube

Ahora, si hay un repo de 2021 que hoy me sorprende, es
[traefik-as-a-reverse-proxy](https://github.com/Juferoga/traefik-as-a-reverse-proxy),
de junio. Ahí documenté paso a paso cómo montar **Traefik como proxy reverso**
sobre Docker: enrutamiento, certificados, y detalles de seguridad tan puntillosos
como poner permisos `600` al `acme.json` para que nadie más pudiera leer las
llaves TLS.

En su momento era solo "quiero exponer mis contenedores bonito". Visto en
retrospectiva, era el perfil DevOps/cloud despuntando sin que yo tuviera ni idea
de que años después me iba a ganar la vida con eso. La semilla ya estaba
sembrada entre `docker-compose` y permisos de archivo.

## El commit que casi no es mío

Cierro con mi anécdota favorita del año, un pequeño recordatorio de que los
números de Git mienten si uno no los mira bien. En diciembre publiqué
[BOOLR-Adapted](https://github.com/Juferoga/BOOLR-Adapted), una adaptación del
simulador de lógica digital **BOOLR** (autor original: GGBRW).

El repo marca **343 commits**. Suena a titán. La trampa: el primero data de
**2016** — o sea, años antes de que yo siquiera tuviera cuenta. Es un fork, así
que casi todo ese historial es heredado, importado, ajeno. Tiene 343 commits
pero casi ninguno es mío. Y me parece la metáfora perfecta del software libre:
uno no siempre parte de cero, a veces toma algo que ya existe, lo adapta, lo hace
suyo y lo comparte de nuevo. El GLUD me enseñó eso antes que cualquier materia.

## Lo que venía

2021 fue movimiento puro: 173 commits, la dirección de un grupo, dos oficios
distintos enseñando lo mismo, un Monopoly, un lenguaje raro y la primera línea de
mi futuro cloud. Si querés ver cómo encaja todo esto en el mapa completo, está en
la [/timeline](/timeline). En GitLab, mientras tanto, silencio absoluto: cero
proyectos, cero commits, todo el año.

Con toda esa inercia uno pensaría que 2022 vendría todavía más fuerte. Pues no.
2022 iba a ser el año más callado de todos — pero esa es otra historia, y toca
otro `cat`.

```bash
juferoga@portfolio:~/blog$ echo "próximo capítulo: el año que casi no dejó rastro 🤫"
```
