# Flagwise

A flag quiz for 197 countries. Six game modes, a daily challenge, a learn gallery, saved stats, and full offline play as an installable app.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then build the PWA into `dist/` |
| `npm run preview` | Serve `dist/` locally (needed to try the service worker) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:layers` | Fail if a layer imports something it should not |
| `npm run build:artifact` | Single-page build into `dist-artifact/` |
| `npm run assets:flags` | Re-copy and optimize flag SVGs from `flag-icons` |
| `npm run assets:icons` | Re-render PWA icons from `public/icons/icon.svg` |

Deploy `dist/` to Netlify, Vercel, Cloudflare Pages or GitHub Pages. It is plain static files.
If you host under a sub-path, set `base` in `vite.config.ts` and `start_url` in the manifest.

## Modes

Classic (pick from four), Type it (typos forgiven, autocomplete), Three lives, Blitz (60 seconds, misses cost 3 seconds),
Daily (same ten flags for everyone, seeded by date), Missed flags (replay what you got wrong).
Settings: region, 10/20/50/all questions, random or look-alike answer choices.

## Layout

```
src/
  domain/      pure game rules and data (no DOM, no storage)
    data/countries.ts   the 197 countries
    game.ts             GameSession state machine
    matching.ts         typed-answer checking, autocomplete, search
    selection.ts        weighted question order, answer choices
    progress.ts         mastery, review list, daily streak
    lookalikes.ts       confusable flag groups
  app/         AppController: use cases, persistence, events
  services/    storage, theme, clock, PWA adapters
  components/ui/ reusable React UI components (shadcn-compatible)
  lib/         shared UI utilities
  ui/          router, shell, views, components
  styles/      tokens, base, layout, game, views (CSS custom properties, light and dark)
public/        flags/ (197 SVGs) and icons/
scripts/       asset builders and the layer checker
docs/ARCHITECTURE.md
```

The project uses Vite, TypeScript, React for reusable UI components, and Tailwind CSS. The shadcn component path is `src/components/ui` (the `@/components/ui` alias). Keeping generated UI components there lets shadcn's CLI and imports use the standard location. For another Vite project, initialize shadcn with `npx shadcn@latest init`; new components can then be added with `npx shadcn@latest add <component>`.

Read `docs/ARCHITECTURE.md` for the layer rules, data flow and how to add a mode.

## Credits

Flag artwork from [flag-icons](https://github.com/lipis/flag-icons) (MIT). Capitals follow common convention; contested cases
(Palestine, Bolivia, Israel) use the most widely listed seat.
