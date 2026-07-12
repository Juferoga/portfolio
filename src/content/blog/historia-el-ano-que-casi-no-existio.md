---
title: "2022: el año en que el grafo mintió"
description: "Un año casi vacío en mi GitHub investigado como un caso: el sospechoso era la pereza, pero el culpable resultó ser un GitLab privado y un salón de clases."
date: 2026-07-17
tags: ["git", "gitlab", "carrera", "plot-twist"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --since=2022-01-01 --until=2022-12-31 --oneline | wc -l
41
```

Cuarenta y uno. Ese es el número de commits de todo mi 2022 en GitHub. Para
que se hagan una idea: 2019 tuvo 186, 2021 tuvo 173 y 2023 tuvo **380**. En el
medio, como un valle entre montañas, un año que apenas hace ruido.

Cuando revisé mi propio historial para armar la [línea de tiempo](/timeline) de
este portafolio, ese hueco me molestó. Un año no se apaga así porque sí. Y como
buen sospechoso de mí mismo, me monté una teoría — y, como buen detective
apurado, archivé el caso con la conclusión equivocada.

## La hipótesis equivocada: la pereza

Mi primera versión de esta historia cerraba fácil: "2022 fue un año flojo,
punto". Gráfica gris, pocos commits, nada que ver. Estaba estudiando, cansado,
distraído — un valle y ya. Me gustó porque era humano y no exigía más
investigación.

El problema es que era mentira. No una mentira mía: una mentira del `git log`
público. El grafo de contribuciones no midió mi 2022; midió solo la parte de mi
2022 que vivía en GitHub. Y resulta que ese año casi nada vivía ahí.

## La pista que yo mismo deseché

En el expediente viejo había una prueba que despaché en dos líneas:
[`prueba-tecnica-acc`](https://gitlab.com/Juferoga/prueba-tecnica-acc), un
proyecto Angular CLI 14.2.1 con commits del 2 al 3 de septiembre de 2022. Dos
días. "Es solo una prueba técnica para un proceso de selección", dije. "No hay
saga, no hay continuación. Hay una entrevista." Y pasé de largo.

Detective de pacotilla. **`acc` es la Agencia Catastral de Cundinamarca.** Esa
prueba de dos días no era un callejón sin salida: era la puerta de entrada a mi
**primer trabajo serio**, que arrancó pocas semanas después, en septiembre de
2022. Tenía la punta del hilo en la mano y la solté porque no encajaba con la
teoría cómoda.

## Lo que de verdad estaba pasando en 2022

Cuando reabrí el caso y crucé fechas, el año flojo resultó ser uno de los más
ocupados que he tenido. En simultáneo, ese mismo 2022:

- Era **Director general del GLUD** (may–ago 2022), y de paso dicté un curso de
  **GNS3** para el grupo. Nada de eso deja `commit hash`; deja gente que
  aprendió a montar topologías de red.
- Era instructor en **Dominio Estudio de Diseño**, liderando la "Academia
  Héroes Tech" hasta julio, con cursos de Python y JavaScript para
  beneficiarios de la Corporación Mariano Matamoros. Y en diciembre volví como
  profesor: Python, Vue JS y JavaScript para la misma corporación, segunda
  cohorte.
- Y en **septiembre entré a la ACC** como desarrollador front-end de jornada
  parcial, a actualizar la página web principal de la Agencia — la versión 2.0.

Ese último punto es el que explica el hueco entero. La web de la ACC la armé con
**AngularJS integrado con Bootstrap y Angular Material**, más **RxJS, Docker y
Django**. Meses de trabajo real, del que sí deja commits. ¿Dónde estaban esos
commits? En un **GitLab privado e institucional**. Código de una entidad
pública no vive en tu perfil personal de GitHub: vive puertas adentro, en un
repositorio que el grafo público jamás va a ver.

Por eso la gráfica se puso gris. No porque dejé de programar, sino porque
empecé a programar **en serio, para alguien más, detrás de un login**.

## El grafo mide GitHub, no tu vida

Ahí está la trampa de la gráfica de contribuciones: mide una plataforma, no una
carrera. Mi 2022 tuvo tres frentes al tiempo —dirección de una comunidad de
software libre, docencia y mi primer empleo de verdad— y el `git log` público
no vio ninguno. Uno pasó por salones de clase. Otro pasó por un GitLab
institucional. El GLUD pasó por curso de GNS3 y gestión.

El trabajo no se volvió invisible porque no existiera. Se volvió invisible
porque se volvió **privado** (código institucional) y **presencial** (dar
clase). Dos cosas que un semáforo de cuadritos verdes no sabe medir.

## Lo poco que sí quedó en verde

Lo que quedó en GitHub ese año es la parte anecdótica, no la principal: puros
repos de materias con poquitos commits. Pero incluso ahí seguía asomando quién
era yo.

Está [`investigacion-mis`](https://github.com/Juferoga/investigacion-mis), que
se describe a sí mismo, textualmente, como `recap of the investigation xD`.
Hasta en el año más "callado" seguía escribiendo descripciones como si le
hablara a un compañero de banca.

Y está [`ciber-i`](https://github.com/Juferoga/ciber-i), de noviembre, cuyo
README completo — completo, no un fragmento — dice:

> Cosas de matlab GNU OCTAVE :v / pro tip :: instalar en arch, mucho más fácil.

Ese `pro tip` es lo más 2022 que hay. Mientras de día actualizaba una web
catastral en un GitLab privado, de noche mi identidad de Arch user y de GLUD
seguía viva en los dos o tres repos públicos que sí toqué. El volumen público
bajó; la identidad, nunca.

## Caso reabierto, veredicto corregido

Me habría gustado que el post viejo tuviera razón, porque "a veces un año es
solo un año" suena sabio y da paz. Pero era falso. 2022 no fue un valle: fue
una de las cumbres, solo que del lado de la montaña que no da a la cámara.

La lección, entonces, se da la vuelta. No es "dejen de buscar excusas en el git
log". Es esto: **no confíen en el git log público como si fuera su biografía.**
La gráfica gris no dice "fallaste"; a veces dice "tu trabajo se volvió lo
bastante serio como para ser privado". El código que más importa suele ser el
que no puedes mostrar.

El detective había archivado el caso equivocado. Ya lo corregí. Y esa prueba
técnica de dos días que despaché como "solo una entrevista" fue, en realidad,
donde empezó todo lo que vino después.

Caso reabierto. Caso resuelto.

```bash
juferoga@portfolio:~/blog$ echo "2022: 41 commits públicos, 3 trabajos en paralelo, 1 grafo mentiroso 🕵️"
```
