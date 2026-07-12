

// -----------------------------------------------------------------------------
// timeline.ts — Línea de tiempo canónica de la vida en GitHub/GitLab de Juferoga
//
// Fuente: datos capturados vía `gh api` (GitHub, autenticado) y la API pública
// v4 de GitLab (user id 2806791). Solo hechos verificados en esas capturas.
// Alimenta la línea de tiempo interactiva de /timeline.
// -----------------------------------------------------------------------------

export type Platform = "github" | "gitlab";
export type MilestoneKind = "repo" | "milestone" | "stat";

/** Una era narrativa del recorrido (bloque de años con identidad propia). */
export interface Era {
  id: string;
  /** Año inicial (inclusive). */
  from: number;
  /** Año final (inclusive). */
  to: number;
  title: string;
  /** Resumen corto, 1-2 frases. */
  summary: string;
  emoji: string;
  /** Color de acento (hex) para la UI de la línea de tiempo. */
  color: string;
}

/** Un hito puntual: creación de repo, evento clave o dato estadístico. */
export interface Milestone {
  /** Fecha ISO (YYYY-MM-DD). */
  date: string;
  /** Id de la era a la que pertenece. */
  era: string;
  title: string;
  /** Descripción de 1-2 frases. */
  desc: string;
  /** Nombres de repos relacionados. */
  repos: string[];
  source: Platform;
  kind: MilestoneKind;
  /** URL del repo o recurso (opcional para hitos/stats sin repo). */
  url?: string;
}

/**
 * Plataforma donde vivió el código de un empleo. Extiende `Platform` con
 * `gitlab-private` para el trabajo institucional que nunca fue al GitHub
 * público (la parte invisible del relato: ACC, IGAC, etc.).
 */
export type WorkPlatform = Platform | "gitlab-private";

/**
 * Un empleo o rol profesional. Vive aparte de `Milestone` porque su eje no es
 * un repo sino un cargo en una organización, con rango de fechas y stack. El
 * discriminante `kind: "job"` permite fusionarlo con los hitos en /timeline y
 * distinguirlo visualmente (distintivo de "trabajo").
 */
export interface Job {
  /** Fecha ISO de inicio (YYYY-MM-DD). Ordena el empleo en la línea de tiempo. */
  date: string;
  /** Fecha ISO de fin (YYYY-MM-DD). Ausente si es el rol actual. */
  end?: string;
  /** Id de la era a la que pertenece (por su fecha de inicio). */
  era: string;
  /** Título del cargo. */
  role: string;
  /** Organización / empleador. */
  org: string;
  /** Descripción de 1 frase con las tecnologías clave. */
  desc: string;
  /** Tecnologías clave, para mostrar como chips. */
  tech: string[];
  /** Plataforma donde vivió el código, cuando aplica. */
  source?: WorkPlatform;
  /** true si el código vivió en repos privados/institucionales (fuera del GitHub público). */
  private?: boolean;
  /** true si es el rol vigente. */
  current?: boolean;
  /** Discriminante: siempre "job". Distingue el trabajo de los hitos de repos. */
  kind: "job";
  /** Nota adicional opcional (contexto que no cabe en la descripción). */
  note?: string;
  /** URL de un repo o recurso público relacionado (opcional). */
  url?: string;
}

/** Contribuciones anuales reportadas por GitHub. */
export interface GithubYearStat {
  year: number;
  /** Commits/contribuciones del año (2026 hasta julio). */
  commits: number;
  prs?: number;
  issues?: number;
  /** Nota si el año es parcial u otra aclaración. */
  note?: string;
}

/** Actividad anual observada en GitLab. */
export interface GitlabYearStat {
  year: number;
  /** Proyectos creados o con actividad real ese año. */
  projects: number;
  /** Resumen de qué pasó ese año en GitLab. */
  note: string;
}

// -----------------------------------------------------------------------------
// ERAS
// -----------------------------------------------------------------------------

export const ERAS: Era[] = [
  {
    id: "origenes",
    from: 2018,
    to: 2019,
    title: "los orígenes",
    summary:
      "Del SENA a la Universidad Distrital. Primer repo el mismo día que la cuenta; ejercicios de C/C++, entrada al GLUD y a la realidad virtual con software libre.",
    emoji: "🌱",
    color: "#5bd75b",
  },
  {
    id: "pandemia",
    from: 2020,
    to: 2020,
    title: "pandemia y GLUD dorado",
    summary:
      "Cuarentena, ciencia de datos aplicada al COVID-19 y la época dorada del GLUD/gnubies: ricing, temas de GRUB y arte libre en Krita.",
    emoji: "🦠",
    color: "#f0a500",
  },
  {
    id: "universidad",
    from: 2021,
    to: 2021,
    title: "universidad plena",
    summary:
      "Dirección del GLUD: clases de Angular y Docker dictadas por él mismo, el Monopoly en Java y el arranque del perfil DevOps con Traefik.",
    emoji: "🎓",
    color: "#4f9cf0",
  },
  {
    id: "sabatico",
    from: 2022,
    to: 2022,
    title: "el año callado (solo en apariencia)",
    summary:
      "El año más silencioso en GitHub (41 commits)… pero uno de los más ocupados de su vida: dirección del GLUD, docencia en Dominio y su primer empleo serio en la Agencia Catastral de Cundinamarca — todo invisible en el GitHub público, en GitLab privado e institucional.",
    emoji: "🌵",
    color: "#8a8a8a",
  },
  {
    id: "gran-anio",
    from: 2023,
    to: 2023,
    title: "el gran año",
    summary:
      "380 commits, 29 repos: el pico de la carrera y la siembra de la tesis — criptografía caótica + esteganografía de audio con redes neuronales.",
    emoji: "🚀",
    color: "#e0457b",
  },
  {
    id: "banco",
    from: 2024,
    to: 2024,
    title: "el salto profesional",
    summary:
      "La prueba técnica que abrió la puerta al Banco de Bogotá y el paso a cloud developer: Clean Architecture en Angular, Terraform y onboarding en público.",
    emoji: "🏦",
    color: "#3fb0ac",
  },
  {
    id: "maestria",
    from: 2025,
    to: 2026,
    title: "maestría y presente",
    summary:
      "Un 2025 callado seguido del regreso en 2026 con la maestría en IA: tesis de esteganografía coverless sobre modelos de difusión, second brain y este portafolio.",
    emoji: "🧠",
    color: "#a06bff",
  },
];

// -----------------------------------------------------------------------------
// HITOS (milestones) — orden cronológico
// -----------------------------------------------------------------------------

export const MILESTONES: Milestone[] = [
  // --- 2018-2019 · orígenes -------------------------------------------------
  {
    date: "2018-08-30",
    era: "origenes",
    title: "punto cero: la cuenta y el primer repo, el mismo día",
    desc: "Registra su cuenta de GitHub y en horas crea C-BasicProyects (ejercicios de C/C++ en Dev C++ de su primer semestre). Es literalmente su repo número uno.",
    repos: ["C-BasicProyects"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/C-BasicProyects",
  },
  {
    date: "2019-05-19",
    era: "origenes",
    title: "las notas del SENA",
    desc: "Sube POO_SENA: notas y ejercicios de POO y SQL en C# hechos para el título de Técnico en Desarrollo de Software del SENA. Sería retomado hasta 2023.",
    repos: ["POO_SENA", "Adobe-XD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/POO_SENA",
  },
  {
    date: "2019-05-30",
    era: "origenes",
    title: "Fundamentos: 82 commits en equipo",
    desc: "El repo más activo de la etapa: sistema de monitorías de la Universidad Distrital como proyecto final de Bases de Datos, con un equipo de 4 estudiantes listados (código '20181020158' incluido).",
    repos: ["Fundamentos", "proyecto-final-avanzada", "BD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Fundamentos",
  },
  {
    date: "2019-06-01",
    era: "origenes",
    title: "A-Frame y la entrada al GLUD",
    desc: "42 commits de realidad virtual con el framework A-Frame de Mozilla; el README enlaza a GLUDZILLA-VR, el proyecto de RV del Grupo GNU/Linux 'para preservar la salud del internet'.",
    repos: ["A-frame---Course"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/A-frame---Course",
  },
  {
    date: "2019-06-03",
    era: "origenes",
    title: "arte libre: proyectos 'para art-glud'",
    desc: "INKSKAPE recopila proyectos hechos con Inkscape 'para art-glud', el subgrupo de arte digital del colectivo GLUD.",
    repos: ["INKSKAPE"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/INKSKAPE",
  },
  {
    date: "2019-06-17",
    era: "origenes",
    title: "GitLab: GLUDZILLA-VR, el repo más ideológico",
    desc: "En GitLab arranca GLUDZILLA-VR: RV/IoT con A-Frame de Mozilla y una declaración de principios explícita sobre software libre y la 'salud del internet'.",
    repos: ["GLUDZILLA-VR"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/GLUDZILLA-VR",
  },
  {
    date: "2019-06-30",
    era: "origenes",
    title: "hilos en Java: '¿Quién ganará la carrera?'",
    desc: "JuegoHilosCarreraDeCaballos, una carrera de caballos con threads, presentada con esa pregunta lúdica como descripción.",
    repos: ["JuegoHilosCarreraDeCaballos"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/JuegoHilosCarreraDeCaballos",
  },
  {
    date: "2019-07-28",
    era: "origenes",
    title: "linuxero de corazón",
    desc: "El repo Linux abre con una carita ASCII '(^_^) [o_o] (^.^)' y enlaza material de certificación LPI Linux Essentials y recursos de Manjaro.",
    repos: ["Linux"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Linux",
  },
  {
    date: "2019-08-14",
    era: "origenes",
    title: "JuanFelipeCV: primer CV con licencia GPL v3",
    desc: "Su primera página personal en HTML/CSS puro, con el emoji fantasma 👻, licencia GPL v3 desde el día uno y enlace cruzado a GitLab. El repo sigue vivo hasta 2026.",
    repos: ["JuanFelipeCV"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/JuanFelipeCV",
  },
  {
    date: "2019-10-11",
    era: "origenes",
    title: "gnubies 2019: manuales y documentación",
    desc: "En GitLab nacen dos proyectos Gnubies: un manual de usuario de Openshot (autor principal Kevin Holguin) y precipitacion-project, con un README que aún dice '...Poner nombres...'.",
    repos: ["ManualUsuarioOpenshot", "precipitacion-project", "ArtGlud"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/ManualUsuarioOpenshot",
  },
  {
    date: "2019-11-18",
    era: "origenes",
    title: "optimización en AMPL",
    desc: "io-ii: proyecto final de Investigación de Operaciones 2 escrito en AMPL para modelos de optimización.",
    repos: ["io-ii"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/io-ii",
  },
  {
    date: "2019-11-20",
    era: "origenes",
    title: "GitLab: web y sistemas operativos",
    desc: "desarrollo-Web (curso de HTML/CSS de Udemy, 43 commits) y luego sistemas-operativos (38 commits) marcan la producción sostenida en GitLab de la era GLUD.",
    repos: ["desarrollo-Web", "sistemas-operativos"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/desarrollo-Web",
  },
  {
    date: "2019-12-31",
    era: "origenes",
    title: "Arch-Matic: 'NO EJECUTAR DIRECTAMENTE'",
    desc: "Scripts de post-instalación de Arch en GitLab con la advertencia jocosa y muy linuxera: 'MÍRALO, CAMBIALO Y HAZLO TUYO. :D'.",
    repos: ["Arch-Matic"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/Arch-Matic",
  },

  // --- 2020 · pandemia y GLUD dorado ----------------------------------------
  {
    date: "2020-02-29",
    era: "pandemia",
    title: "la serpiente antes de la cuarentena",
    desc: "Snake, un juego clásico en Java, justo antes de que la cuarentena estricta lo cambiara todo.",
    repos: ["Snake"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Snake",
  },
  {
    date: "2020-05-10",
    era: "pandemia",
    title: "IO1 en equipo y el '\"Profesor\" Alberto Acosta'",
    desc: "io-i, 28 commits en colaboración con Mateo Nariño y Jose David Sanabria; el README cita entre comillas irónicas al profesor.",
    repos: ["io-i", "IntroductionDataScience"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/io-i",
  },
  {
    date: "2020-05-29",
    era: "pandemia",
    title: "custom-linux: el equipo gnubies completo",
    desc: "Proyecto Gnubies 2020 de ricing de AwesomeWM en GitLab (59 commits); el README lista a los 5 coautores con nombre completo y el logo de la U. Distrital.",
    repos: ["custom-linux", "Material-Awesome"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/custom-linux",
  },
  {
    date: "2020-07-15",
    era: "pandemia",
    title: "admin de servidores Linux (Coursera)",
    desc: "LinuxSysAdmin: ejercicios en Shell de un curso de la Universidad de Colorado sobre administración y seguridad de servidores Linux.",
    repos: ["LinuxSysAdmin"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/LinuxSysAdmin",
  },
  {
    date: "2020-07-16",
    era: "pandemia",
    title: "modelar la pandemia con métodos numéricos",
    desc: "numeric-methods: el README dice textual que 'modelamos la pandemia del COVID-19 en colombia' e incluye un notebook que analiza la percepción de Twitter sobre el manejo de la pandemia.",
    repos: ["numeric-methods"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/numeric-methods",
  },
  {
    date: "2020-08-09",
    era: "pandemia",
    title: "⭐ grub2-theme-glud: su repo más estrellado",
    desc: "Tema visual para GRUB2 hecho para el GLUD, con banner ASCII propio y estilos instalables (Vimix, Stylish, Tela) hasta para ultrawide 2560x1080. 7 estrellas, su máximo en GitHub.",
    repos: ["grub2-theme-glud"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/grub2-theme-glud",
  },
  {
    date: "2020-08-12",
    era: "pandemia",
    title: "reconocer emociones con deep learning",
    desc: "emotion-recognition-ICD: reconocimiento de emociones con deep learning para la electiva de Introducción a Ciencia de Datos.",
    repos: ["emotion-recognition-ICD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/emotion-recognition-ICD",
  },
  {
    date: "2020-08-23",
    era: "pandemia",
    title: "'The Secret Github Repository 👻'",
    desc: "Crea el repo de perfil Juferoga con esa descripción; el emoji fantasma se vuelve su firma personal en casi todos los README universitarios. El repo sigue actualizándose hasta 2026.",
    repos: ["Juferoga"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/Juferoga",
  },
  {
    date: "2020-10-04",
    era: "pandemia",
    title: "Krita: software libre también para el arte",
    desc: "Sube dibujos hechos con Krita, herramienta libre de arte digital — coherente con su identidad de linuxero de corazón.",
    repos: ["Krita"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Krita",
  },
  {
    date: "2020-12-21",
    era: "pandemia",
    title: "redes neuronales recurrentes con demo web",
    desc: "playground-rnr incluye un prototipo de servicio web desplegado en GitHub Pages — no solo notebooks, también demos desplegadas.",
    repos: ["playground-rnr"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/playground-rnr",
  },

  // --- 2021 · universidad plena ---------------------------------------------
  {
    date: "2021-02-13",
    era: "universidad",
    title: "radio del GLUD",
    desc: "obs-radioglud, vinculado a producción de radio/streaming con OBS para el Grupo GNU/Linux.",
    repos: ["obs-radioglud"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/obs-radioglud",
  },
  {
    date: "2021-03-09",
    era: "universidad",
    title: "docencia comunitaria: dicta Angular y Docker",
    desc: "El mismo día publica el material de las clases que él dictó al GLUD: 'ng new la_mejor_app_del_mundo' en angularClass y una imagen de prueba 'perrito:1.0' con cowsay/fortune/figlet en dockerClass.",
    repos: ["angularClass", "dockerClass"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/dockerClass",
  },
  {
    date: "2021-05-24",
    era: "universidad",
    title: "Angular con la API de Rick & Morty XD",
    desc: "angular-practice: práctica de Angular consumiendo la API pública de Rick & Morty, con el 'XD' incluido en la propia descripción del repo.",
    repos: ["angular-practice", "Modelos-I"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/angular-practice",
  },
  {
    date: "2021-06-17",
    era: "universidad",
    title: "Traefik como proxy reverso: semilla DevOps",
    desc: "traefik-as-a-reverse-proxy documenta paso a paso Traefik sobre Docker, con detalles de seguridad como permisos 600 para acme.json — despunta el perfil cloud/devops.",
    repos: ["traefik-as-a-reverse-proxy"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/traefik-as-a-reverse-proxy",
  },
  {
    date: "2021-08-20",
    era: "universidad",
    title: "Física 1 en MATLAB (y en YouTube)",
    desc: "Fisica-i: trabajo grupal con un video de YouTube sobre movimiento parabólico.",
    repos: ["Fisica-i"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Fisica-i",
  },
  {
    date: "2021-09-13",
    era: "universidad",
    title: "modelos-i-final: un Monopoly en Java",
    desc: "79 commits, el repo más trabajado del período: un Monopoly funcional en pareja con Brayan Stiven Yate Prada, con su propio sitio en GitHub Pages.",
    repos: ["modelos-i-final"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/modelos-i-final",
  },
  {
    date: "2021-11-04",
    era: "universidad",
    title: "el lenguaje Oz (Modelos 2)",
    desc: "modelos-2: curso con el lenguaje multiparadigma Oz, poco común, otra vez junto a Brayan Stiven Yate Prada.",
    repos: ["modelos-2", "ciencias-1"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/modelos-2",
  },
  {
    date: "2021-11-17",
    era: "universidad",
    title: "arquitectura de computadores en TeX",
    desc: "arquitectura: 40 commits documentados en TeX, trabajo en equipo con Laura Montenegro y Nicolas Baena.",
    repos: ["arquitectura"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/arquitectura",
  },
  {
    date: "2021-12-15",
    era: "universidad",
    title: "BOOLR-Adapted: 343 commits… heredados",
    desc: "Adaptación del simulador de lógica digital BOOLR (autor original GGBRW). De sus 343 commits, la mayoría es historia importada desde 2016; apropiar y remezclar software libre, no partir de cero.",
    repos: ["BOOLR-Adapted"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/BOOLR-Adapted",
  },

  // --- 2022 · el año callado ------------------------------------------------
  {
    date: "2022-03-01",
    era: "sabatico",
    title: "un commit solitario en GitLab",
    desc: "'Static html page' tiene un pequeño resurgir en solitario ('Update clases.js') — la única señal de que no estuvo 100% inactivo antes del silencio del resto del año.",
    repos: ["mod2-final", "Static html page"],
    source: "gitlab",
    kind: "milestone",
    url: "https://gitlab.com/Juferoga/Static-html-page",
  },
  {
    date: "2022-03-24",
    era: "sabatico",
    title: "'recap of the investigation xD'",
    desc: "investigacion-mis se describe literalmente así: tono desenfadado incluso en repos académicos, en el año más callado de GitHub (solo 41 commits).",
    repos: ["investigacion-mis", "redes-ii"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/investigacion-mis",
  },
  {
    date: "2022-09-02",
    era: "sabatico",
    title: "plot twist: la prueba que abrió la puerta a la ACC",
    desc: "prueba-tecnica-acc: un Angular CLI 14.2.1 hecho en apenas 2 días (2-3 sept). 'acc' = Agencia Catastral de Cundinamarca: no fue un callejón sin salida, sino la puerta de entrada a su primer empleo serio, que arrancó semanas después — y siguió en GitLab privado, fuera del radar del GitHub público.",
    repos: ["prueba-tecnica-acc"],
    source: "gitlab",
    kind: "milestone",
    url: "https://gitlab.com/Juferoga/prueba-tecnica-acc",
  },
  {
    date: "2022-11-16",
    era: "sabatico",
    title: "'pro tip :: instalar en arch, mucho más fácil'",
    desc: "El README completo de ciber-i: 'Cosas de matlab GNU OCTAVE :v / pro tip :: instalar en arch, mucho más fácil.' — puro sabor GLUD/Arch user.",
    repos: ["ciber-i", "ciencias-2"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ciber-i",
  },

  // --- 2023 · el gran año ---------------------------------------------------
  {
    date: "2023-02-04",
    era: "gran-anio",
    title: "arranca el gran año: redes y automatización",
    desc: "redes-i abre 2023 con resúmenes CCNA/Cisco por capítulo y scripts de automatización. El año cerraría con 380 commits, 29 PRs y 110 issues.",
    repos: ["redes-i", "GNS3"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/redes-i",
  },
  {
    date: "2023-02-06",
    era: "gran-anio",
    title: "bd-2: 132 commits, su repo más activo",
    desc: "Proyecto Django + Angular + Oracle 18c con docs en Jekyll y equipo (Andres Baquero, Cristian Yara, Bryan Muñoz). Título con emoji fantasma 👻, evidencia del salto de calidad de 2023.",
    repos: ["bd-2"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/bd-2",
  },
  {
    date: "2023-02-24",
    era: "gran-anio",
    title: "docker-apps: la caja de herramientas DevOps",
    desc: "README mínimo pero configuraciones reales de clamav, jenkins, portainer, sonarqube y traefik — semilla temprana del perfil cloud/devops.",
    repos: ["docker-apps"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/docker-apps",
  },
  {
    date: "2023-06-14",
    era: "gran-anio",
    title: "patrones: 'CINE PACHO'",
    desc: "68 commits de un proyecto Django + Angular aplicando patrones de diseño, con Brayan Stiven Yate, Jonathan Castellanos y Mateo Bohorquez.",
    repos: ["patrones", "deploy-patrones", "fis"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/patrones",
  },
  {
    date: "2023-08-09",
    era: "gran-anio",
    title: "parking: ':v xD electron project'",
    desc: "Su primera app de escritorio completa con Electron + IndexedDB y licencia GPL-v3; la descripción oficial del repo es, literalmente, ':v xD electron project'.",
    repos: ["parking", "seminario"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/parking",
  },
  {
    date: "2023-09-01",
    era: "gran-anio",
    title: "se-tesis: nace la tesis",
    desc: "Criptosistema esteganográfico de audio con atractores caóticos y compresión de texto por redes neuronales. Nace con solo 6 commits en 2023: el 93% del trabajo (86 de 92) llegaría después, hasta 2026.",
    repos: ["se-tesis"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/se-tesis",
  },
  {
    date: "2023-10-02",
    era: "gran-anio",
    title: "voz y género: preludio de la tesis",
    desc: "Voice-based-gender-recognition (fork de SuperKogito): reconocimiento de género por voz con MFCC + GMM y ~95% de precisión. Procesamiento de audio, tema hermano de su tesis.",
    repos: ["Voice-based-gender-recognition", "gicoge"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Voice-based-gender-recognition",
  },
  {
    date: "2023-11-22",
    era: "gran-anio",
    title: "multimedia: un shooter 2D en Godot",
    desc: "89 commits en menos de un mes para un shooter 2D en Godot (GDScript), jugable en web, en pareja con Daniel Eduardo Parra Gómez. Su lado gamer saliendo a flote.",
    repos: ["multimedia", "intro-angular"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/multimedia",
  },

  // --- 2024 · el salto profesional ------------------------------------------
  {
    date: "2024-02-02",
    era: "banco",
    title: "detectar gritos en terremotos con IA",
    desc: "ia-audition-article: detección automática de gritos de personas atrapadas usando SVM, regresión logística y árboles de decisión sobre audio, para apoyar rescates.",
    repos: ["ia-audition-article", "refine-test"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ia-audition-article",
  },
  {
    date: "2024-03-17",
    era: "banco",
    title: "catastro: XTF y Docker en el IGAC",
    desc: "ric_xtf y auto_ric_xtf_docker automatizan con Docker (Postgres+PostGIS + Java) la creación/importación de modelos XTF con interlist.",
    repos: ["ric_xtf", "auto_ric_xtf_docker", "planeacion-historia-clinica"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/auto_ric_xtf_docker",
  },
  {
    date: "2024-08-17",
    era: "banco",
    title: "ptbdb: la prueba técnica que abrió la puerta",
    desc: "Tres retos de código con metodología GITFLOW, README con badges y hasta un gif — 39 commits en 3 días. La prueba que precedió su contratación como cloud developer en Banco de Bogotá.",
    repos: ["ptbdb"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/ptbdb",
  },
  {
    date: "2024-10-07",
    era: "banco",
    title: "accesibilidad para MinTIC",
    desc: "accseibility: componente de accesibilidad en Angular 18 encargado por MinTIC.",
    repos: ["accseibility"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/accseibility",
  },
  {
    date: "2024-10-23",
    era: "banco",
    title: "onboarding cloud developer, en público",
    desc: "bdb-onboarding-sessions documenta en abierto las sesiones de onboarding como cloud developer en Banco de Bogotá — inusual dejar ese proceso interno documentado.",
    repos: ["bdb-onboarding-sessions", "spring-basic-app"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/bdb-onboarding-sessions",
  },
  {
    date: "2024-10-24",
    era: "banco",
    title: "Clean Architecture: 'Como funciona? buena pregunta...'",
    desc: "cleanArchitectureAngular17 aplica Clean Architecture con infra en Terraform y ese arranque de README desenfadado. La segunda aproximación (onion) llegaría en diciembre.",
    repos: ["cleanArchitectureAngular17", "angular-clean-arch"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/cleanArchitectureAngular17",
  },

  // --- 2025-2026 · maestría y presente --------------------------------------
  {
    date: "2025-03-23",
    era: "maestria",
    title: "second-brain: 'your brain is for having ideas'",
    desc: "Sistema personal de gestión del conocimiento (estructura tipo PARA), abierto con la cita de David Allen. Uno de los pocos repos de un 2025 deliberadamente callado (19 commits).",
    repos: ["second-brain", "dotfiles", "angular-state-control"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/second-brain",
  },
  {
    date: "2025-06-07",
    era: "maestria",
    title: "geo-visor: catastro con Angular + Nx",
    desc: "Visor de datos catastrales con Leaflet y Angular Material, organizado en libs de dominio catastral, UI compartida y utilidades GIS.",
    repos: ["geo-visor"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/geo-visor",
  },
  {
    date: "2026-02-25",
    era: "maestria",
    title: "mcic-tesis: esteganografía pure coverless",
    desc: "La tesis de maestría: codifica mensajes en el espacio latente caótico de Stable Diffusion (atractor memristivo 5D) sin tocar la imagen, con recuperación exacta (IFE sobre DDIM), firma RSA-2048 y 100% de recuperación en benchmark.",
    repos: ["mcic-tesis"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/mcic-tesis",
  },
  {
    date: "2026-02-28",
    era: "maestria",
    title: "el regreso: 190 commits para la maestría",
    desc: "Tras el silencio de 2025, arranca la avalancha de repos de la Maestría en Ciencias de la Información: herramientas matemáticas (MATLAB), informática (Java), analítica de datos.",
    repos: ["mcic-math-tools-data", "mcic-computing", "mcic-data-analytics"],
    source: "github",
    kind: "stat",
    url: "https://github.com/Juferoga/mcic-computing",
  },
  {
    date: "2026-03-07",
    era: "maestria",
    title: "ai-context-extractor: IA y GLUD otra vez",
    desc: "CLI 'map-ia' que analiza (AST vía ts-morph) proyectos Angular y comprime su arquitectura en un grafo legible por IAs. Se declara construida 'en el marco del GLUD' — el vínculo más explícito con el grupo en toda la era.",
    repos: ["ai-context-extractor", "rental-management-system"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ai-context-extractor",
  },
  {
    date: "2026-03-27",
    era: "maestria",
    title: "mcic: la maestría como dashboard",
    desc: "Compendio público de la maestría (énfasis IA, modalidad investigación): plan de 44 créditos con barra de progreso ASCII (16/44, 36.4%) y semestre I cerrado con promedio 4.73.",
    repos: ["mcic", "pp-diabetic-retinopathy"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/mcic",
  },
  {
    date: "2026-04-07",
    era: "maestria",
    title: "meta-IA: agentes que revisan su propio paper",
    desc: "pp-rw-crypto-stego, una revisión sistemática sobre esteganografía en LaTeX, incluye una carpeta .agent/ con skills de IA propios (q1-pipeline, q1-enhancer, ieee-reviewer) para mejorar y revisar el manuscrito.",
    repos: ["pp-rw-crypto-stego"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/pp-rw-crypto-stego",
  },
  {
    date: "2026-04-25",
    era: "maestria",
    title: "ActivSpot: ricing que enamoró a Reddit",
    desc: "Su visión de una 'dynamic island' para Hyprland en QML/Quickshell. El README admite que 'nació para uso personal, se compartió tras interés genuino de la comunidad de Reddit'.",
    repos: ["ActivSpot"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ActivSpot",
  },
  {
    date: "2026-06-28",
    era: "maestria",
    title: "portfolio: 'About me, really me :v'",
    desc: "Este mismo portafolio en Astro, sin deps de runtime: estética hacker terminal, easter eggs (sudo, matrix, neofetch, Konami Code) y foco fuerte en accesibilidad (aria-live, prefers-reduced-motion, fallback sin JS).",
    repos: ["portfolio"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/portfolio",
  },
];

// -----------------------------------------------------------------------------
// EXPERIENCIA (jobs) — la historia PROFESIONAL, ordenada por fecha de inicio.
//
// Muchos de estos roles nunca dejaron rastro en el GitHub público: el trabajo
// de la ACC y del IGAC vivió en GitLab privado/institucional (source
// "gitlab-private", private: true). Esta es la capa que explica los "huecos"
// del gráfico de commits — sobre todo 2022-2023.
// -----------------------------------------------------------------------------

export const JOBS: Job[] = [
  // --- GLUD (comunidad de software libre) -----------------------------------
  {
    date: "2019-06-01",
    end: "2021-01-01",
    era: "origenes",
    role: "Profesor",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Enseñó fundamentos de GNU/Linux y software libre en los procesos GNUBIES-2019; coautor de la guía 'Instalando GNU/Linux'.",
    tech: ["GNU/Linux", "Software libre", "Documentación"],
    kind: "job",
  },
  {
    date: "2021-01-01",
    end: "2022-03-01",
    era: "universidad",
    role: "Director general",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Dirigió el colectivo de software libre y dio la charla #SLUDXVIII 'Fractales y software libre'.",
    tech: ["Liderazgo", "Software libre", "GNU/Linux"],
    kind: "job",
  },
  {
    date: "2022-05-01",
    end: "2022-08-01",
    era: "sabatico",
    role: "Director general (segunda etapa, autónomo)",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Segunda etapa autónoma de la dirección; dictó un curso de GNS3 para el GLUD.",
    tech: ["GNS3", "Redes", "Liderazgo"],
    kind: "job",
  },
  {
    date: "2025-09-15",
    end: "2025-09-19",
    era: "maestria",
    role: "Conferencista · SLUD XXII",
    org: "Semana Linux UD (GLUD)",
    desc: "Dio conferencias en la Semana Linux UD (SLUD XXII), del 15 al 19 de septiembre de 2025.",
    tech: ["Software libre", "GNU/Linux", "Divulgación"],
    kind: "job",
  },

  // --- Dominio Estudio de Diseño (docencia y front-end) ---------------------
  {
    date: "2021-11-01",
    end: "2022-07-01",
    era: "universidad",
    role: "Desarrollador Web Front-End e Instructor Especialista",
    org: "Dominio Estudio de Diseño",
    desc: "Lideró la 'Academia Héroes Tech' con cursos de Python y JavaScript para la Corporación Mariano Matamoros; captura de requerimientos, front-end web y mobile y diseño responsive.",
    tech: ["Python", "JavaScript", "Responsive", "Mobile"],
    kind: "job",
  },
  {
    date: "2022-12-01",
    end: "2023-01-01",
    era: "sabatico",
    role: "Profesor",
    org: "Dominio Estudio de Diseño",
    desc: "Segunda cohorte para la Corporación Matamoros: clases de Python, Vue JS y JavaScript, con apoyo en proyectos con Vue JS, Docker y PHP/Laravel.",
    tech: ["Python", "Vue JS", "JavaScript", "Docker", "PHP/Laravel"],
    kind: "job",
  },

  // --- assistance team SAS --------------------------------------------------
  {
    date: "2020-11-01",
    end: "2020-12-01",
    era: "pandemia",
    role: "Desarrollador web",
    org: "assistance team SAS",
    desc: "Desarrollo y personalización de aplicativos con WordPress (contrato de un mes).",
    tech: ["WordPress", "PHP"],
    kind: "job",
  },

  // --- Agencia Catastral de Cundinamarca (ACC) — primer trabajo serio -------
  // Todo en GitLab PRIVADO/institucional: el "hueco" del GitHub público 2022-2023.
  {
    date: "2022-09-01",
    end: "2022-12-01",
    era: "sabatico",
    role: "Desarrollador front-end (jornada parcial)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Actualización de la página web principal de la ACC (versión 2.0) con AngularJS integrado a Bootstrap y Angular Material, RxJS, Docker y Django.",
    tech: ["AngularJS", "Bootstrap", "Angular Material", "RxJS", "Docker", "Django"],
    source: "gitlab-private",
    private: true,
    kind: "job",
  },
  {
    date: "2023-01-01",
    end: "2023-06-01",
    era: "gran-anio",
    role: "Desarrollador front-end (jornada completa)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Portal EXTERNO de trámites catastrales para el público, con normativas MINTIC; dockerización de todos los proyectos (AngularJS y Django), Jenkins y Traefik.",
    tech: ["AngularJS", "Django", "Docker", "Jenkins", "Traefik", "MINTIC"],
    source: "gitlab-private",
    private: true,
    kind: "job",
  },
  {
    date: "2023-06-01",
    end: "2023-12-01",
    era: "gran-anio",
    role: "Desarrollador front-end (jornada completa)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Portal INTERNO de trámites catastrales con desarrollo integral front-end, back-end y CI/CD sobre Django, AngularJS y GitLab CI/CD.",
    tech: ["Django", "AngularJS", "GitLab CI/CD"],
    source: "gitlab-private",
    private: true,
    kind: "job",
  },

  // --- GICOGE (grupo de investigación, Universidad Distrital) — monitor -----
  {
    date: "2023-09-01",
    end: "2023-12-01",
    era: "gran-anio",
    role: "Monitor",
    org: "GICOGE · Universidad Distrital",
    desc: "Desarrollo de la web del grupo (Angular) y actualización en MINCIENCIAS, con Traefik como reverse proxy.",
    tech: ["Angular", "Traefik", "Docker"],
    source: "github",
    kind: "job",
    url: "https://github.com/GICOGE/gicoge-webpage",
  },
  {
    date: "2024-03-01",
    end: "2024-07-01",
    era: "banco",
    role: "Monitor",
    org: "GICOGE · Universidad Distrital",
    desc: "Instalación de la infraestructura del grupo con Docker y un CMS WordPress para la web.",
    tech: ["Docker", "WordPress"],
    source: "github",
    kind: "job",
  },

  // --- IGAC (Instituto Geográfico Agustín Codazzi) — full stack, catastro ---
  {
    date: "2024-03-01",
    end: "2024-12-01",
    era: "banco",
    role: "Desarrollador full stack",
    org: "Instituto Geográfico Agustín Codazzi (IGAC)",
    desc: "Soporte, mantenimiento y desarrollo de apps de recolección de datos (CICA y Consultores Catastrales) con Angular 16-18, Java/Spring Boot y Oracle DB; CI/CD con GitLab y Docker.",
    tech: ["Angular (16-18)", "Java / Spring Boot", "Oracle DB", "GitLab CI/CD", "Docker"],
    source: "gitlab-private",
    private: true,
    kind: "job",
    note: "Logro: mejora de la interfaz de CICA. Tuvo un segundo contrato con el IGAC en 2025 que le tocó ceder, tras trabajar apenas ~2 meses ese año.",
  },

  // --- Banco de Bogotá (BdB) — remoto, cloud/financiero ---------------------
  {
    date: "2024-10-01",
    end: "2026-03-01",
    era: "banco",
    role: "Analista de sistemas III",
    org: "Banco de Bogotá",
    desc: "Infraestructura como código en AWS, arquitectura de microservicios y frontend moderno; soluciones resilientes y escalables para el sector financiero en un entorno ágil.",
    tech: ["AWS", "IaC", "Terraform", "Microservicios", "Angular"],
    kind: "job",
    note: "Reconocimiento de equipo. Solape oct-dic 2024 con el IGAC: fue una transición del catastro a la banca, no un corte seco.",
  },
  {
    date: "2026-02-01",
    era: "maestria",
    role: "Analista de sistemas II",
    org: "Banco de Bogotá",
    desc: "Lidera el desarrollo de soluciones Cloud de alto impacto y la automatización de procesos financieros.",
    tech: ["AWS", "Cloud", "Automatización"],
    current: true,
    kind: "job",
    note: "Reconocimiento de la 'tribu ecosistemas de pago'.",
  },
];

// -----------------------------------------------------------------------------
// STATS ANUALES
// -----------------------------------------------------------------------------

/** Contribuciones GitHub por año (verificadas vía GraphQL contributionsCollection). */
export const GITHUB_YEAR_STATS: GithubYearStat[] = [
  { year: 2018, commits: 2, note: "Cuenta creada el 2018-08-30." },
  { year: 2019, commits: 186 },
  { year: 2020, commits: 126 },
  { year: 2021, commits: 173 },
  { year: 2022, commits: 41, note: "El año más callado." },
  { year: 2023, commits: 380, prs: 29, issues: 110, note: "El gran año: 29 repos nuevos." },
  { year: 2024, commits: 103 },
  { year: 2025, commits: 19, note: "Año deliberadamente callado." },
  { year: 2026, commits: 190, note: "Hasta julio; año de la maestría." },
];

/**
 * Actividad GitLab por año (API pública v4, user id 2806791).
 * Nota clave: 2021 está completamente vacío en GitLab, igual que el bajón de
 * GitHub en 2022. GitLab NO esconde un 'año sabático productivo'.
 */
export const GITLAB_YEAR_STATS: GitlabYearStat[] = [
  {
    year: 2019,
    projects: 6,
    note: "Era GLUD/gnubies: GLUDZILLA-VR, ArtGlud, desarrollo-Web, manuales y Arch-Matic.",
  },
  {
    year: 2020,
    projects: 8,
    note: "Pico de ricing y comunidad: custom-linux (59 commits), Material-Awesome (fork), sistemas-operativos, H-CC ('Yo no se hahaha').",
  },
  {
    year: 2021,
    projects: 0,
    note: "Vacío total: ningún proyecto ni commit en GitLab (ni en GitHub la narrativa lo contradice como plataforma paralela).",
  },
  {
    year: 2022,
    projects: 1,
    note: "Poca actividad pública, pero no un año vacío: un commit suelto en 'Static html page' (marzo) y prueba-tecnica-acc (septiembre), la prueba de 2 días que abrió la puerta a la Agencia Catastral de Cundinamarca. El trabajo real de la ACC vivió en GitLab privado/institucional.",
  },
  {
    year: 2023,
    projects: 1,
    note: "patrones (Angular con GitLab CI, 9 commits); arranca también el trabajo real de 'Proyecto Angular' (Seminario), importado a GitLab más tarde.",
  },
  {
    year: 2024,
    projects: 1,
    note: "Ptbdb (repo vacío de plantilla) y continúa la actividad real de 'Proyecto Angular' hasta noviembre.",
  },
  {
    year: 2025,
    projects: 2,
    note: "Hola (plantilla sin editar) y la importación tardía de 'Proyecto Angular' (creado en GitLab en julio 2025, commits reales de 2023-2024).",
  },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/** Devuelve la era a la que pertenece un año dado. */
export function eraForYear(year: number): Era | undefined {
  return ERAS.find((e) => year >= e.from && year <= e.to);
}

/** Hitos de una era, en orden cronológico. */
export function milestonesByEra(eraId: string): Milestone[] {
  return MILESTONES.filter((m) => m.era === eraId);
}

/** Empleos cuya fecha de inicio cae en el año dado, en orden cronológico. */
export function jobsByYear(year: number): Job[] {
  return JOBS.filter((j) => Number(j.date.slice(0, 4)) === year);
}

/** Empleos de una era, en orden cronológico. */
export function experienceByEra(eraId: string): Job[] {
  return JOBS.filter((j) => j.era === eraId);
}

/** Total de contribuciones GitHub registradas en la línea de tiempo. */
export const GITHUB_TOTAL_COMMITS = GITHUB_YEAR_STATS.reduce(
  (sum, s) => sum + s.commits,
  0,
);
