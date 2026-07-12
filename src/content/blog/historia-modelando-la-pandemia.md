---
title: "2020: modelé la pandemia mientras el GLUD vivía su época dorada"
description: "Cuarentena, ciencia de datos aplicada al COVID-19 en Colombia y el pico del ricing con temas de GRUB, arte en Krita y proyectos gnubies en equipo."
date: 2026-07-15
tags: ["pandemia", "data-science", "glud", "ricing", "software-libre"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --since=2020-03-01 --oneline
```

El 2020 no lo elegí yo: me lo impusieron cuatro paredes y una cuarentena
estricta. Pero si algo aprendí ese año es que el encierro, bien administrado,
es puro `git commit`. Mientras el mundo se detenía, mi actividad no: la
pandemia entró **directo al código**.

## La pandemia como dataset

En la materia de métodos numéricos la consigna fue de las que uno no olvida.
En [numeric-methods](https://github.com/Juferoga/numeric-methods) el README lo
dice tal cual: *"...realizamos un compendio de datos con el cual podamos modelar
la pandemia del COVID-19 en colombia"*. O sea, la clase de matemáticas se
volvió, de la noche a la mañana, un observatorio epidemiológico casero.

Y no paramos en las curvas de contagio. Dentro del repo vive un notebook,
`twitter_analisis.ipynb`, dedicado a la *"percepción de twitter de los usuarios
con respecto al manejo de la pandemia"*. Modelar el virus por un lado y, por el
otro, medir cómo se sentía la gente respecto al manejo de la crisis. Análisis de
sentimiento en pleno 2020, cuando el timeline era básicamente una olla a presión.

Ese fue el año en que la ciencia de datos dejó de ser una electiva y se volvió
la manera de entender lo que estaba pasando afuera. En
[emotion-recognition-ICD](https://github.com/Juferoga/emotion-recognition-ICD),
para Introducción a Ciencia de Datos, la cosa fue todavía más literal:
reconocimiento de **emociones con deep learning**. Encerrado, entrenando una red
para leer caras. Muy 2020, si me preguntan.

## El GLUD en su época dorada

Mientras yo modelaba curvas, el [GLUD](https://github.com/Juferoga/grub2-theme-glud)
—el Grupo GNU/Linux de la Universidad Distrital— vivía su mejor momento. La
cuarentena, para un colectivo de software libre acostumbrado a moverse en la
terminal, no fue una barrera: fue combustible. Nunca hubo tanto tiempo para
hacer el `rice` perfecto.

Y aquí viene mi pequeño orgullo estadístico: mi repositorio **más estrellado de
GitHub** no es una IA ni un backend elegante. Es
[grub2-theme-glud](https://github.com/Juferoga/grub2-theme-glud), un tema para
GRUB2 hecho para el grupo, con banner ASCII de "GLUD" en el README y estilos
instalables (Vimix, Stylish, Tela). Siete estrellas. Mi máximo. Con soporte
hasta para monitores ultrawide 2560x1080, porque si vas a ver el gestor de
arranque tres segundos al día, que se vean bien esos tres segundos.

El ricing no fue en solitario. En GitLab,
[custom-linux](https://gitlab.com/Juferoga/custom-linux) fue el proyecto Gnubies
2020: 59 commits personalizando AwesomeWM en equipo. El README lista a la tropa
completa —Brian Luna, Raúl Martín, Johan Castelblanco, Antony Castelblanco,
Braian Lara— junto al logo de la U. Distrital. Éramos varios enteros encerrados
haciendo `rice` de Arch por videollamada, discutiendo paddings de la barra como
si fuera el proyecto de grado.

Fui honesto conmigo mismo en otro repo, eso sí.
[Material-Awesome](https://gitlab.com/Juferoga/Material-Awesome) tiene 119
commits, pero es un **fork** de un rice ajeno de AwesomeWM (crédito a
PapyElGringo, HikariKnight y Chris Titus): de esos, apenas 10 son míos, de
personalización y traducción. Apropiar y remezclar software libre no es hacer
trampa; es, literalmente, el punto.

## Arte libre y el fantasma

Mi compromiso con lo libre no se quedó en el código. En octubre subí
[Krita](https://github.com/Juferoga/Krita), que no tiene una sola línea de
programa: son *"Dibujos realizados con la herramienta libre krita"*. Si el
sistema operativo, el editor y el gestor de arranque van a ser libres, el arte
también. Coherencia hasta en el pincel.

Ese año también nació una firma que me acompañaría por años. En agosto creé el
repo de perfil [Juferoga](https://github.com/Juferoga/Juferoga) con la
descripción *"The Secret Github Repository 👻"*. Ese emoji fantasma se coló
después en casi todos mis README universitarios como marca de la casa. Un
fantasma silencioso saludando desde cada proyecto.

## No todo fue rice

Que no se malinterprete el encierro: también hubo materia dura. En
[io-i](https://github.com/Juferoga/io-i), Investigación de Operaciones 1, metí
28 commits junto a Mateo Nariño y Jose David Sanabria; el README cita entre
comillas muy intencionadas al *"Profesor" Alberto Acosta* —las comillas son del
repo, yo solo reporto—. Y en
[LinuxSysAdmin](https://github.com/Juferoga/LinuxSysAdmin) hice ejercicios en
Shell de un curso de Coursera de la Universidad de Colorado sobre administración
y seguridad de servidores Linux. El sysadmin que llevaba dentro empezaba a
asomar.

El año cerró apuntando hacia adelante. En diciembre subí
[playground-rnr](https://github.com/Juferoga/playground-rnr), sobre redes
neuronales recurrentes, y esta vez no me quedé en notebooks: incluí un prototipo
de servicio web **desplegado en GitHub Pages**. La semilla de algo que ya no era
solo experimentar en local, sino publicar y mostrar.

## Balance de un año raro

Visto en retrospectiva, 2020 fue el año en que mis dos mundos se abrazaron: la
ciencia de datos aplicada a lo que estaba viviendo el país, y una comunidad de
software libre que encontró en el encierro su época dorada. Modelé una pandemia
y le hice `rice` a mi escritorio en la misma semana, y no sabría decir cuál de
las dos cosas me mantuvo más cuerdo.

```bash
juferoga@portfolio:~/blog$ echo "modelamos la pandemia y estrellamos el GRUB 👻" >> 2020.log
```
