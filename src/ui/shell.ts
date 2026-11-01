import type { AppController } from '../app/controller';
import { createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme } from '../services/theme';
import { AnimatedThemeToggler } from '../components/ui/animated-theme-toggler';
import { Confetti, type ConfettiRef } from '../components/ui/confetti';
import { LiquidEther } from '../components/ui/liquid-ether';
import { h } from './dom';
import type { RouteId } from './router';

export interface Shell {
  main: HTMLElement;
  celebrate(): void;
  setActive(route: RouteId): void;
}

const NAV: readonly { route: RouteId; label: string }[] = [
  { route: 'home', label: 'Play' },
  { route: 'learn', label: 'Learn' },
  { route: 'stats', label: 'Stats' },
];

/** Static page frame: brand, navigation, theme switch and the <main> that views mount into. */
export function createShell(root: HTMLElement, ctl: AppController): Shell {
  const links = NAV.map((n) => h('a', { href: `#${n.route}`, 'data-nav': n.route }, n.label));
  const liquidMount = h('div', { class: 'liquid-ether-screen', 'aria-hidden': 'true' });
  const themeMount = h('div', { class: 'theme-toggle' });
  const confettiMount = h('div', { class: 'confetti-layer', 'aria-hidden': 'true' });
  const confettiRef = createRef<ConfettiRef>();
  let setLiquidTheme: ((theme: typeof ctl.prefs.theme) => void) | null = null;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const liquidRoot = createRoot(liquidMount);
    setLiquidTheme = (theme) => {
      liquidRoot.render(createElement(LiquidEther, {
        colors: [theme === 'light' ? '#171715' : '#F2EBDD'],
        autoDemo: true,
        autoSpeed: 0.24,
        autoIntensity: 1.5,
        resolution: 0.32,
      }));
    };
    setLiquidTheme(ctl.prefs.theme);
  }
  createRoot(themeMount).render(createElement(AnimatedThemeToggler, {
    onThemeChange(theme) {
      ctl.setPrefs({ theme });
      applyTheme(theme);
      setLiquidTheme?.(theme);
    },
  }));
  createRoot(confettiMount).render(createElement(Confetti, {
    ref: confettiRef,
    className: 'confetti-canvas',
    manualstart: true,
  }));
  const main = h('main');
  root.append(
    h(
      'div',
      { class: 'shell' },
      liquidMount,
      h(
        'header',
        { class: 'top' },
        h(
          'a',
          { class: 'brand', href: '#home', 'aria-label': 'Flagwise home' },
          h('img', { class: 'brand-mark', src: './icons/icon.svg', alt: '', width: 34, height: 34, 'aria-hidden': true }),
          h('span', null, 'Flagwise'),
        ),
        h('nav', { class: 'nav', 'aria-label': 'Main' }, links),
        themeMount,
      ),
      main,
    ),
  );
  root.append(confettiMount);

  return {
    main,
    celebrate() {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confettiRef.current?.fire({
          particleCount: 120,
          spread: 78,
          startVelocity: 42,
          origin: { x: 0.5, y: 0.62 },
          zIndex: 1000,
        });
      }
    },
    setActive(route) {
      document.documentElement.classList.toggle('quiz-active', route === 'play');
      document.body.classList.toggle('quiz-active', route === 'play');
      const key = route === 'play' || route === 'results' ? 'home' : route;
      links.forEach((a) => {
        if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    },
  };
}
