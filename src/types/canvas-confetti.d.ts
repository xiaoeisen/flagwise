declare module "canvas-confetti" {
  export type GlobalOptions = {
    resize?: boolean
    useWorker?: boolean
  }

  export type Options = {
    particleCount?: number
    spread?: number
    startVelocity?: number
    origin?: { x?: number; y?: number }
    zIndex?: number
  }

  export type CreateTypes = {
    (options?: Options): void
    reset(): void
  }

  const confetti: ((options?: Options) => void) & {
    create(canvas: HTMLCanvasElement, options?: GlobalOptions): CreateTypes
  }

  export default confetti
}
