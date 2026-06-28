

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  lines: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
}

export interface ProjectItem {
  name: string;
  tech: string;
  desc: string;
  url: string;
}

export interface Profile {
  handle: string;
  name: string;
  role: string;
  title: string;
  location: string;
  tagline: string;
  avatar: string;
  about: string[];
  goals: string[];
  skills: Record<string, string[]>;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certs: string[];
  contact: {
    email: string;
    github: string;
    linkedin: string;
    web: string;
  };
  socials: { name: string; handle: string; url: string; icon: string }[];
  now: string[];
  testimonials: { quote: string; name: string; role: string }[];
  gallery: { src: string; caption: string }[];
}

export const PROFILE: Profile = {
  handle: "juferoga",
  name: "Juan Felipe Rodríguez Galindo",
  role: "Especialista en Desarrollo de Software · Ingeniero de Sistemas",
  title: "Cloud Developer @ Banco de Bogotá",
  location: "Bogotá, Colombia",
  tagline: "Cambiando el mundo una línea a la vez",
  avatar: "/assets/photos/avatar.jpg",

  about: [
    "Ingeniero de Sistemas de la Universidad Distrital Francisco José de Caldas.",
    "Profundamente apasionado por la innovación tecnológica y el SOFTWARE LIBRE.",
    "",
    "Experiencia sólida en sistemas GNU/Linux, arquitectura de microservicios,",
    "infraestructura como código en AWS y desarrollo frontend moderno.",
    "",
    "Ex-Director del Grupo GNU/Linux de la Universidad Distrital y miembro del",
    "grupo de complejidad. Comprometido con la comunidad académica y el código",
    "abierto. +85 repositorios en GitHub: ciencia de datos, patrones de diseño,",
    "métodos numéricos y deep learning.",
    "",
    "Actualmente cursando una Maestría en Ciencias de la Información y las",
    "Comunicaciones (2026 - 2027).",
  ],

  goals: [
    "Seguir aprendiendo y mejorando en Inteligencia Artificial para resolver",
    "problemas complejos.",
    "Contribuir a proyectos innovadores aportando análisis, iniciativa y liderazgo.",
  ],

  skills: {
    "Cloud & DevOps": ["AWS", "IaC", "Docker", "GitLab CI/CD", "Jenkins", "Traefik"],
    "Frontend": ["Angular (16-18)", "AngularJS", "RxJS", "Angular Material", "Bootstrap", "Vue.js"],
    "Backend": ["Java / Spring Boot", "Django", "Python", "PHP / Laravel", "Node.js"],
    "Data & AI": ["Deep Learning", "Reconocimiento de emociones", "Anthropic Claude", "Prompt Flow"],
    "Sistemas": ["GNU/Linux", "Oracle DB", "Microservicios", "Seguridad de sistemas"],
    "Idiomas": ["Español (Nativo)", "Inglés (Professional Working)"],
  },

  experience: [
    {
      company: "Banco de Bogotá",
      role: "Analista de Sistemas II · Cloud Developer",
      period: "feb 2026 — Presente",
      lines: [
        "Lidero el desarrollo de soluciones Cloud de alto impacto, integrando",
        "tecnologías de vanguardia para la automatización de procesos financieros.",
      ],
    },
    {
      company: "Banco de Bogotá",
      role: "Analista de Sistemas III · Cloud Developer",
      period: "oct 2024 — mar 2026",
      lines: [
        "Evolución de plataformas digitales críticas: IaC en AWS, arquitectura de",
        "microservicios y frontend moderno. Soluciones resilientes y escalables",
        "con foco en seguridad y calidad de software en el sector financiero.",
      ],
    },
    {
      company: "Instituto Geográfico Agustín Codazzi (IGAC)",
      role: "Desarrollador Full Stack",
      period: "mar 2024 — dic 2024",
      lines: [
        "Soporte y desarrollo de apps de recolección de datos (CICA, Consultores",
        "Catastrales) con Angular 16-18, Java/Spring Boot y Oracle DB. Despliegue",
        "con GitLab CI/CD y Docker.",
      ],
    },
    {
      company: "Agencia Catastral de Cundinamarca",
      role: "Desarrollador Front-End",
      period: "ene 2023 — dic 2023",
      lines: [
        "Portales internos y externos de trámites catastrales. Full stack con",
        "Django, AngularJS y GitLab CI/CD. Dockerización completa, Jenkins y",
        "Traefik. Cumplimiento de normativas MINTIC para portales gubernamentales.",
      ],
    },
    {
      company: "Universidad Distrital · Grupo GICOGE",
      role: "Monitor de Investigación",
      period: "2023 — 2024",
      lines: [
        "Infraestructura del grupo de investigación con Docker, CMS WordPress y",
        "actualización en MINCIENCIAS.",
      ],
    },
    {
      company: "Grupo GNU/Linux — Universidad Distrital",
      role: "Director General",
      period: "2021 — 2022",
      lines: [
        "Dirección del Grupo GNU/Linux. Promoción del software libre y enseñanza",
        "de fundamentos de sistemas operativos GNU/Linux a la comunidad.",
      ],
    },
    {
      company: "Dominio Estudio de Diseño",
      role: "Desarrollador Web Front-End e Instructor",
      period: "2021 — 2023",
      lines: [
        "Desarrollo front-end (web y mobile) e instructor en 'Academia Héroes",
        "Tech': cursos de Python y JavaScript para la Corporación Mariano",
        "Matamoros D'Acosta.",
      ],
    },
  ],

  education: [
    {
      school: "Universidad Distrital Francisco José de Caldas",
      degree: "Maestría en Ciencias de la Información y las Comunicaciones",
      period: "2026 — 2027",
    },
    {
      school: "Universidad Distrital Francisco José de Caldas",
      degree: "Ingeniería de Sistemas",
      period: "2018 — 2025",
    },
    {
      school: "Servicio Nacional de Aprendizaje (SENA)",
      degree: "Técnico en Desarrollo de Software",
      period: "2016 — 2017",
    },
  ],

  projects: [
    {
      name: "se-tesis — Criptosistema Esteganográfico de Audio",
      tech: "Python · Caos · Redes Neuronales",
      desc: "Tesis de Ing. de Sistemas: oculta y cifra información en audio usando atractores caóticos, con compresión de texto vía redes neuronales.",
      url: "https://github.com/Juferoga/se-tesis",
    },
    {
      name: "emotion-recognition-ICD",
      tech: "Python · Deep Learning",
      desc: "Reconocimiento de emociones a través de modelos de deep learning.",
      url: "https://github.com/Juferoga/emotion-recognition-ICD",
    },
    {
      name: "ai-context-extractor",
      tech: "TypeScript · IA · Angular",
      desc: "Extractor de contexto de proyectos Angular para alimentar modelos de IA.",
      url: "https://github.com/Juferoga/ai-context-extractor",
    },
    {
      name: "grub2-theme-glud ⭐",
      tech: "Shell · GNU/Linux",
      desc: "Tema personalizado de GRUB2 para el Grupo GNU/Linux de la U. Distrital. Mi repo más estrellado.",
      url: "https://github.com/Juferoga/grub2-theme-glud",
    },
    {
      name: "BOOLR-Adapted",
      tech: "JavaScript · Simulación",
      desc: "Simulador de circuitos lógicos adaptado para experimentación y enseñanza.",
      url: "https://github.com/Juferoga/BOOLR-Adapted",
    },
    {
      name: "rental-management-system",
      tech: "TypeScript · Full Stack",
      desc: "Sistema de gestión de rentas inmobiliarias.",
      url: "https://github.com/Juferoga/rental-management-system",
    },
    {
      name: "+85 repositorios open source",
      tech: "Data Science · Patrones · Métodos Numéricos",
      desc: "Explora toda mi diversidad de proyectos en GitHub. ↗",
      url: "https://github.com/Juferoga",
    },
  ],

  certs: [
    "Engineering Practices for Building Quality Software",
    "Computer Security and Systems Management (Programa Especializado)",
    "Claude 101 · Anthropic",
    "Comunicación efectiva para el líder actual",
    "Habilidades de negociación y comunicación efectiva",
  ],

  contact: {
    email: "juferoga@gmail.com",
    github: "https://github.com/Juferoga",
    linkedin: "https://www.linkedin.com/in/juferoga/",
    web: "https://juferoga.github.io/JuanFelipeCV/",
  },

  socials: [
    { name: "GitHub", handle: "@Juferoga", url: "https://github.com/Juferoga", icon: "🐙" },
    { name: "LinkedIn", handle: "/in/juferoga", url: "https://www.linkedin.com/in/juferoga/", icon: "💼" },
    { name: "GitLab", handle: "@Juferoga", url: "https://gitlab.com/Juferoga", icon: "🦊" },
    { name: "YouTube", handle: "@juferoga", url: "https://www.youtube.com/@juferoga", icon: "▶️" },
    { name: "X", handle: "@JuanFelipe_61", url: "https://x.com/JuanFelipe_61", icon: "✖️" },
    { name: "Instagram", handle: "@juferoga", url: "https://www.instagram.com/juferoga/", icon: "📸" },
    { name: "Behance", handle: "Juferoga", url: "https://www.behance.net/Juferoga", icon: "🎨" },
    { name: "Patreon", handle: "juferoga", url: "https://www.patreon.com/cw/juferoga", icon: "🅿️" },
    { name: "ORCID", handle: "0000-0002-9178-4474", url: "https://orcid.org/0000-0002-9178-4474", icon: "🔬" },
    { name: "CVLAC", handle: "0002034769", url: "https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh=0002034769", icon: "🇨🇴" },
  ],

  now: [
    "🎓 Cursando la Maestría en Ciencias de la Información y las Comunicaciones (2026–2027).",
    "☁️ Liderando soluciones Cloud en Banco de Bogotá.",
    "🤖 Explorando IA aplicada y construyendo cosas con Claude.",
    "📚 Investigando para mi tesis de maestría.",
  ],

  testimonials: [
    {
      quote: "Su participación como líder del GLUD fue especialmente relevante; su ejemplo y liderazgo resultaron inspiradores. Un profesional altamente competente, innovador y con enfoque en la mejora continua.",
      name: "Carlos Mora",
      role: "Systems Engineer & Frontend Lead · M.S. AI",
    },
    {
      quote: "Talento innato para dominar cualquier tecnología en tiempo récord y gran habilidad para la gestión del proyecto. Un talento integral, brillante y propositivo.",
      name: "Mateo Bohórquez",
      role: "Ingeniero de Sistemas · Dev & Data Science",
    },
    {
      quote: "Gran iniciativa, liderazgo y una visión clara del negocio. Sus desarrollos aportan dinamismo y una mejor experiencia para el usuario.",
      name: "Jessica Fresneda",
      role: "QA Analyst · ISTQB Certified",
    },
    {
      quote: "Un excelente líder y compañero, siempre dispuesto a hacer las cosas de la mejor manera. Conciliador, propositivo y valora la opinión de los demás.",
      name: "Andrés Felipe Martín",
      role: "Software Engineer · GoLang & Angular",
    },
    {
      quote: "Profesional íntegro y muy capacitado, con excelentes habilidades comunicativas. Entrega cada producto con calidad y en los tiempos estipulados.",
      name: "Jan Hernández",
      role: "Ingeniero de Sistemas",
    },
    {
      quote: "Un ingeniero con total profesionalidad y creatividad para afrontar los retos de desarrollo a nivel empresarial.",
      name: "Leonardo Martínez",
      role: "Python, Django & PHP Developer",
    },
  ],

  gallery: [
    { src: "/assets/trabajo_img/tesis_sustentacion.jpg", caption: "Sustentación de mi tesis: criptosistema esteganográfico de audio basado en atractores caóticos y redes neuronales (Grupo ComplexUD, U. Distrital)." },
    { src: "/assets/trabajo_img/igac_trabajo_mejora_ui-ux.jpg", caption: "IGAC — rediseño UI/UX de la plataforma CICA: de interfaz heredada a una experiencia moderna con KPIs claros (antes / después)." },
    { src: "/assets/trabajo_img/acc_actualizacion.jpg", caption: "Agencia Catastral de Cundinamarca — nueva web institucional v2.0 (portal GOV.CO)." },
    { src: "/assets/photos/glud-talk.jpg", caption: "SLUD XXII — charla \"El futuro de Linux\", como ex-Director del GLUD." },
    { src: "/assets/trabajo_img/curso_gns3.jpg", caption: "Curso de GNS3 (redes de comunicaciones) que dicto en mi canal de YouTube." },
  ],
};

export const PROFILE_EN: Profile = {
  ...PROFILE,
  role: "Software Development Specialist · Systems Engineer",
  title: "Cloud Developer @ Banco de Bogotá",
  tagline: "Changing the world one line at a time",

  about: [
    "Systems Engineer from Universidad Distrital Francisco José de Caldas.",
    "Deeply passionate about technological innovation and FREE SOFTWARE.",
    "",
    "Solid experience in GNU/Linux systems, microservices architecture,",
    "infrastructure as code on AWS, and modern frontend development.",
    "",
    "Former Director of the Universidad Distrital GNU/Linux Group and member of",
    "the complexity group. Committed to the academic community and open source.",
    "85+ GitHub repositories: data science, design patterns, numerical methods,",
    "and deep learning.",
    "",
    "Currently pursuing a Master's in Information and Communication Sciences",
    "(2026 - 2027).",
  ],

  goals: [
    "Keep learning and improving in Artificial Intelligence to tackle complex",
    "problems.",
    "Contribute to innovative projects bringing analysis, initiative and leadership.",
  ],

  now: [
    "🎓 Pursuing a Master's in Information and Communication Sciences (2026–2027).",
    "☁️ Leading Cloud solutions at Banco de Bogotá.",
    "🤖 Exploring applied AI and building things with Claude.",
    "📚 Researching for my master's thesis.",
  ],

  skills: {
    "Cloud & DevOps": ["AWS", "IaC", "Docker", "GitLab CI/CD", "Jenkins", "Traefik"],
    "Frontend": ["Angular (16-18)", "AngularJS", "RxJS", "Angular Material", "Bootstrap", "Vue.js"],
    "Backend": ["Java / Spring Boot", "Django", "Python", "PHP / Laravel", "Node.js"],
    "Data & AI": ["Deep Learning", "Emotion recognition", "Anthropic Claude", "Prompt Flow"],
    "Systems": ["GNU/Linux", "Oracle DB", "Microservices", "Systems security"],
    "Languages": ["Spanish (Native)", "English (Professional Working)"],
  },

  experience: [
    {
      company: "Banco de Bogotá",
      role: "Systems Analyst II · Cloud Developer",
      period: "Feb 2026 — Present",
      lines: [
        "I lead the development of high-impact Cloud solutions, integrating",
        "cutting-edge technologies to automate financial processes.",
      ],
    },
    {
      company: "Banco de Bogotá",
      role: "Systems Analyst III · Cloud Developer",
      period: "Oct 2024 — Mar 2026",
      lines: [
        "Evolution of critical digital platforms: IaC on AWS, microservices",
        "architecture and modern frontend. Resilient, scalable solutions with a",
        "focus on security and software quality in the financial sector.",
      ],
    },
    {
      company: "Instituto Geográfico Agustín Codazzi (IGAC)",
      role: "Full Stack Developer",
      period: "Mar 2024 — Dec 2024",
      lines: [
        "Support and development of data-collection apps (CICA, Consultores",
        "Catastrales) with Angular 16-18, Java/Spring Boot and Oracle DB.",
        "Deployment with GitLab CI/CD and Docker.",
      ],
    },
    {
      company: "Agencia Catastral de Cundinamarca",
      role: "Front-End Developer",
      period: "Jan 2023 — Dec 2023",
      lines: [
        "Internal and public cadastral-procedure portals. Full stack with Django,",
        "AngularJS and GitLab CI/CD. Full containerization, Jenkins and Traefik.",
        "MINTIC compliance for government portals.",
      ],
    },
    {
      company: "Universidad Distrital · GICOGE Research Group",
      role: "Research Monitor",
      period: "2023 — 2024",
      lines: [
        "Research group infrastructure with Docker, the WordPress CMS and",
        "MINCIENCIAS registration updates.",
      ],
    },
    {
      company: "GNU/Linux Group — Universidad Distrital",
      role: "General Director",
      period: "2021 — 2022",
      lines: [
        "Direction of the GNU/Linux Group. Promotion of free software and teaching",
        "GNU/Linux operating-system fundamentals to the community.",
      ],
    },
    {
      company: "Dominio Estudio de Diseño",
      role: "Front-End Web Developer & Instructor",
      period: "2021 — 2023",
      lines: [
        "Front-end development (web and mobile) and instructor at 'Academia Héroes",
        "Tech': Python and JavaScript courses for the Mariano Matamoros D'Acosta",
        "Foundation.",
      ],
    },
  ],

  education: [
    {
      school: "Universidad Distrital Francisco José de Caldas",
      degree: "Master's in Information and Communication Sciences",
      period: "2026 — 2027",
    },
    {
      school: "Universidad Distrital Francisco José de Caldas",
      degree: "Systems Engineering",
      period: "2018 — 2025",
    },
    {
      school: "Servicio Nacional de Aprendizaje (SENA)",
      degree: "Software Development Technician",
      period: "2016 — 2017",
    },
  ],

  projects: [
    {
      name: "se-tesis — Audio Steganographic Cryptosystem",
      tech: "Python · Chaos · Neural Networks",
      desc: "Systems Engineering thesis: hides and encrypts information in audio using chaotic attractors, with text compression via neural networks.",
      url: "https://github.com/Juferoga/se-tesis",
    },
    {
      name: "emotion-recognition-ICD",
      tech: "Python · Deep Learning",
      desc: "Emotion recognition through deep learning models.",
      url: "https://github.com/Juferoga/emotion-recognition-ICD",
    },
    {
      name: "ai-context-extractor",
      tech: "TypeScript · AI · Angular",
      desc: "Context extractor for Angular projects to feed AI models.",
      url: "https://github.com/Juferoga/ai-context-extractor",
    },
    {
      name: "grub2-theme-glud ⭐",
      tech: "Shell · GNU/Linux",
      desc: "Custom GRUB2 theme for the Universidad Distrital GNU/Linux Group. My most-starred repo.",
      url: "https://github.com/Juferoga/grub2-theme-glud",
    },
    {
      name: "BOOLR-Adapted",
      tech: "JavaScript · Simulation",
      desc: "Adapted logic-circuit simulator for experimentation and teaching.",
      url: "https://github.com/Juferoga/BOOLR-Adapted",
    },
    {
      name: "rental-management-system",
      tech: "TypeScript · Full Stack",
      desc: "Real-estate rental management system.",
      url: "https://github.com/Juferoga/rental-management-system",
    },
    {
      name: "85+ open source repositories",
      tech: "Data Science · Patterns · Numerical Methods",
      desc: "Explore all my project diversity on GitHub. ↗",
      url: "https://github.com/Juferoga",
    },
  ],

  certs: [
    "Engineering Practices for Building Quality Software",
    "Computer Security and Systems Management (Specialization)",
    "Claude 101 · Anthropic",
    "Effective Communication for Today's Leader",
    "Negotiation and Effective Communication Skills",
  ],

  testimonials: [
    {
      quote: "His role as GLUD leader was especially relevant; his example and leadership were inspiring. A highly competent, innovative professional focused on continuous improvement.",
      name: "Carlos Mora",
      role: "Systems Engineer & Frontend Lead · M.S. AI",
    },
    {
      quote: "An innate talent for mastering any technology in record time and a great ability to manage projects. An integral, brilliant and proactive talent.",
      name: "Mateo Bohórquez",
      role: "Systems Engineer · Dev & Data Science",
    },
    {
      quote: "Great initiative, leadership and a clear business vision. His developments bring dynamism and a better user experience.",
      name: "Jessica Fresneda",
      role: "QA Analyst · ISTQB Certified",
    },
    {
      quote: "An excellent leader and teammate, always willing to do things the best way possible. Conciliatory, proactive and values others' opinions.",
      name: "Andrés Felipe Martín",
      role: "Software Engineer · GoLang & Angular",
    },
    {
      quote: "An upstanding and highly capable professional with excellent communication skills. He delivers every product with quality and on time.",
      name: "Jan Hernández",
      role: "Systems Engineer",
    },
    {
      quote: "An engineer with complete professionalism and creativity to face enterprise-level development challenges.",
      name: "Leonardo Martínez",
      role: "Python, Django & PHP Developer",
    },
  ],

  gallery: [
    { src: "/assets/trabajo_img/tesis_sustentacion.jpg", caption: "My thesis defense: audio steganographic cryptosystem based on chaotic attractors and neural networks (ComplexUD Group, U. Distrital)." },
    { src: "/assets/trabajo_img/igac_trabajo_mejora_ui-ux.jpg", caption: "IGAC — UI/UX redesign of the CICA platform: from a legacy interface to a modern experience with clear KPIs (before / after)." },
    { src: "/assets/trabajo_img/acc_actualizacion.jpg", caption: "Cundinamarca Cadastral Agency — new institutional website v2.0 (GOV.CO portal)." },
    { src: "/assets/photos/glud-talk.jpg", caption: "SLUD XXII — \"The future of Linux\" talk, as former GLUD Director." },
    { src: "/assets/trabajo_img/curso_gns3.jpg", caption: "GNS3 course (communication networks) I teach on my YouTube channel." },
  ],
};

