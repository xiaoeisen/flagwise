import { AppController } from '../app/controller';
import { BrowserStorage } from '../services/storage';
import { systemClock } from '../services/clock';
import { applyTheme } from '../services/theme';
import { DetailDialog } from './components/detailDialog';
import { Router, type RouteId } from './router';
import { createShell } from './shell';
import { HomeView } from './views/home';
import { LearnView } from './views/learn';
import { PlayView } from './views/play';
import { ResultsView } from './views/results';
import { StatsView } from './views/stats';

/** Composition root: creates the controller and views, wires them to the router. */
export function bootstrap(root: HTMLElement): void {
  const ctl = new AppController(new BrowserStorage(), systemClock);
  applyTheme(ctl.prefs.theme);

  const shell = createShell(root, ctl);
  const detail = new DetailDialog(ctl);

  // `router` is assigned below; views only call `go` after startup.
  let router!: Router;
  const ctx = { ctl, detail, go: (route: RouteId) => router.go(route) };

  const views = [new HomeView(ctx), new PlayView(ctx), new ResultsView(ctx), new LearnView(ctx), new StatsView(ctx)];
  shell.main.append(...views.map((v) => v.el));

  router = new Router(
    views,
    (route) => {
      if (route === 'play' && !ctl.active) return 'home';
      if (route === 'results' && !ctl.summary) return 'home';
      return route;
    },
    (route) => {
      shell.setActive(route);
      // Leaving a round by any other route (nav link, browser back) abandons it.
      if (route !== 'play' && route !== 'results' && ctl.active) ctl.quit();
    },
  );

  ctl.events.on('finished', (summary) => {
    if (summary.mode === 'classic' || summary.mode === 'type') shell.celebrate();
    router.go('results');
  });
  router.start();
}
