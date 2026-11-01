/** Minimal typed event emitter. `on` returns an unsubscribe function. */
export class Emitter<E extends { [K in keyof E]: unknown }> {
  private handlers: { [K in keyof E]?: Set<(payload: E[K]) => void> } = {};

  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void {
    const set = (this.handlers[event] ??= new Set());
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.handlers[event]?.forEach((h) => h(payload));
  }
}
