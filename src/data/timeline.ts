

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
  /** Traducción al inglés de `title` (opcional; si falta se usa el español). */
  titleEn?: string;
  /** Resumen corto, 1-2 frases. */
  summary: string;
  /** Traducción al inglés de `summary` (opcional; si falta se usa el español). */
  summaryEn?: string;
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
  /** Traducción al inglés de `title` (opcional; si falta se usa el español). */
  titleEn?: string;
  /** Descripción de 1-2 frases. */
  desc: string;
  /** Traducción al inglés de `desc` (opcional; si falta se usa el español). */
  descEn?: string;
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
  /** Traducción al inglés de `role` (opcional; si falta se usa el español). */
  roleEn?: string;
  /** Organización / empleador. */
  org: string;
  /** Descripción de 1 frase con las tecnologías clave. */
  desc: string;
  /** Traducción al inglés de `desc` (opcional; si falta se usa el español). */
  descEn?: string;
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
  /** Traducción al inglés de `note` (opcional; si falta se usa el español). */
  noteEn?: string;
  /** URL de un repo o recurso público relacionado (opcional). */
  url?: string;
}

/** Contribuciones anuales reportadas por GitHub. */
export interface GithubYearStat {
  year: number;
  /** Commits/contribuciones del año (2026: año en curso, ver `note`). */
  commits: number;
  prs?: number;
  issues?: number;
  /** Nota si el año es parcial u otra aclaración. */
  note?: string;
  /** Traducción al inglés de `note` (opcional; si falta se usa el español). */
  noteEn?: string;
}

/** Actividad anual observada en GitLab. */
export interface GitlabYearStat {
  year: number;
  /** Proyectos creados o con actividad real ese año. */
  projects: number;
  /** Resumen de qué pasó ese año en GitLab. */
  note: string;
  /** Traducción al inglés de `note` (opcional; si falta se usa el español). */
  noteEn?: string;
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
    titleEn: "the origins",
    summary:
      "Del SENA a la Universidad Distrital. Primer repo el mismo día que la cuenta; ejercicios de C/C++, entrada al GLUD y a la realidad virtual con software libre.",
    summaryEn:
      "From SENA to Universidad Distrital. First repo the same day as the account; C/C++ exercises, joining GLUD and diving into virtual reality with free software.",
    emoji: "🌱",
    color: "#5bd75b",
  },
  {
    id: "pandemia",
    from: 2020,
    to: 2020,
    title: "pandemia y GLUD dorado",
    titleEn: "pandemic and GLUD's golden age",
    summary:
      "Cuarentena, ciencia de datos aplicada al COVID-19 y la época dorada del GLUD/gnubies: ricing, temas de GRUB y arte libre en Krita.",
    summaryEn:
      "Quarantine, data science applied to COVID-19 and the golden era of GLUD/gnubies: ricing, GRUB themes and free art in Krita.",
    emoji: "🦠",
    color: "#f0a500",
  },
  {
    id: "universidad",
    from: 2021,
    to: 2021,
    title: "universidad plena",
    titleEn: "full-on university",
    summary:
      "Dirección del GLUD: clases de Angular y Docker dictadas por él mismo, el Monopoly en Java y el arranque del perfil DevOps con Traefik.",
    summaryEn:
      "Leading GLUD: Angular and Docker classes he taught himself, Monopoly in Java and the start of the DevOps profile with Traefik.",
    emoji: "🎓",
    color: "#4f9cf0",
  },
  {
    id: "sabatico",
    from: 2022,
    to: 2022,
    title: "el año callado (solo en apariencia)",
    titleEn: "the quiet year (only on the surface)",
    summary:
      "El año más silencioso en GitHub (41 commits)… pero uno de los más ocupados de su vida: dirección del GLUD, docencia en Dominio y su primer empleo serio en la Agencia Catastral de Cundinamarca — todo invisible en el GitHub público, en GitLab privado e institucional.",
    summaryEn:
      "The quietest year on GitHub (41 commits)… but one of the busiest of his life: leading GLUD, teaching at Dominio and his first serious job at the Agencia Catastral de Cundinamarca — all invisible on public GitHub, living in private, institutional GitLab.",
    emoji: "🌵",
    color: "#8a8a8a",
  },
  {
    id: "gran-anio",
    from: 2023,
    to: 2023,
    title: "el gran año",
    titleEn: "the big year",
    summary:
      "380 commits, 29 repos: el pico de la carrera y la siembra de la tesis — criptografía caótica + esteganografía de audio con redes neuronales.",
    summaryEn:
      "380 commits, 29 repos: the peak of his undergrad years and the seed of the thesis — chaotic cryptography + audio steganography with neural networks.",
    emoji: "🚀",
    color: "#e0457b",
  },
  {
    id: "banco",
    from: 2024,
    to: 2024,
    title: "el salto profesional",
    titleEn: "the professional leap",
    summary:
      "La prueba técnica que abrió la puerta al Banco de Bogotá y el paso a cloud developer: Clean Architecture en Angular, Terraform y onboarding en público.",
    summaryEn:
      "The technical test that opened the door to Banco de Bogotá and the jump to cloud developer: Clean Architecture in Angular, Terraform and onboarding in public.",
    emoji: "🏦",
    color: "#3fb0ac",
  },
  {
    id: "maestria",
    from: 2025,
    to: 2026,
    title: "maestría y presente",
    titleEn: "master's and the present",
    summary:
      "Un 2025 callado seguido del regreso en 2026 con la maestría en IA: tesis de esteganografía coverless sobre modelos de difusión, second brain y este portafolio.",
    summaryEn:
      "A quiet 2025 followed by a 2026 comeback with the master's in AI: a coverless steganography thesis on diffusion models, a second brain and this very portfolio.",
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
    titleEn: "ground zero: the account and the first repo, same day",
    desc: "Registra su cuenta de GitHub y en horas crea C-BasicProyects (ejercicios de C/C++ en Dev C++ de su primer semestre). Es literalmente su repo número uno.",
    descEn: "Signs up for GitHub and within hours creates C-BasicProyects (C/C++ exercises in Dev C++ from his first semester). It's literally repo number one.",
    repos: ["C-BasicProyects"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/C-BasicProyects",
  },
  {
    date: "2019-05-19",
    era: "origenes",
    title: "las notas del SENA",
    titleEn: "the SENA notes",
    desc: "Sube POO_SENA: notas y ejercicios de POO y SQL en C# hechos para el título de Técnico en Desarrollo de Software del SENA. Sería retomado hasta 2023.",
    descEn: "Uploads POO_SENA: OOP and SQL notes and exercises in C# made for SENA's Software Development Technician degree. He'd keep coming back to it until 2023.",
    repos: ["POO_SENA", "Adobe-XD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/POO_SENA",
  },
  {
    date: "2019-05-30",
    era: "origenes",
    title: "Fundamentos: 82 commits en equipo",
    titleEn: "Fundamentos: 82 team commits",
    desc: "El repo más activo de la etapa: sistema de monitorías de la Universidad Distrital como proyecto final de Bases de Datos, con un equipo de 4 estudiantes listados (código '20181020158' incluido).",
    descEn: "The most active repo of the period: a tutoring-management system for Universidad Distrital as the final Databases project, with a team of 4 listed students (student ID '20181020158' included).",
    repos: ["Fundamentos", "proyecto-final-avanzada", "BD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Fundamentos",
  },
  {
    date: "2019-06-01",
    era: "origenes",
    title: "A-Frame y la entrada al GLUD",
    titleEn: "A-Frame and joining GLUD",
    desc: "42 commits de realidad virtual con el framework A-Frame de Mozilla; el README enlaza a GLUDZILLA-VR, el proyecto de RV del Grupo GNU/Linux 'para preservar la salud del internet'.",
    descEn: "42 commits of virtual reality with Mozilla's A-Frame framework; the README links to GLUDZILLA-VR, the GNU/Linux Group's VR project 'para preservar la salud del internet' (\"to preserve the health of the internet\").",
    repos: ["A-frame---Course"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/A-frame---Course",
  },
  {
    date: "2019-06-03",
    era: "origenes",
    title: "arte libre: proyectos 'para art-glud'",
    titleEn: "free art: projects 'para art-glud'",
    desc: "INKSKAPE recopila proyectos hechos con Inkscape 'para art-glud', el subgrupo de arte digital del colectivo GLUD.",
    descEn: "INKSKAPE collects projects made with Inkscape 'para art-glud' (\"for art-glud\"), the digital art subgroup of the GLUD collective.",
    repos: ["INKSKAPE"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/INKSKAPE",
  },
  {
    date: "2019-06-17",
    era: "origenes",
    title: "GitLab: GLUDZILLA-VR, el repo más ideológico",
    titleEn: "GitLab: GLUDZILLA-VR, the most ideological repo",
    desc: "En GitLab arranca GLUDZILLA-VR: RV/IoT con A-Frame de Mozilla y una declaración de principios explícita sobre software libre y la 'salud del internet'.",
    descEn: "GLUDZILLA-VR kicks off on GitLab: VR/IoT with Mozilla's A-Frame and an explicit statement of principles about free software and the 'salud del internet' (\"health of the internet\").",
    repos: ["GLUDZILLA-VR"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/GLUDZILLA-VR",
  },
  {
    date: "2019-06-30",
    era: "origenes",
    title: "hilos en Java: '¿Quién ganará la carrera?'",
    titleEn: "threads in Java: '¿Quién ganará la carrera?'",
    desc: "JuegoHilosCarreraDeCaballos, una carrera de caballos con threads, presentada con esa pregunta lúdica como descripción.",
    descEn: "JuegoHilosCarreraDeCaballos, a horse race built with threads, introduced with that playful question as its description (\"who will win the race?\").",
    repos: ["JuegoHilosCarreraDeCaballos"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/JuegoHilosCarreraDeCaballos",
  },
  {
    date: "2019-07-28",
    era: "origenes",
    title: "linuxero de corazón",
    titleEn: "a Linux lover at heart",
    desc: "El repo Linux abre con una carita ASCII '(^_^) [o_o] (^.^)' y enlaza material de certificación LPI Linux Essentials y recursos de Manjaro.",
    descEn: "The Linux repo opens with an ASCII face '(^_^) [o_o] (^.^)' and links LPI Linux Essentials certification material and Manjaro resources.",
    repos: ["Linux"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Linux",
  },
  {
    date: "2019-08-14",
    era: "origenes",
    title: "JuanFelipeCV: primer CV con licencia GPL v3",
    titleEn: "JuanFelipeCV: first CV under GPL v3",
    desc: "Su primera página personal en HTML/CSS puro, con el emoji fantasma 👻, licencia GPL v3 desde el día uno y enlace cruzado a GitLab. El repo sigue vivo hasta 2026.",
    descEn: "His first personal page in pure HTML/CSS, with the ghost emoji 👻, a GPL v3 license from day one and a cross-link to GitLab. The repo is still alive in 2026.",
    repos: ["JuanFelipeCV"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/JuanFelipeCV",
  },
  {
    date: "2019-10-11",
    era: "origenes",
    title: "gnubies 2019: manuales y documentación",
    titleEn: "gnubies 2019: manuals and documentation",
    desc: "En GitLab nacen dos proyectos Gnubies: un manual de usuario de Openshot (autor principal Kevin Holguin) y precipitacion-project, con un README que aún dice '...Poner nombres...'.",
    descEn: "Two Gnubies projects are born on GitLab: an Openshot user manual (lead author Kevin Holguin) and precipitacion-project, whose README still says '...Poner nombres...' (\"...add names here...\").",
    repos: ["ManualUsuarioOpenshot", "precipitacion-project", "ArtGlud"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/ManualUsuarioOpenshot",
  },
  {
    date: "2019-11-18",
    era: "origenes",
    title: "optimización en AMPL",
    titleEn: "optimization in AMPL",
    desc: "io-ii: proyecto final de Investigación de Operaciones 2 escrito en AMPL para modelos de optimización.",
    descEn: "io-ii: final project for Operations Research 2, written in AMPL for optimization models.",
    repos: ["io-ii"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/io-ii",
  },
  {
    date: "2019-11-20",
    era: "origenes",
    title: "GitLab: web y sistemas operativos",
    titleEn: "GitLab: web and operating systems",
    desc: "desarrollo-Web (curso de HTML/CSS de Udemy, 43 commits) y luego sistemas-operativos (38 commits) marcan la producción sostenida en GitLab de la era GLUD.",
    descEn: "desarrollo-Web (a Udemy HTML/CSS course, 43 commits) and then sistemas-operativos (38 commits) mark the steady GitLab output of the GLUD era.",
    repos: ["desarrollo-Web", "sistemas-operativos"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/desarrollo-Web",
  },
  {
    date: "2019-12-31",
    era: "origenes",
    title: "Arch-Matic: 'NO EJECUTAR DIRECTAMENTE'",
    titleEn: "Arch-Matic: 'NO EJECUTAR DIRECTAMENTE'",
    desc: "Scripts de post-instalación de Arch en GitLab con la advertencia jocosa y muy linuxera: 'MÍRALO, CAMBIALO Y HAZLO TUYO. :D'.",
    descEn: "Arch post-install scripts on GitLab (\"do not run directly\") with a playful, very Linux-y warning: 'MÍRALO, CAMBIALO Y HAZLO TUYO. :D' (\"read it, change it and make it yours\").",
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
    titleEn: "the snake before quarantine",
    desc: "Snake, un juego clásico en Java, justo antes de que la cuarentena estricta lo cambiara todo.",
    descEn: "Snake, a classic game in Java, right before the strict lockdown changed everything.",
    repos: ["Snake"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Snake",
  },
  {
    date: "2020-05-10",
    era: "pandemia",
    title: "IO1 en equipo y el '\"Profesor\" Alberto Acosta'",
    titleEn: "IO1 as a team and the '\"Profesor\" Alberto Acosta'",
    desc: "io-i, 28 commits en colaboración con Mateo Nariño y Jose David Sanabria; el README cita entre comillas irónicas al profesor.",
    descEn: "io-i, 28 commits in collaboration with Mateo Nariño and Jose David Sanabria; the README puts the professor's title in ironic scare quotes.",
    repos: ["io-i", "IntroductionDataScience"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/io-i",
  },
  {
    date: "2020-05-29",
    era: "pandemia",
    title: "custom-linux: el equipo gnubies completo",
    titleEn: "custom-linux: the full gnubies team",
    desc: "Proyecto Gnubies 2020 de ricing de AwesomeWM en GitLab (59 commits); el README lista a los 5 coautores con nombre completo y el logo de la U. Distrital.",
    descEn: "Gnubies 2020 project ricing AwesomeWM on GitLab (59 commits); the README lists all 5 co-authors by full name, next to the U. Distrital logo.",
    repos: ["custom-linux", "Material-Awesome"],
    source: "gitlab",
    kind: "repo",
    url: "https://gitlab.com/Juferoga/custom-linux",
  },
  {
    date: "2020-07-15",
    era: "pandemia",
    title: "admin de servidores Linux (Coursera)",
    titleEn: "Linux server admin (Coursera)",
    desc: "LinuxSysAdmin: ejercicios en Shell de un curso de la Universidad de Colorado sobre administración y seguridad de servidores Linux.",
    descEn: "LinuxSysAdmin: Shell exercises from a University of Colorado course on Linux server administration and security.",
    repos: ["LinuxSysAdmin"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/LinuxSysAdmin",
  },
  {
    date: "2020-07-16",
    era: "pandemia",
    title: "modelar la pandemia con métodos numéricos",
    titleEn: "modeling the pandemic with numerical methods",
    desc: "numeric-methods: el README dice textual que 'modelamos la pandemia del COVID-19 en colombia' e incluye un notebook que analiza la percepción de Twitter sobre el manejo de la pandemia.",
    descEn: "numeric-methods: the README literally says 'modelamos la pandemia del COVID-19 en colombia' (\"we modeled the COVID-19 pandemic in Colombia\") and includes a notebook analyzing how Twitter perceived the handling of the pandemic.",
    repos: ["numeric-methods"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/numeric-methods",
  },
  {
    date: "2020-08-09",
    era: "pandemia",
    title: "⭐ grub2-theme-glud: su repo más estrellado",
    titleEn: "⭐ grub2-theme-glud: his most-starred repo",
    desc: "Tema visual para GRUB2 hecho para el GLUD, con banner ASCII propio y estilos instalables (Vimix, Stylish, Tela) hasta para ultrawide 2560x1080. 7 estrellas, su máximo en GitHub.",
    descEn: "A GRUB2 visual theme made for GLUD, with its own ASCII banner and installable styles (Vimix, Stylish, Tela) — even for 2560x1080 ultrawide. 7 stars, his all-time high on GitHub.",
    repos: ["grub2-theme-glud"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/grub2-theme-glud",
  },
  {
    date: "2020-08-12",
    era: "pandemia",
    title: "reconocer emociones con deep learning",
    titleEn: "recognizing emotions with deep learning",
    desc: "emotion-recognition-ICD: reconocimiento de emociones con deep learning para la electiva de Introducción a Ciencia de Datos.",
    descEn: "emotion-recognition-ICD: emotion recognition with deep learning for the Intro to Data Science elective.",
    repos: ["emotion-recognition-ICD"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/emotion-recognition-ICD",
  },
  {
    date: "2020-08-23",
    era: "pandemia",
    title: "'The Secret Github Repository 👻'",
    titleEn: "'The Secret Github Repository 👻'",
    desc: "Crea el repo de perfil Juferoga con esa descripción; el emoji fantasma se vuelve su firma personal en casi todos los README universitarios. El repo sigue actualizándose hasta 2026.",
    descEn: "Creates the Juferoga profile repo with that description; the ghost emoji becomes his personal signature in almost every university README. The repo is still being updated in 2026.",
    repos: ["Juferoga"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/Juferoga",
  },
  {
    date: "2020-10-04",
    era: "pandemia",
    title: "Krita: software libre también para el arte",
    titleEn: "Krita: free software for art, too",
    desc: "Sube dibujos hechos con Krita, herramienta libre de arte digital — coherente con su identidad de linuxero de corazón.",
    descEn: "Uploads drawings made with Krita, a free digital art tool — true to his Linux-lover-at-heart identity.",
    repos: ["Krita"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Krita",
  },
  {
    date: "2020-12-21",
    era: "pandemia",
    title: "redes neuronales recurrentes con demo web",
    titleEn: "recurrent neural networks with a web demo",
    desc: "playground-rnr incluye un prototipo de servicio web desplegado en GitHub Pages — no solo notebooks, también demos desplegadas.",
    descEn: "playground-rnr includes a web service prototype deployed on GitHub Pages — not just notebooks, but shipped demos too.",
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
    titleEn: "GLUD radio",
    desc: "obs-radioglud, vinculado a producción de radio/streaming con OBS para el Grupo GNU/Linux.",
    descEn: "obs-radioglud, tied to radio/streaming production with OBS for the GNU/Linux Group.",
    repos: ["obs-radioglud"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/obs-radioglud",
  },
  {
    date: "2021-03-09",
    era: "universidad",
    title: "docencia comunitaria: dicta Angular y Docker",
    titleEn: "community teaching: he teaches Angular and Docker",
    desc: "El mismo día publica el material de las clases que él dictó al GLUD: 'ng new la_mejor_app_del_mundo' en angularClass y una imagen de prueba 'perrito:1.0' con cowsay/fortune/figlet en dockerClass.",
    descEn: "On the same day he publishes the material from the classes he taught at GLUD: 'ng new la_mejor_app_del_mundo' (\"the best app in the world\") in angularClass and a 'perrito:1.0' (\"doggy\") test image with cowsay/fortune/figlet in dockerClass.",
    repos: ["angularClass", "dockerClass"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/dockerClass",
  },
  {
    date: "2021-05-24",
    era: "universidad",
    title: "Angular con la API de Rick & Morty XD",
    titleEn: "Angular with the Rick & Morty API XD",
    desc: "angular-practice: práctica de Angular consumiendo la API pública de Rick & Morty, con el 'XD' incluido en la propia descripción del repo.",
    descEn: "angular-practice: Angular practice consuming the public Rick & Morty API, with the 'XD' right there in the repo's own description.",
    repos: ["angular-practice", "Modelos-I"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/angular-practice",
  },
  {
    date: "2021-06-17",
    era: "universidad",
    title: "Traefik como proxy reverso: semilla DevOps",
    titleEn: "Traefik as a reverse proxy: the DevOps seed",
    desc: "traefik-as-a-reverse-proxy documenta paso a paso Traefik sobre Docker, con detalles de seguridad como permisos 600 para acme.json — despunta el perfil cloud/devops.",
    descEn: "traefik-as-a-reverse-proxy documents Traefik on Docker step by step, with security details like 600 permissions for acme.json — the cloud/devops profile starts to show.",
    repos: ["traefik-as-a-reverse-proxy"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/traefik-as-a-reverse-proxy",
  },
  {
    date: "2021-08-20",
    era: "universidad",
    title: "Física 1 en MATLAB (y en YouTube)",
    titleEn: "Physics 1 in MATLAB (and on YouTube)",
    desc: "Fisica-i: trabajo grupal con un video de YouTube sobre movimiento parabólico.",
    descEn: "Fisica-i: group work with a YouTube video on projectile motion.",
    repos: ["Fisica-i"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Fisica-i",
  },
  {
    date: "2021-09-13",
    era: "universidad",
    title: "modelos-i-final: un Monopoly en Java",
    titleEn: "modelos-i-final: Monopoly in Java",
    desc: "79 commits, el repo más trabajado del período: un Monopoly funcional en pareja con Brayan Stiven Yate Prada, con su propio sitio en GitHub Pages.",
    descEn: "79 commits, the most worked-on repo of the period: a working Monopoly built in a pair with Brayan Stiven Yate Prada, with its own GitHub Pages site.",
    repos: ["modelos-i-final"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/modelos-i-final",
  },
  {
    date: "2021-11-04",
    era: "universidad",
    title: "el lenguaje Oz (Modelos 2)",
    titleEn: "the Oz language (Models 2)",
    desc: "modelos-2: curso con el lenguaje multiparadigma Oz, poco común, otra vez junto a Brayan Stiven Yate Prada.",
    descEn: "modelos-2: a course using Oz, an uncommon multiparadigm language, once again alongside Brayan Stiven Yate Prada.",
    repos: ["modelos-2", "ciencias-1"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/modelos-2",
  },
  {
    date: "2021-11-17",
    era: "universidad",
    title: "arquitectura de computadores en TeX",
    titleEn: "computer architecture in TeX",
    desc: "arquitectura: 40 commits documentados en TeX, trabajo en equipo con Laura Montenegro y Nicolas Baena.",
    descEn: "arquitectura: 40 commits documented in TeX, teamwork with Laura Montenegro and Nicolas Baena.",
    repos: ["arquitectura"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/arquitectura",
  },
  {
    date: "2021-12-15",
    era: "universidad",
    title: "BOOLR-Adapted: 343 commits… heredados",
    titleEn: "BOOLR-Adapted: 343 commits… inherited",
    desc: "Adaptación del simulador de lógica digital BOOLR (autor original GGBRW). De sus 343 commits, la mayoría es historia importada desde 2016; apropiar y remezclar software libre, no partir de cero.",
    descEn: "An adaptation of the BOOLR digital logic simulator (original author GGBRW). Most of its 343 commits are history imported from 2016; appropriating and remixing free software instead of starting from scratch.",
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
    titleEn: "a lonely commit on GitLab",
    desc: "'Static html page' tiene un pequeño resurgir en solitario ('Update clases.js') — la única señal de que no estuvo 100% inactivo antes del silencio del resto del año.",
    descEn: "'Static html page' gets a small solo revival ('Update clases.js') — the only sign he wasn't 100% inactive before the silence of the rest of the year.",
    repos: ["mod2-final", "Static html page"],
    source: "gitlab",
    kind: "milestone",
    url: "https://gitlab.com/Juferoga/Static-html-page",
  },
  {
    date: "2022-03-24",
    era: "sabatico",
    title: "'recap of the investigation xD'",
    titleEn: "'recap of the investigation xD'",
    desc: "investigacion-mis se describe literalmente así: tono desenfadado incluso en repos académicos, en el año más callado de GitHub (solo 41 commits).",
    descEn: "investigacion-mis literally describes itself that way: a laid-back tone even in academic repos, in his quietest GitHub year (just 41 commits).",
    repos: ["investigacion-mis", "redes-ii"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/investigacion-mis",
  },
  {
    date: "2022-09-02",
    era: "sabatico",
    title: "plot twist: la prueba que abrió la puerta a la ACC",
    titleEn: "plot twist: the test that opened the door to the ACC",
    desc: "prueba-tecnica-acc: un Angular CLI 14.2.1 hecho en apenas 2 días (2-3 sept). 'acc' = Agencia Catastral de Cundinamarca: no fue un callejón sin salida, sino la puerta de entrada a su primer empleo serio, que arrancó semanas después — y siguió en GitLab privado, fuera del radar del GitHub público.",
    descEn: "prueba-tecnica-acc: an Angular CLI 14.2.1 app built in just 2 days (Sept 2-3). 'acc' = Agencia Catastral de Cundinamarca: not a dead end, but the gateway to his first serious job, which started weeks later — and carried on in private GitLab, off the public GitHub radar.",
    repos: ["prueba-tecnica-acc"],
    source: "gitlab",
    kind: "milestone",
    url: "https://gitlab.com/Juferoga/prueba-tecnica-acc",
  },
  {
    date: "2022-11-16",
    era: "sabatico",
    title: "'pro tip :: instalar en arch, mucho más fácil'",
    titleEn: "'pro tip :: instalar en arch, mucho más fácil'",
    desc: "El README completo de ciber-i: 'Cosas de matlab GNU OCTAVE :v / pro tip :: instalar en arch, mucho más fácil.' — puro sabor GLUD/Arch user.",
    descEn: "The entire ciber-i README: 'Cosas de matlab GNU OCTAVE :v / pro tip :: instalar en arch, mucho más fácil.' (\"MATLAB GNU Octave stuff :v / pro tip :: install it on Arch, way easier.\") — pure GLUD/Arch user flavor.",
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
    titleEn: "the big year begins: networking and automation",
    desc: "redes-i abre 2023 con resúmenes CCNA/Cisco por capítulo y scripts de automatización. El año cerraría con 380 commits, 29 PRs y 110 issues.",
    descEn: "redes-i opens 2023 with chapter-by-chapter CCNA/Cisco summaries and automation scripts. The year would close with 380 commits, 29 PRs and 110 issues.",
    repos: ["redes-i", "GNS3"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/redes-i",
  },
  {
    date: "2023-02-06",
    era: "gran-anio",
    title: "bd-2: 132 commits, su repo más activo",
    titleEn: "bd-2: 132 commits, his most active repo",
    desc: "Proyecto Django + Angular + Oracle 18c con docs en Jekyll y equipo (Andres Baquero, Cristian Yara, Bryan Muñoz). Título con emoji fantasma 👻, evidencia del salto de calidad de 2023.",
    descEn: "A Django + Angular + Oracle 18c project with Jekyll docs and a team (Andres Baquero, Cristian Yara, Bryan Muñoz). Ghost emoji 👻 in the title — proof of 2023's jump in quality.",
    repos: ["bd-2"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/bd-2",
  },
  {
    date: "2023-02-24",
    era: "gran-anio",
    title: "docker-apps: la caja de herramientas DevOps",
    titleEn: "docker-apps: the DevOps toolbox",
    desc: "README mínimo pero configuraciones reales de clamav, jenkins, portainer, sonarqube y traefik — semilla temprana del perfil cloud/devops.",
    descEn: "A minimal README but real configs for clamav, jenkins, portainer, sonarqube and traefik — an early seed of the cloud/devops profile.",
    repos: ["docker-apps"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/docker-apps",
  },
  {
    date: "2023-06-14",
    era: "gran-anio",
    title: "patrones: 'CINE PACHO'",
    titleEn: "patrones: 'CINE PACHO'",
    desc: "68 commits de un proyecto Django + Angular aplicando patrones de diseño, con Brayan Stiven Yate, Jonathan Castellanos y Mateo Bohorquez.",
    descEn: "68 commits on a Django + Angular project applying design patterns, with Brayan Stiven Yate, Jonathan Castellanos and Mateo Bohorquez.",
    repos: ["patrones", "deploy-patrones", "fis"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/patrones",
  },
  {
    date: "2023-08-09",
    era: "gran-anio",
    title: "parking: ':v xD electron project'",
    titleEn: "parking: ':v xD electron project'",
    desc: "Su primera app de escritorio completa con Electron + IndexedDB y licencia GPL-v3; la descripción oficial del repo es, literalmente, ':v xD electron project'.",
    descEn: "His first full desktop app, with Electron + IndexedDB and a GPL-v3 license; the repo's official description is, literally, ':v xD electron project'.",
    repos: ["parking", "seminario"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/parking",
  },
  {
    date: "2023-09-01",
    era: "gran-anio",
    title: "se-tesis: nace la tesis",
    titleEn: "se-tesis: the thesis is born",
    desc: "Criptosistema esteganográfico de audio con atractores caóticos y compresión de texto por redes neuronales. Nace con solo 6 commits en 2023: el 93% del trabajo (86 de 92) llegaría después, hasta 2026.",
    descEn: "An audio steganographic cryptosystem with chaotic attractors and neural-network text compression. Born with just 6 commits in 2023: 93% of the work (86 of 92) would come later, all the way to 2026.",
    repos: ["se-tesis"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/se-tesis",
  },
  {
    date: "2023-10-02",
    era: "gran-anio",
    title: "voz y género: preludio de la tesis",
    titleEn: "voice and gender: a prelude to the thesis",
    desc: "Voice-based-gender-recognition (fork de SuperKogito): reconocimiento de género por voz con MFCC + GMM y ~95% de precisión. Procesamiento de audio, tema hermano de su tesis.",
    descEn: "Voice-based-gender-recognition (a fork of SuperKogito): voice-based gender recognition with MFCC + GMM and ~95% accuracy. Audio processing, a sibling topic to his thesis.",
    repos: ["Voice-based-gender-recognition", "gicoge"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/Voice-based-gender-recognition",
  },
  {
    date: "2023-11-22",
    era: "gran-anio",
    title: "multimedia: un shooter 2D en Godot",
    titleEn: "multimedia: a 2D shooter in Godot",
    desc: "89 commits en menos de un mes para un shooter 2D en Godot (GDScript), jugable en web, en pareja con Daniel Eduardo Parra Gómez. Su lado gamer saliendo a flote.",
    descEn: "89 commits in under a month for a 2D shooter in Godot (GDScript), playable on the web, built in a pair with Daniel Eduardo Parra Gómez. His gamer side coming to the surface.",
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
    titleEn: "detecting screams in earthquakes with AI",
    desc: "ia-audition-article: detección automática de gritos de personas atrapadas usando SVM, regresión logística y árboles de decisión sobre audio, para apoyar rescates.",
    descEn: "ia-audition-article: automatic detection of screams from trapped people using SVM, logistic regression and decision trees on audio, to support rescue efforts.",
    repos: ["ia-audition-article", "refine-test"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ia-audition-article",
  },
  {
    date: "2024-03-17",
    era: "banco",
    title: "catastro: XTF y Docker en el IGAC",
    titleEn: "cadastre: XTF and Docker at IGAC",
    desc: "ric_xtf y auto_ric_xtf_docker automatizan con Docker (Postgres+PostGIS + Java) la creación/importación de modelos XTF de INTERLIS (el estándar del modelo catastral LADM-COL) con ili2pg.",
    descEn: "ric_xtf and auto_ric_xtf_docker use Docker (Postgres+PostGIS + Java) to automate creating/importing INTERLIS XTF models (the standard behind Colombia’s LADM-COL cadastral model) with ili2pg.",
    repos: ["ric_xtf", "auto_ric_xtf_docker", "planeacion-historia-clinica"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/auto_ric_xtf_docker",
  },
  {
    date: "2024-08-17",
    era: "banco",
    title: "ptbdb: la prueba técnica que abrió la puerta",
    titleEn: "ptbdb: the technical test that opened the door",
    desc: "Tres retos de código con metodología GITFLOW, README con badges y hasta un gif — 39 commits en 3 días. La prueba que precedió su contratación como cloud developer en Banco de Bogotá.",
    descEn: "Three coding challenges with GITFLOW methodology, a README with badges and even a gif — 39 commits in 3 days. The test that preceded his hiring as a cloud developer at Banco de Bogotá.",
    repos: ["ptbdb"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/ptbdb",
  },
  {
    date: "2024-10-07",
    era: "banco",
    title: "accesibilidad para MinTIC",
    titleEn: "accessibility for MinTIC",
    desc: "accseibility: componente de accesibilidad en Angular 18 encargado por MinTIC.",
    descEn: "accseibility: an Angular 18 accessibility component commissioned by MinTIC.",
    repos: ["accseibility"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/accseibility",
  },
  {
    date: "2024-10-23",
    era: "banco",
    title: "onboarding cloud developer, en público",
    titleEn: "cloud developer onboarding, in public",
    desc: "bdb-onboarding-sessions documenta en abierto las sesiones de onboarding como cloud developer en Banco de Bogotá — inusual dejar ese proceso interno documentado.",
    descEn: "bdb-onboarding-sessions openly documents his onboarding sessions as a cloud developer at Banco de Bogotá — it's unusual to leave that internal process documented.",
    repos: ["bdb-onboarding-sessions", "spring-basic-app"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/bdb-onboarding-sessions",
  },
  {
    date: "2024-10-24",
    era: "banco",
    title: "Clean Architecture: 'Como funciona? buena pregunta...'",
    titleEn: "Clean Architecture: 'Como funciona? buena pregunta...'",
    desc: "cleanArchitectureAngular17 aplica Clean Architecture con infra en Terraform y ese arranque de README desenfadado. La segunda aproximación (onion) llegaría en diciembre.",
    descEn: "cleanArchitectureAngular17 applies Clean Architecture with Terraform infra and that laid-back README opener (\"how does it work? good question...\"). The second take (onion) would arrive in December.",
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
    titleEn: "second-brain: 'your brain is for having ideas'",
    desc: "Sistema personal de gestión del conocimiento (estructura tipo PARA), abierto con la cita de David Allen. Uno de los pocos repos de un 2025 deliberadamente callado (19 commits).",
    descEn: "A personal knowledge management system (PARA-style structure), opening with the David Allen quote. One of the few repos from a deliberately quiet 2025 (19 commits).",
    repos: ["second-brain", "dotfiles", "angular-state-control"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/second-brain",
  },
  {
    date: "2025-06-07",
    era: "maestria",
    title: "geo-visor: catastro con Angular + Nx",
    titleEn: "geo-visor: cadastre with Angular + Nx",
    desc: "Visor de datos catastrales con Leaflet y Angular Material, organizado en libs de dominio catastral, UI compartida y utilidades GIS.",
    descEn: "A cadastral data viewer with Leaflet and Angular Material, organized into cadastral-domain libs, shared UI and GIS utilities.",
    repos: ["geo-visor"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/geo-visor",
  },
  {
    date: "2026-02-25",
    era: "maestria",
    title: "mcic-tesis: esteganografía pure coverless",
    titleEn: "mcic-tesis: pure coverless steganography",
    desc: "La tesis de maestría: codifica mensajes en el espacio latente caótico de Stable Diffusion (atractor memristivo 5D) sin tocar la imagen, con recuperación exacta (IFE sobre DDIM), firma RSA-2048 y 100% de recuperación en benchmark.",
    descEn: "The master's thesis: it encodes messages in Stable Diffusion's chaotic latent space (5D memristive attractor) without touching the image, with exact recovery (IFE over DDIM), RSA-2048 signatures and 100% recovery on the benchmark.",
    repos: ["mcic-tesis"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/mcic-tesis",
  },
  {
    date: "2026-02-28",
    era: "maestria",
    title: "el regreso: 190 commits para la maestría",
    titleEn: "the comeback: 190 commits for the master's",
    desc: "Tras el silencio de 2025, arranca la avalancha de repos de la Maestría en Ciencias de la Información: herramientas matemáticas (MATLAB), informática (Java), analítica de datos.",
    descEn: "After the silence of 2025, the avalanche of repos for the Master's in Information Sciences begins: mathematical tools (MATLAB), computing (Java), data analytics.",
    repos: ["mcic-math-tools-data", "mcic-computing", "mcic-data-analytics"],
    source: "github",
    kind: "stat",
    url: "https://github.com/Juferoga/mcic-computing",
  },
  {
    date: "2026-03-07",
    era: "maestria",
    title: "ai-context-extractor: IA y GLUD otra vez",
    titleEn: "ai-context-extractor: AI and GLUD again",
    desc: "CLI 'map-ia' que analiza (AST vía ts-morph) proyectos Angular y comprime su arquitectura en un grafo legible por IAs. Se declara construida 'en el marco del GLUD' — el vínculo más explícito con el grupo en toda la era.",
    descEn: "A 'map-ia' CLI that analyzes Angular projects (AST via ts-morph) and compresses their architecture into a graph AIs can read. It declares itself built 'en el marco del GLUD' (\"within the GLUD\") — the most explicit link to the group in the whole era.",
    repos: ["ai-context-extractor", "rental-management-system"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ai-context-extractor",
  },
  {
    date: "2026-03-27",
    era: "maestria",
    title: "mcic: la maestría como dashboard",
    titleEn: "mcic: the master's as a dashboard",
    desc: "Compendio público de la maestría (énfasis IA, modalidad investigación): plan de 44 créditos con barra de progreso ASCII (16/44, 36.4%) y semestre I cerrado con promedio 4.73.",
    descEn: "A public compendium of the master's (AI emphasis, research track): a 44-credit plan with an ASCII progress bar (16/44, 36.4%) and semester I closed with a 4.73/5 GPA.",
    repos: ["mcic", "pp-diabetic-retinopathy"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/mcic",
  },
  {
    date: "2026-04-07",
    era: "maestria",
    title: "meta-IA: agentes que revisan su propio paper",
    titleEn: "meta-AI: agents reviewing their own paper",
    desc: "pp-rw-crypto-stego, una revisión sistemática sobre esteganografía en LaTeX, incluye una carpeta .agent/ con skills de IA propios (q1-pipeline, q1-enhancer, ieee-reviewer) para mejorar y revisar el manuscrito.",
    descEn: "pp-rw-crypto-stego, a systematic review on steganography written in LaTeX, includes a .agent/ folder with its own AI skills (q1-pipeline, q1-enhancer, ieee-reviewer) to improve and review the manuscript.",
    repos: ["pp-rw-crypto-stego"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/pp-rw-crypto-stego",
  },
  {
    date: "2026-04-25",
    era: "maestria",
    title: "ActivSpot: ricing que enamoró a Reddit",
    titleEn: "ActivSpot: the ricing that won Reddit over",
    desc: "Su visión de una 'dynamic island' para Hyprland en QML/Quickshell. El README admite que 'nació para uso personal, se compartió tras interés genuino de la comunidad de Reddit'.",
    descEn: "His take on a 'dynamic island' for Hyprland in QML/Quickshell. The README admits it 'nació para uso personal, se compartió tras interés genuino de la comunidad de Reddit' (\"was born for personal use and shared after genuine interest from the Reddit community\").",
    repos: ["ActivSpot"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/ActivSpot",
  },
  {
    date: "2026-06-28",
    era: "maestria",
    title: "portfolio: 'About me, really me :v'",
    titleEn: "portfolio: 'About me, really me :v'",
    desc: "Este mismo portafolio en Astro, sin deps de runtime: estética hacker terminal, easter eggs (sudo, matrix, neofetch, Konami Code) y foco fuerte en accesibilidad (aria-live, prefers-reduced-motion, fallback sin JS).",
    descEn: "This very portfolio in Astro, with zero runtime deps: hacker-terminal aesthetic, easter eggs (sudo, matrix, neofetch, Konami Code) and a strong focus on accessibility (aria-live, prefers-reduced-motion, no-JS fallback).",
    repos: ["portfolio"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/portfolio",
  },
  {
    date: "2026-08-07",
    era: "maestria",
    title: "session-recorder: de video a documentación",
    titleEn: "session-recorder: from video to documentation",
    desc: "CLI en Python que convierte la grabación de una sesión de trabajo en Markdown estructurado: FFmpeg extrae el audio, faster-whisper transcribe y un LLM local vía Ollama resume, con screenshots incluidos.",
    descEn: "A Python CLI that turns a recorded work session into structured Markdown: FFmpeg extracts the audio, faster-whisper transcribes it and a local LLM via Ollama summarizes it, screenshots included.",
    repos: ["session-recorder"],
    source: "github",
    kind: "repo",
    url: "https://github.com/Juferoga/session-recorder",
  },
  {
    date: "2026-08-07",
    era: "maestria",
    title: "la maestría, en abierto: nuevas materias",
    titleEn: "the master's, in the open: new courses",
    desc: "Tres repos nuevos para Computación Paralela, Inteligencia de Negocios e Inteligencia Computacional, que se suman al compendio mcic (16 de 44 créditos, documentado en GitHub Pages). Todo el recorrido de la MCIC queda público.",
    descEn: "Three new repos for Parallel Computing, Business Intelligence and Computational Intelligence, joining the mcic compendium (16 of 44 credits, documented on GitHub Pages). The whole MCIC journey stays public.",
    repos: ["mcic", "mcic-parallel-computing", "mcic-business-intelligence", "mcic-computational-intelligence"],
    source: "github",
    kind: "milestone",
    url: "https://github.com/Juferoga/mcic",
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
    roleEn: "Instructor",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Enseñó fundamentos de GNU/Linux y software libre en los procesos GNUBIES-2019; coautor de la guía 'Instalando GNU/Linux'.",
    descEn: "Taught GNU/Linux and free software fundamentals in the GNUBIES-2019 program; co-author of the 'Instalando GNU/Linux' (\"Installing GNU/Linux\") guide.",
    tech: ["GNU/Linux", "Software libre", "Documentación"],
    kind: "job",
  },
  {
    date: "2021-01-01",
    end: "2022-03-01",
    era: "universidad",
    role: "Director general",
    roleEn: "General Director",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Dirigió el colectivo de software libre y dio la charla #SLUDXVIII 'Fractales y software libre'.",
    descEn: "Led the free software collective and gave the #SLUDXVIII talk 'Fractales y software libre' (\"Fractals and free software\").",
    tech: ["Liderazgo", "Software libre", "GNU/Linux"],
    kind: "job",
  },
  {
    date: "2022-05-01",
    end: "2022-08-01",
    era: "sabatico",
    role: "Director general (segunda etapa, autónomo)",
    roleEn: "General Director (second term, independent)",
    org: "Grupo GNU/Linux Universidad Distrital (GLUD)",
    desc: "Segunda etapa autónoma de la dirección; dictó un curso de GNS3 para el GLUD.",
    descEn: "An independent second term at the helm; taught a GNS3 course for GLUD.",
    tech: ["GNS3", "Redes", "Liderazgo"],
    kind: "job",
  },
  {
    date: "2025-09-15",
    end: "2025-09-19",
    era: "maestria",
    role: "Conferencista · SLUD XXII",
    roleEn: "Speaker · SLUD XXII",
    org: "Semana Linux UD (GLUD)",
    desc: "Dio conferencias en la Semana Linux UD (SLUD XXII), del 15 al 19 de septiembre de 2025.",
    descEn: "Gave talks at Semana Linux UD (SLUD XXII), September 15-19, 2025.",
    tech: ["Software libre", "GNU/Linux", "Divulgación"],
    kind: "job",
  },

  // --- Dominio Estudio de Diseño (docencia y front-end) ---------------------
  {
    date: "2021-11-01",
    end: "2022-07-01",
    era: "universidad",
    role: "Desarrollador Web Front-End e Instructor Especialista",
    roleEn: "Front-End Web Developer & Specialist Instructor",
    org: "Dominio Estudio de Diseño",
    desc: "Lideró la 'Academia Héroes Tech' con cursos de Python y JavaScript para la Corporación Mariano Matamoros; captura de requerimientos, front-end web y mobile y diseño responsive.",
    descEn: "Led the 'Academia Héroes Tech' with Python and JavaScript courses for the Corporación Mariano Matamoros; requirements gathering, web and mobile front-end, and responsive design.",
    tech: ["Python", "JavaScript", "Responsive", "Mobile"],
    kind: "job",
  },
  {
    date: "2022-12-01",
    end: "2023-01-01",
    era: "sabatico",
    role: "Profesor",
    roleEn: "Teacher",
    org: "Dominio Estudio de Diseño",
    desc: "Segunda cohorte para la Corporación Matamoros: clases de Python, Vue JS y JavaScript, con apoyo en proyectos con Vue JS, Docker y PHP/Laravel.",
    descEn: "Second cohort for the Corporación Matamoros: Python, Vue JS and JavaScript classes, plus support on projects with Vue JS, Docker and PHP/Laravel.",
    tech: ["Python", "Vue JS", "JavaScript", "Docker", "PHP/Laravel"],
    kind: "job",
  },

  // --- assistance team SAS --------------------------------------------------
  {
    date: "2020-11-01",
    end: "2020-12-01",
    era: "pandemia",
    role: "Desarrollador web",
    roleEn: "Web Developer",
    org: "assistance team SAS",
    desc: "Desarrollo y personalización de aplicativos con WordPress (contrato de un mes).",
    descEn: "Built and customized WordPress applications (one-month contract).",
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
    roleEn: "Front-End Developer (part-time)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Actualización de la página web principal de la ACC (versión 2.0) con AngularJS integrado a Bootstrap y Angular Material, RxJS, Docker y Django.",
    descEn: "Revamped the ACC's main website (version 2.0) with AngularJS integrated with Bootstrap and Angular Material, RxJS, Docker and Django.",
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
    roleEn: "Front-End Developer (full-time)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Portal EXTERNO de trámites catastrales para el público, con normativas MINTIC; dockerización de todos los proyectos (AngularJS y Django), Jenkins y Traefik.",
    descEn: "PUBLIC-facing portal for cadastral procedures, following MINTIC standards; dockerized every project (AngularJS and Django), plus Jenkins and Traefik.",
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
    roleEn: "Front-End Developer (full-time)",
    org: "Agencia Catastral de Cundinamarca (ACC)",
    desc: "Portal INTERNO de trámites catastrales con desarrollo integral front-end, back-end y CI/CD sobre Django, AngularJS y GitLab CI/CD.",
    descEn: "INTERNAL portal for cadastral procedures, with end-to-end front-end, back-end and CI/CD work on Django, AngularJS and GitLab CI/CD.",
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
    roleEn: "Research Assistant",
    org: "GICOGE · Universidad Distrital",
    desc: "Desarrollo de la web del grupo (Angular) y actualización en MINCIENCIAS, con Traefik como reverse proxy.",
    descEn: "Built the group's website (Angular) and updated its MINCIENCIAS profile, with Traefik as a reverse proxy.",
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
    roleEn: "Research Assistant",
    org: "GICOGE · Universidad Distrital",
    desc: "Instalación de la infraestructura del grupo con Docker y un CMS WordPress para la web.",
    descEn: "Set up the group's infrastructure with Docker and a WordPress CMS for the website.",
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
    roleEn: "Full Stack Developer",
    org: "Instituto Geográfico Agustín Codazzi (IGAC)",
    desc: "Soporte, mantenimiento y desarrollo de apps de recolección de datos (CICA y Consultores Catastrales) con Angular 16-18, Java/Spring Boot y Oracle DB; CI/CD con GitLab y Docker.",
    descEn: "Support, maintenance and development of data-collection apps (CICA and Consultores Catastrales) with Angular 16-18, Java/Spring Boot and Oracle DB; CI/CD with GitLab and Docker.",
    tech: ["Angular (16-18)", "Java / Spring Boot", "Oracle DB", "GitLab CI/CD", "Docker"],
    source: "gitlab-private",
    private: true,
    kind: "job",
    note: "Logro: mejora de la interfaz de CICA. Tuvo un segundo contrato con el IGAC en 2025 que le tocó ceder, tras trabajar apenas ~2 meses ese año.",
    noteEn: "Highlight: improved the CICA interface. He had a second contract with IGAC in 2025 that he had to give up after working only ~2 months that year.",
  },

  // --- Banco de Bogotá (BdB) — remoto, cloud/financiero ---------------------
  {
    date: "2024-10-01",
    end: "2026-03-01",
    era: "banco",
    role: "Analista de sistemas III",
    roleEn: "Systems Analyst III",
    org: "Banco de Bogotá",
    desc: "Infraestructura como código en AWS, arquitectura de microservicios y frontend moderno; soluciones resilientes y escalables para el sector financiero en un entorno ágil.",
    descEn: "Infrastructure as code on AWS, microservices architecture and modern frontend; resilient, scalable solutions for the financial sector in an agile environment.",
    tech: ["AWS", "IaC", "Terraform", "Microservicios", "Angular"],
    kind: "job",
    note: "Reconocimiento de equipo. Solape oct-dic 2024 con el IGAC: fue una transición del catastro a la banca, no un corte seco.",
    noteEn: "Team recognition. Overlapped with IGAC Oct-Dec 2024: a transition from cadastre to banking, not a clean cut.",
  },
  {
    date: "2026-02-01",
    era: "maestria",
    role: "Analista de sistemas II",
    roleEn: "Systems Analyst II",
    org: "Banco de Bogotá",
    desc: "Lidera el desarrollo de soluciones Cloud de alto impacto y la automatización de procesos financieros.",
    descEn: "Leads the development of high-impact cloud solutions and the automation of financial processes.",
    tech: ["AWS", "Cloud", "Automatización"],
    current: true,
    kind: "job",
    note: "Reconocimiento de la 'tribu ecosistemas de pago'.",
    noteEn: "Recognition from the 'tribu ecosistemas de pago' (\"payment ecosystems tribe\").",
  },
];

// -----------------------------------------------------------------------------
// STATS ANUALES
// -----------------------------------------------------------------------------

/** Contribuciones GitHub por año (verificadas vía GraphQL contributionsCollection). */
export const GITHUB_YEAR_STATS: GithubYearStat[] = [
  { year: 2018, commits: 2, note: "Cuenta creada el 2018-08-30.", noteEn: "Account created on 2018-08-30." },
  { year: 2019, commits: 186 },
  { year: 2020, commits: 126 },
  { year: 2021, commits: 173 },
  { year: 2022, commits: 41, note: "El año más callado.", noteEn: "The quietest year." },
  { year: 2023, commits: 380, prs: 29, issues: 110, note: "El gran año: 29 repos nuevos.", noteEn: "The big year: 29 new repos." },
  { year: 2024, commits: 103 },
  { year: 2025, commits: 19, note: "Año deliberadamente callado.", noteEn: "A deliberately quiet year." },
  { year: 2026, commits: 259, note: "Hasta el 11 de octubre; año de la maestría.", noteEn: "Through October 11; the master's year." },
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
    noteEn: "GLUD/gnubies era: GLUDZILLA-VR, ArtGlud, desarrollo-Web, manuals and Arch-Matic.",
  },
  {
    year: 2020,
    projects: 8,
    note: "Pico de ricing y comunidad: custom-linux (59 commits), Material-Awesome (fork), sistemas-operativos, H-CC ('Yo no se hahaha').",
    noteEn: "Peak of ricing and community: custom-linux (59 commits), Material-Awesome (fork), sistemas-operativos, H-CC ('Yo no se hahaha' — \"I dunno hahaha\").",
  },
  {
    year: 2021,
    projects: 0,
    note: "Vacío total: ningún proyecto ni commit en GitLab (ni en GitHub la narrativa lo contradice como plataforma paralela).",
    noteEn: "Totally empty: not a single project or commit on GitLab (nor does the story treat it as a parallel platform to GitHub).",
  },
  {
    year: 2022,
    projects: 1,
    note: "Poca actividad pública, pero no un año vacío: un commit suelto en 'Static html page' (marzo) y prueba-tecnica-acc (septiembre), la prueba de 2 días que abrió la puerta a la Agencia Catastral de Cundinamarca. El trabajo real de la ACC vivió en GitLab privado/institucional.",
    noteEn: "Little public activity, but not an empty year: a stray commit in 'Static html page' (March) and prueba-tecnica-acc (September), the 2-day test that opened the door to the Agencia Catastral de Cundinamarca. The ACC's real work lived in private/institutional GitLab.",
  },
  {
    year: 2023,
    projects: 1,
    note: "patrones (Angular con GitLab CI, 9 commits); arranca también el trabajo real de 'Proyecto Angular' (Seminario), importado a GitLab más tarde.",
    noteEn: "patrones (Angular with GitLab CI, 9 commits); real work on 'Proyecto Angular' (Seminario) also begins, imported into GitLab later.",
  },
  {
    year: 2024,
    projects: 1,
    note: "Ptbdb (repo vacío de plantilla) y continúa la actividad real de 'Proyecto Angular' hasta noviembre.",
    noteEn: "Ptbdb (empty template repo), and real activity on 'Proyecto Angular' continues until November.",
  },
  {
    year: 2025,
    projects: 2,
    note: "Hola (plantilla sin editar) y la importación tardía de 'Proyecto Angular' (creado en GitLab en julio 2025, commits reales de 2023-2024).",
    noteEn: "Hola (unedited template) and the late import of 'Proyecto Angular' (created on GitLab in July 2025, with real commits from 2023-2024).",
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
