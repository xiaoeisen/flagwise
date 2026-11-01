import { h, mount } from '../dom';

export type ChipOption<T> = readonly [value: T, label: string];

/** Single-select pill group with radio semantics. Re-render it whenever the selection changes. */
export function renderChips<T extends string | number | boolean>(
  container: HTMLElement,
  options: readonly ChipOption<T>[],
  current: T,
  onSelect: (value: T) => void,
): void {
  mount(
    container,
    options.map(([value, label]) =>
      h(
        'button',
        { class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(value === current), on: { click: () => onSelect(value) } },
        label,
      ),
    ),
  );
}
