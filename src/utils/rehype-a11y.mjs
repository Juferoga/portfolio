// Plugin rehype (sin dependencias) para el Markdown del blog:
// 1. Enlaces externos: abren en una pestaña nueva y lo avisan a lectores de pantalla.
// 2. Listas de tareas (- [ ]): el checkbox queda dentro de un <label> con el texto
//    del ítem, así tiene nombre accesible (WCAG 4.1.2).

const SITE = "juferoga.pro";
const NEW_TAB = "(abre en una nueva ventana)";

function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((c) => walk(c, fn));
}

const isExternal = (href) => {
  try {
    const u = new URL(href);
    return /^https?:$/.test(u.protocol) && !u.hostname.endsWith(SITE);
  } catch {
    return false; // rutas relativas, anclas, mailto…
  }
};

export default function rehypeA11y() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== "element") return;

      if (node.tagName === "a" && isExternal(String(node.properties?.href ?? ""))) {
        node.properties.target = "_blank";
        node.properties.rel = ["noopener", "noreferrer"];
        node.children.push({
          type: "element",
          tagName: "span",
          properties: { className: ["sr-only"] },
          children: [{ type: "text", value: ` ${NEW_TAB}` }],
        });
      }

      if (node.tagName === "li" && node.children?.some((c) => c.tagName === "input" && c.properties?.type === "checkbox")) {
        node.children = [{ type: "element", tagName: "label", properties: {}, children: node.children }];
      }
    });
  };
}
