---
title: "2024: el salto no fue de estudiante a la nube, fue del catastro a la banca"
description: "Para 2024 ya llevaba dos años de desarrollador profesional; el verdadero salto fue cambiar el mundo catastral del IGAC por el cloud financiero del Banco de Bogotá."
date: 2026-07-19
tags: ["banco-de-bogota", "igac", "catastro", "cloud", "carrera"]
lang: es
---

```bash
juferoga@portfolio:~/blog$ git log --oneline ptbdb | wc -l
39
```

Treinta y nueve commits en tres días. Para una prueba técnica. Cuando lo cuento
en voz alta suena a exageración, pero ahí está el historial: [ptbdb](https://github.com/Juferoga/ptbdb),
agosto de 2024, la prueba que precedió mi contratación en el Banco de Bogotá.
Este post va de ese salto — pero conviene aclarar cuál salto fue, porque durante
un tiempo lo conté mal.

## el salto que no fue

La versión romántica dice que en 2024 pasé "de estudiante que sube tareas a
tener un trabajo con la palabra *cloud* en el cargo". Suena bonito. Es falso.

Para 2024 yo ya llevaba un buen rato de desarrollador **profesional**. Arranqué
en la [Agencia Catastral de Cundinamarca](/timeline) a mediados de 2022 y me
quedé hasta finales de 2023: portales de trámites catastrales, internos y
externos, Angular y Django dockerizados, CI/CD en GitLab. Todo ese trabajo vivió
en repositorios privados institucionales — de ahí el famoso "hueco" en mi GitHub
público de esos años. No estaba desaparecido: estaba trabajando.

Así que el salto de 2024 no fue de estudiante a la nube. Fue de **catastro a
banca**. De un mundo de coordenadas, modelos de datos territoriales y portales
gubernamentales, a uno de infraestructura en AWS y microservicios financieros.
Ese es el cambio de verdad, y merece que lo cuente bien.

## el año del IGAC: full stack en el catastro

Antes del banco, entre marzo y diciembre de 2024, fui **desarrollador full
stack en el IGAC** (el Instituto Geográfico Agustín Codazzi). Presencial, con
horario, café de máquina y todo. No era un proyecto suelto de fin de semana: era
mi empleo formal.

Ahí sostuve y desarrollé aplicaciones de recolección de datos catastrales —
**CICA** y **Consultores Catastrales** — con **Angular 16 a 18** en el front,
**Java con Spring Boot** en el back, **Oracle** en la base de datos, y todo el
pipeline con **GitLab CI/CD** y **Docker**. Mi logro del que más me acuerdo:
haberle mejorado la interfaz a CICA, que buena falta le hacía.

En paralelo aprendí el idioma raro del catastro. [ric_xtf](https://github.com/Juferoga/ric_xtf)
y [auto_ric_xtf_docker](https://github.com/Juferoga/auto_ric_xtf_docker)
automatizan con **Docker** la generación y validación de modelos **XTF** con
interlis: un contenedor Postgres+PostGIS y otro con Java trabajando en conjunto.
Archivos con extensión `.xtf`, sistemas de referencia catastral, un vocabulario
completamente nuevo que aprendí sobre la marcha.

## una prueba que traté como si fuera producción

Y en medio de ese año catastral, en agosto, apareció la puerta al otro mundo.

La prueba del Banco de Bogotá eran tres retos de código. Nada del otro mundo,
sinceramente. Pero algo se me activó en la cabeza y decidí tratarla como si fuera
un proyecto real de años, no un ejercicio de entrevista.

Organicé todo con metodología **GITFLOW** — ramas, merges, la ceremonia
completa. Le puse badges al README. Le puse un **gif de giphy** decorativo,
porque claro, ¿qué prueba técnica no necesita un gif? Documenté cada reto,
armé una presentación. Mirándolo en frío fue un cuidado casi excesivo para lo
que pedían.

Pero funcionó. No sé si fue el código o si fue la señal de que a este man le
importa cómo se ven las cosas, no solo que compilen. En cualquier caso, esos 39
commits me abrieron la puerta que terminaría cambiándome de sector.

## el mundo nuevo: cloud financiero

En octubre de 2024 entré al **Banco de Bogotá como Analista de sistemas III**,
esta vez **remoto**. Y aquí no hubo corte seco: durante octubre, noviembre y
diciembre estuve cerrando lo del IGAC mientras arrancaba en el banco. Un solape
de transición, no un portazo. Salir del catastro tomó su tiempo.

Del otro lado de la puerta había un vocabulario distinto. **Infraestructura como
código en AWS**, arquitectura de **microservicios**, frontend moderno para el
sector financiero, todo en un entorno ágil y con foco en soluciones resilientes
y escalables. Donde antes pensaba en predios y coordenadas, ahora pensaba en
pipelines de despliegue y servicios que no se pueden caer.

Para calentar motores armé un par de plantillas propias:
[cleanArchitectureAngular17](https://github.com/Juferoga/cleanArchitectureAngular17),
Clean Architecture en Angular 17 con infraestructura declarada en **Terraform**,
cuyo README arranca con la frase más honesta que le he puesto a un repo:

> Como funciona? buena pregunta...

Ese "buena pregunta..." resume bien cómo se siente cambiar de sector: sabes lo
suficiente para arrancar y vas armando el mapa mientras caminas. Después vino
[angular-clean-arch](https://github.com/Juferoga/angular-clean-arch), con
arquitectura Clean/Onion y Angular CLI 18 — porque una plantilla nunca queda del
todo terminada. Y para no perder el hilo del backend,
[spring-basic-app](https://github.com/Juferoga/spring-basic-app) fue mi práctica
de **Spring Boot** con `docker-compose` y MySQL. Nada heroico, pero suficiente
para tener el músculo en forma.

## documentar el onboarding en público

Aquí viene un detalle que a la gente le sorprende. Cuando entré, subí en
**público** las sesiones de mi onboarding: [bdb-onboarding-sessions](https://github.com/Juferoga/bdb-onboarding-sessions),
con la descripción `On boarding sessions to cloud developer @bancodebogota`.

Es inusual. El onboarding suele quedarse en un Confluence interno, en notas
privadas que nadie vuelve a ver. Yo lo dejé abierto. No por exhibicionismo, sino
porque siempre he creído que documentar en abierto obliga a entender de verdad —
y porque a alguien más, en algún lado, le puede servir ver cómo se ve por dentro
un cambio de sector así.

## y la IA que sí importa

2024 tampoco fue solo trabajo remunerado. En febrero salió
[ia-audition-article](https://github.com/Juferoga/ia-audition-article): detección
automática de **gritos de personas atrapadas en terremotos**, con SVM, regresión
logística y árboles de decisión sobre audio procesado con librosa, scikit-learn y
TensorFlow/Keras, para apoyar labores de rescate. Que el procesamiento de audio
pueda ayudar a encontrar a alguien bajo los escombros es de esas cosas que le dan
sentido a todo el estudio.

Y en octubre, [accseibility](https://github.com/Juferoga/accseibility): un
componente de **accesibilidad** en Angular 18 encargado por el MinTIC. Porque
hacer que el software sirva para todos también es parte del oficio.

## lo que me llevo del salto

El salto no fue de la nada a la nube. Fue de un sector a otro, con dos años de
oficio a la espalda: tratar una prueba de tres días con un cuidado absurdo,
cambiar el catastro por la banca sin soltar uno hasta amarrar el otro, y aceptar
que la respuesta honesta a "¿cómo funciona?" muchas veces es *buena pregunta,
vamos a averiguarlo*. No hubo teletransporte: hubo 39 commits, un gif innecesario
y muchas ganas de que las cosas queden bien hechas.

```bash
juferoga@portfolio:~/blog$ echo "Como funciona? buena pregunta... 🏦"
```
