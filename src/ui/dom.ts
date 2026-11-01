export type Child = Node | string | number | false | null | undefined | readonly Child[];

type Handlers = Partial<{ [K in keyof HTMLElementEventMap]: (e: HTMLElementEventMap[K]) => void }>;

export interface Attrs {
  class?: string;
  on?: Handlers;
  [attr: string]: string | number | boolean | Handlers | null | undefined;
}

function append(parent: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((c) => append(parent, c));
    return;
  }
  parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : (child as Node));
}

/** Typed element factory. Text children are always inserted as text nodes, never as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'on') {
        for (const [evt, fn] of Object.entries(value as Handlers)) el.addEventListener(evt, fn as EventListener);
      } else if (key === 'class') el.className = String(value);
      else el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  children.forEach((c) => append(el, c));
  return el;
}

/** Replace all children of `parent`. */
export function mount(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  children.forEach((c) => append(parent, c));
}
