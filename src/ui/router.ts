export type RouteId = 'home' | 'play' | 'results' | 'learn' | 'stats';

export interface View {
  readonly id: RouteId;
  readonly el: HTMLElement;
  /** Called every time the view becomes visible. */
  render(): void;
}

/**
 * Hash router. Only plain `#name` hashes are used so links work in sandboxed frames.
 * `guard` can redirect (e.g. no active round, so /play goes home); `onChange` runs after a view is shown.
 */
export class Router {
  private readonly byId: Map<RouteId, View>;

  constructor(
    views: readonly View[],
    private readonly guard: (route: RouteId) => RouteId,
    private readonly onChange: (route: RouteId) => void,
  ) {
    this.byId = new Map(views.map((v) => [v.id, v]));
  }

  start(): void {
    window.addEventListener('hashchange', () => this.sync());
    this.sync();
  }

  go(route: RouteId): void {
    if (location.hash === `#${route}`) this.sync();
    else location.hash = route;
  }

  private sync(): void {
    const raw = (location.hash || '#home').slice(1) as RouteId;
    const wanted: RouteId = this.byId.has(raw) ? raw : 'home';
    const route = this.guard(wanted);
    this.byId.forEach((view, id) => {
      view.el.hidden = id !== route;
    });
    this.byId.get(route)?.render();
    this.onChange(route);
    window.scrollTo(0, 0);
  }
}
