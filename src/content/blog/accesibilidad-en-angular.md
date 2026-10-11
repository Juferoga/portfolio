---
title: "accesibilidad en angular: foco, componentes y lo que el linter no te dice"
description: "Guía práctica para construir interfaces accesibles en Angular 18: gestión de foco al navegar, componentes con el CDK, anuncios para lectores de pantalla y cómo blindarlo con lint y tests. Post cruzado con A11Y PRO."
titleEn: "accessibility in angular: focus, components and what the linter won't tell you"
descriptionEn: "A practical guide to building accessible interfaces in Angular 18: focus management on navigation, components with the CDK, screen reader announcements and how to lock it in with lint and tests. Cross-posted with A11Y PRO."
date: 2026-10-11
tags: ["angular", "accesibilidad", "a11y", "wcag", "frontend"]
lang: es
draft: false
---

<!--
  BORRADOR — post colaborativo con A11Y PRO (a11ypro.tech).
  Pendiente antes de publicar:
  - [ ] Enlace al post complementario de A11Y PRO (auditoría y validación con WCAG 2.2): buscar "TODO-A11YPRO".
  - [ ] Mención de autoría del colaborador (nombre y enlace, como él prefiera).
  - [ ] Anécdotas propias: buscar "TODO-JF" (portal GOV.CO en la ACC, el wrapper del UI Kit, etc.).
  - [ ] Quitar `draft: true` del frontmatter.
-->

```bash
juferoga@portfolio:~/blog$ ng lint --fix && echo "¿y ahora sí es accesible?"
¿y ahora sí es accesible?
# spoiler: no necesariamente
```

La accesibilidad suele llegar tarde a los proyectos: cuando alguien corre una auditoría a
dos semanas de salir a producción, o cuando una entidad pública recuerda que tiene que
cumplir la norma. En Angular eso duele más de lo necesario, porque el framework trae casi
todo lo que hace falta para hacerlo bien desde el día uno; solo hay que saber dónde está.

<!-- TODO-JF: anécdota del portal externo de la Agencia Catastral (normativas MinTIC / GOV.CO)
     y del intento de wrapper Angular para el UI Kit de GOV.CO. ¿Qué faltaba? ¿Qué aprendiste? -->

Este post es la mitad técnica de una colaboración con **[A11Y PRO](https://a11ypro.tech)**: aquí va el
*cómo se construye* en Angular; allá, el *cómo se audita y valida* contra WCAG 2.2.
<!-- TODO-A11YPRO: enlace al post complementario -->

## El problema que Angular te crea (sin querer)

En una aplicación de una sola página (SPA), cambiar de ruta no recarga el documento. Para
quien navega con mouse da igual; para quien usa lector de pantalla o teclado, **no pasa
nada**: el foco se queda en el enlace que acaba de pulsar, el lector no anuncia la página
nueva y el título de la pestaña sigue diciendo lo mismo.

Tres cosas resuelven el 80 % del problema:

1. **Un título por ruta.** Angular lo soporta de forma nativa con la propiedad
   [`title` de la ruta](https://angular.dev/api/router/Route):

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '', component: InicioComponent, title: 'Inicio · Mi trámite' },
  { path: 'radicar', component: RadicarComponent, title: 'Radicar solicitud · Mi trámite' },
];
```

2. **Mover el foco al contenido nuevo** después de cada navegación:

```ts
// app.component.ts
@Component({ /* ... */ })
export class AppComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // el <h1> de cada página lleva tabindex="-1" para poder recibir foco por código
        queueMicrotask(() => document.querySelector<HTMLElement>('main h1')?.focus());
      });
  }
}
```

3. **Un enlace "Saltar al contenido"** como primer elemento enfocable del documento, que
lleve a ese mismo `<main>`.

## No reinventes componentes: usa el CDK

El error más caro que he visto en proyectos Angular es construir a mano un modal, un menú
desplegable o unas pestañas con `<div (click)>`. Se ven bien, pero no se pueden usar con
teclado y el lector de pantalla no sabe qué son. El paquete `@angular/cdk/a11y` resuelve las
partes difíciles ([documentación del CDK a11y](https://material.angular.dev/cdk/a11y/overview)):

- **`cdkTrapFocus`**: atrapa el foco dentro de un diálogo mientras está abierto. Con
  `cdkTrapFocusAutoCapture` lo mueve adentro al abrir y lo devuelve al botón que lo abrió al
  cerrar.
- **`FocusKeyManager` / `ActiveDescendantKeyManager`**: navegación con flechas en listas,
  menús y *listboxes*, sin escribir el manejo de teclado a mano.
- **`LiveAnnouncer`**: anuncia mensajes al lector de pantalla ("Solicitud enviada",
  "3 resultados") sin mover el foco.
- **`FocusMonitor`**: distingue si el foco llegó por teclado o por mouse, para mostrar el
  anillo de foco solo cuando sirve (sin quitarlo nunca del todo).

```ts
@Component({
  selector: 'app-buscador',
  template: `
    <label for="q">Buscar trámite</label>
    <input id="q" type="search" (input)="buscar($any($event.target).value)" />
    <ul>
      @for (r of resultados(); track r.id) {
        <li><a [routerLink]="r.ruta">{{ r.nombre }}</a></li>
      }
    </ul>
  `,
})
export class BuscadorComponent {
  private announcer = inject(LiveAnnouncer);
  resultados = signal<Tramite[]>([]);

  buscar(q: string) {
    this.resultados.set(filtrar(q));
    this.announcer.announce(`${this.resultados().length} resultados`, 'polite');
  }
}
```

Y si ya usas **Angular Material**, buena parte de esto viene incluido: sus componentes están
construidos sobre el CDK y siguen los [patrones de WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/).

## HTML semántico primero, ARIA después

La [primera regla de ARIA](https://www.w3.org/TR/using-aria/) es no usar ARIA si existe un elemento nativo que haga lo mismo. En
plantillas Angular eso se traduce en:

- `<button type="button">` para acciones, `<a>` (o `routerLink`) para navegación. Nunca un
  `<div (click)>`.
- Cada `<input>` con su `<label for>`; los errores de validación enlazados con
  `aria-describedby` y anunciados cuando aparecen.
- Atributos dinámicos con el binding de atributo: `[attr.aria-expanded]="abierto()"`,
  `[attr.aria-invalid]="control.invalid && control.touched"`.

```html
<button type="button" [attr.aria-expanded]="abierto()" aria-controls="filtros"
        (click)="abierto.set(!abierto())">
  Filtros
</button>
<div id="filtros" [hidden]="!abierto()">…</div>
```

## WCAG 2.2: los criterios que más rompen las SPAs

WCAG 2.2 añadió criterios que golpean justo a los patrones típicos de una app Angular:

- **[2.4.11 Foco no oculto (mínimo)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), nivel AA**: los *headers* fijos tapan el elemento
  enfocado al tabular. Se arregla con `scroll-padding-top` en el contenedor de scroll.
- **[2.5.8 Tamaño del objetivo (mínimo)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), nivel AA**: botones e íconos clicables de al menos
  24×24 px (o con espacio suficiente alrededor).
- **[3.3.8 Autenticación accesible (mínimo)](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), nivel AA**: nada de obligar a resolver acertijos
  o a transcribir códigos sin permitir pegar o usar el gestor de contraseñas.

Cómo auditar esto paso a paso es justo lo que cubre el post de [A11Y PRO](https://a11ypro.tech).
<!-- TODO-A11YPRO: enlace -->

## Que no se rompa: lint y tests

Lo que no se verifica en CI se degrada en dos *sprints*. Dos capas baratas:

**1. Reglas de accesibilidad en el linter de plantillas.** [`angular-eslint`](https://github.com/angular-eslint/angular-eslint) trae un conjunto
listo (`templateAccessibility`) que detecta, entre otras cosas, imágenes sin `alt`, clics sin
evento de teclado, controles sin etiqueta, `tabindex` positivos y ARIA inválido:

```js
// eslint.config.js
const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config({
  files: ['**/*.html'],
  extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
});
```

**2. [axe-core](https://github.com/dequelabs/axe-core) en los tests de extremo a extremo** (por ejemplo con
[Playwright y `@axe-core/playwright`](https://playwright.dev/docs/accessibility-testing)), que falla el *pipeline* si una página nueva introduce violaciones:

```ts
test('radicar solicitud no tiene violaciones de accesibilidad', async ({ page }) => {
  await page.goto('/radicar');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(violations).toEqual([]);
});
```

Ninguna herramienta automática detecta todo: se estima que encuentran apenas una parte de
los problemas reales. El resto exige probar con teclado y con un lector de pantalla de
verdad (NVDA, VoiceOver, TalkBack). Esa es la frontera donde termina este post y empieza el
de [A11Y PRO](https://a11ypro.tech).

## Checklist para tu próximo componente

- [ ] ¿Se puede usar entero con teclado (Tab, Shift+Tab, Enter, Espacio, Esc, flechas)?
- [ ] ¿El foco es visible y nunca queda tapado por un *header* fijo?
- [ ] ¿Usa elementos nativos antes que ARIA?
- [ ] ¿Los cambios importantes se anuncian (`LiveAnnouncer`) sin robar el foco?
- [ ] ¿Cada ruta tiene `title` y mueve el foco al contenido nuevo?
- [ ] ¿Pasa el lint de `templateAccessibility` y axe en CI?

## Sigue por aquí

- **El post complementario en A11Y PRO:** cómo auditar y validar componentes Angular según WCAG 2.2.
  <!-- TODO-A11YPRO: reemplazar por el enlace directo al post cuando esté publicado -->
  Mientras tanto, todo su trabajo está en [a11ypro.tech](https://a11ypro.tech).
- **Herramientas de A11Y PRO:** un [escáner de accesibilidad](https://scanner.a11ypro.tech), un
  [widget](https://widget.a11ypro.tech) y [documentación con tutoriales](https://docs.a11ypro.tech).
- **Si trabajas para el Estado colombiano:** el [layout de GOV.CO](https://gitlab.com/govco/layout-govco)
  es el punto de partida obligado; todo lo de este post aplica encima de él.

```bash
juferoga@portfolio:~/blog$ echo "accesible no es un feature, es un requisito"
accesible no es un feature, es un requisito
```
