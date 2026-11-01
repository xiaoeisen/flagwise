import type { ThemePref } from '../domain/types';

export function applyTheme(theme: ThemePref): void {
  document.documentElement.setAttribute('data-theme', theme);
}

