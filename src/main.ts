import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/game.css';
import './styles/views.css';
import { registerOffline } from './services/pwa';
import { bootstrap } from './ui/app';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app mount point');
bootstrap(root);
registerOffline();
