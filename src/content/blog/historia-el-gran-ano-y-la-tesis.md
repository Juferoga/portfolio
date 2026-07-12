---
title: "2023: 380 commits, jornada completa y el nacimiento de mi tesis"
description: "El año pico de la carrera: full-time en el catastro, monitoría, materias en equipo y la semilla de una tesis que mezcla caos, redes neuronales y esteganografía de audio."
date: 2026-07-18
tags: ["tesis", "criptografia", "esteganografia", "full-stack", "catastro"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --author=juferoga --since=2023-01-01 --until=2023-12-31 --oneline | wc -l
380
```

Si mi vida en git tuviera un pico, ese pico se llama **2023**. No lo digo por
nostalgia: lo dice el `contributionsCollection` de GitHub. **380 commits, 29
pull requests, 110 issues y 29 repos nuevos** en doce meses. Fue el año en que
todo lo que venía cocinándose —Angular, Docker, trabajo en equipo, el bichito
de la IA— se juntó en una sola avalancha. Y fue, sobre todo, el año en que nació
la tesis que me perseguiría hasta hoy.

## El detalle que no se ve en el gráfico

Aquí viene lo que ningún `git log` público te cuenta: esos 380 commits los hice
**mientras trabajaba a jornada completa**. Todo el 2023 estuve en la **Agencia
Catastral de Cundinamarca** como desarrollador front-end full-time, y ese código
vive en GitLab institucional privado, así que ni asoma en el verde de GitHub.

De enero a junio me tocó el **portal externo de trámites catastrales**, el que
usa el público. Ahí aprendí que hacer un portal gubernamental no es solo
maquetar: había que incorporar las **normativas de MINTIC** para portales del
Estado, dockerizar absolutamente todo (AngularJS y Django por igual) y montar el
despliegue con **Jenkins y Traefik**. De junio a diciembre salté al **portal
interno**, esta vez de punta a punta: front, back y CI/CD con **Django,
AngularJS y GitLab CI/CD**.

Y por si el día no tenía suficientes horas, de septiembre a diciembre fui
**monitor del grupo de investigación GICOGE** en la Universidad Distrital. De ahí
salieron dos repos que sí puedo enlazar:
[traefik-as-a-reverse-proxy](https://gitlab.com/Juferoga/traefik-as-a-reverse-proxy)
y la [gicoge-webpage](https://gitlab.com/Juferoga/gicoge-webpage) en Angular.

Sumando: trabajo full-time + monitoría + tesis + materias, todo al tiempo. Un
año casi sobrehumano. Que en medio de eso quedaran 380 commits, 29 PRs y 110
issues en público me sigue pareciendo un milagro de gestión del tiempo (o de
falta de sueño, según cómo lo mires). La foto completa está en el
[/timeline](/timeline).

## El salto de calidad

Los años anteriores yo tiraba código, sí, pero 2023 se sintió distinto:
proyectos con equipo, con documentación de verdad, con CI. El repo que mejor lo
resume es [bd-2](https://github.com/Juferoga/bd-2), **132 commits**, mi repo más
activo del período. Un proyecto **Django + Angular + Oracle 18c**, con la
documentación montada en Jekyll y un equipo real detrás: Andres Baquero,
Cristian Yara y Bryan Muñoz. Detalle no menor: el título llevaba el emoji
fantasma 👻, que para entonces ya era mi firma.

Justo al lado nació [docker-apps](https://github.com/Juferoga/docker-apps), un
repo con un README minúsculo pero configuraciones muy reales de **clamav,
jenkins, portainer, sonarqube y traefik**. Visto en retrospectiva, esa carpeta
era la semilla temprana de todo el perfil DevOps/cloud que vendría después —y,
sospechosamente, un eco de lo que estaba montando en el catastro—. Uno no sabe
cuándo está sembrando.

Y no todo fue bases de datos: en [patrones](https://github.com/Juferoga/patrones)
armamos **CINE PACHO**, otro Django + Angular pero esta vez aplicando patrones
de diseño, con Brayan Stiven Yate, Jonathan Estiven Castellanos y Mateo
Bohorquez. Sesenta y ocho commits de discutir si esto era un Factory o un
Strategy.

## El shooter en Godot

Noviembre trajo el capricho más divertido del año.
[multimedia](https://github.com/Juferoga/multimedia) fueron **89 commits en
menos de un mes** para un **shooter 2D en Godot** (GDScript), jugable
directamente en el navegador vía GitHub Pages. Lo hicimos en pareja con Daniel
Eduardo Parra Gómez —de hecho es un fork del repo de mi compañero— y fue mi lado
gamer saliendo a flote entre tanto Django. Que un ramo se llamara "multimedia" y
me dejaran hacer un juego fue lo más cercano a ganarme la lotería académica.

## El momento clave: nace se-tesis

El 1 de septiembre de 2023 creé un repo que lo cambiaría todo:
[se-tesis](https://github.com/Juferoga/se-tesis). Ahí arranca mi tesis de
Ingeniería de Sistemas, cuyo título completo es un trabalenguas hermoso:

> *"Criptosistema esteganográfico de audio, basado en atractores caóticos y
> compresión de textos por medio de redes neuronales"*

No la hice solo: fue en dupla con **Mateo Bohórquez Rodríguez** —el mismo de
CINE PACHO— y bajo la dirección de la **Dra. Deicy Alvarado** y la
**Mg. Isabel Amaya Barrera**. En cristiano, la idea es una cadena de pasos:

1. **Comprimir** el texto del mensaje con **LLMLingua**, la herramienta de
   Microsoft basada en redes neuronales, para que ocupe lo mínimo posible.
2. **Cifrarlo** apoyándome en **modelos caóticos**: en vez de una llave
   "normal", la impredecibilidad del caos matemático es la que manda.
3. **Esconderlo dentro de un archivo de audio** —esa es la parte de
   esteganografía: que el mensaje viaje camuflado donde nadie sospecha.

Y no lo dejamos en "funciona en mi máquina": lo evaluamos con métricas de
verdad —**PSNR, MSE, entropía y SSIM**— para medir qué tan bien resistía el
audio la carga oculta. Todo con el respaldo del grupo de complejidad
**complexUd** y del **GLUD**, mi casa de software libre.

Lo curioso, mirando el historial hoy, es que se-tesis **nació con apenas 6
commits en 2023**. El **93% del trabajo (86 de 92 commits)** llegó después: la
actividad real se extendió durante años, con movimiento hasta julio de 2026.
Spoiler: esta tesis me perseguiría, con cariño y con terror a partes iguales,
hasta el día que me gradué como **Ingeniero de Sistemas**.

No fue el único coqueteo con el audio ese año. En octubre subí
[Voice-based-gender-recognition](https://github.com/Juferoga/Voice-based-gender-recognition),
un fork de SuperKogito para reconocer género por voz usando **MFCC + Gaussian
Mixture Models** sobre el corpus SLR45, con **~95% de precisión**. Tema hermano
del procesamiento de audio de la tesis: cuando algo te obsesiona, empieza a
aparecer por todos lados.

## La plantilla fantasma 👻

Hay un patrón silencioso detrás de todo 2023, y es que casi todos mis repos de
materia —bd-2, patrones, seminario, IA-II, GNS3— llevan el emoji fantasma 👻 y
**exactamente la misma estructura**: `Backend/`, `Docs/`, `Frontend/`, `ETC/`.
No fue casualidad. Fue una plantilla personal que fui perfeccionando repo tras
repo, semestre a semestre. Cada nuevo proyecto heredaba y refinaba el molde del
anterior. Mi manera de no empezar nunca desde cero —lujo necesario cuando el
tiempo libre lo repartías entre el catastro, la monitoría y la tesis—.

## En resumen

2023 fue energía pura: full-time en el catastro, monitor en GICOGE, full stack
en equipo en la U, un juego jugable en el navegador y la semilla de una tesis
que mezcla caos, redes neuronales y esteganografía. Todo con la misma estructura
fantasma y el mismo `:v xD` de fondo. Si me preguntan por el pico de mi carrera,
no tengo que pensarlo.

```bash
juferoga@portfolio:~/blog$ echo "380 commits públicos... y un año entero de código privado detrás 👻"
```
