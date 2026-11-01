# Flagwise architecture

Flagwise is a static single-page app: TypeScript, Vite, no runtime framework. The design goal is that the
rules of the game can be read, tested and changed without opening a browser.

## Layers

```
        ┌────────────────────────────────────────────┐
  ui    │ views · components · router · shell · dom   │  renders state, forwards user input
        └──────────────────────┬─────────────────────┘
                               │ calls methods, listens to events
        ┌──────────────────────▼─────────────────────┐
  app   │ AppController · Emitter                     │  use cases, persistence, round lifecycle
        └───────┬──────────────────────────┬─────────┘
                │                          │
        ┌───────▼────────┐        ┌────────▼─────────┐
 domain │ game · matching│        │ services          │  adapters: storage, theme, clock, PWA
        │ selection ·    │◄───────┤ implement ports   │
        │ progress · data│ types  └───────────────────┘
        └────────────────┘
```

**Dependency rule:** arrows point inward. `domain` imports nothing from the other layers and never touches
`document`, `window` or `localStorage`. `app` never imports `ui`. `npm run check:layers` fails the build
when either rule is broken.

| Layer | Folder | Responsibility |
|---|---|---|
| Domain | `src/domain` | Pure rules. Country catalog, answer matching, question selection, spaced repetition, the `GameSession` state machine, daily seeding. Deterministic given an injected `Rng` and `Clock`. |
| Application | `src/app` | `AppController` holds prefs, progress and the active round. It applies domain rules, saves through a `StoragePort`, and publishes events (`question`, `answered`, `tick`, `finished`, `change`). |
| Services | `src/services` | Adapters for the outside world: `BrowserStorage` and `MemoryStorage` (both implement `StoragePort`), theme, system clock, service-worker registration. |
| UI | `src/ui` | `dom.ts` element factory, hash `Router`, one class per screen under `views/`, shared `components/`. Views render controller state and forward input; they contain no game rules. |

## Data flow for one answer

1. Player taps an option. `PlayView` calls `controller.chooseOption(code)`.
2. `GameSession.answerChoice` updates score, run, lives and the blitz clock, and returns an `AnswerRecord`.
3. `applyAnswer` (pure) returns the new `Progress`. The controller saves it through the storage port.
4. The controller emits `answered`. `PlayView` colors the options and shows feedback.
5. On the last question `next()` finishes the round, computes records and daily results, and emits `finished`. The router shows `ResultsView`.

State only moves one way: input → controller → domain → controller → events → views.

## Key decisions

- **Injected randomness and time.** Everything random takes an `Rng`; anything time-based takes a `Clock`. The daily challenge is
  `mulberry32(hash("flagwise:" + localDate))`, so every device shows the same ten flags without a server.
- **Pure progress updates.** `applyAnswer` returns a new object, which keeps persistence simple and makes undo or sync possible later.
- **Spaced repetition by weight.** Missed flags are weighted 4, unseen 2, seen 1.5, mastered 0.4 (`selection.ts`). A flag is mastered after two correct answers in a row. Questions are drawn with a weighted shuffle without replacement.
- **Versioned storage.** Snapshots carry `version: 2`. `BrowserStorage` migrates the v1 key (`flagwise-v1`) so early players keep their progress. Add a new migration function when the shape changes.
- **Hash routing.** Only `#home`, `#play`, `#results`, `#learn`, `#stats`. Works on any static host and inside sandboxed frames. A guard sends `#play` and `#results` home when no round exists.
- **No framework.** The UI is about 800 lines. `h()` builds elements and always inserts text as text nodes, so country names or typed input can never become markup.

## Offline and PWA

`vite-plugin-pwa` generates a Workbox service worker that precaches the app shell and all 197 flag SVGs (about 1.3 MB).
After the first visit the quiz runs with no network. Updates install in the background (`registerType: autoUpdate`).
Google Fonts are cached at runtime; without them the UI falls back to system fonts.

## Build targets

| Command | Output | Use |
|---|---|---|
| `npm run build` | `dist/` | Installable PWA for any static host |
| `npm run build:artifact` | `dist-artifact/` | One HTML fragment plus `flags/`, for hosts that sandbox pages |

The artifact build aliases `virtual:pwa-register` to `services/pwa-stub.ts`, so no service worker is registered there.

## Extending

- **New game mode:** add the id to `ModeId`, build its queue in `AppController.start`, add rules to `GameSession` if it needs any,
  and add a card to `MODES` in `views/home.ts`.
- **New country or alias:** edit `src/domain/data/countries.ts`, then run `npm run assets:flags` to fetch its flag.
- **New look-alike group:** add a row to `GROUPS` in `domain/lookalikes.ts`.
- **Backend later:** implement `StoragePort` against an API and pass it to `AppController` in `ui/app.ts`. Nothing else changes.
  Server-side daily seeds and leaderboards would replace the local seed in `AppController.start`.

## Not covered yet

No automated unit tests are included. The domain layer is written so they are cheap to add (Vitest with `MemoryStorage`,
a fake `Clock` and a seeded `Rng`). The most valuable first targets are `matching.ts`, `selection.ts` and `GameSession`.
