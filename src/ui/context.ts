import type { AppController } from '../app/controller';
import type { DetailDialog } from './components/detailDialog';
import type { RouteId } from './router';

/** What every view receives. Views talk to the controller and the router, never to each other. */
export interface ViewContext {
  ctl: AppController;
  go: (route: RouteId) => void;
  detail: DetailDialog;
}
