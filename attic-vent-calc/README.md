# Attic Vent Calc

Interactive attic ventilation calculator for IRC R806 and manufacturer net
free area (NFA) — soffit, ridge, gable, turbine, dome, and solar vents.

Pick a house style, enter attic dimensions, and the calculator works out
required intake/exhaust NFA against the 1/150 (or 1/300 exception) code
ratio, flags shortfalls, and suggests vents to close the gap.

## Stack

TanStack Start (React 19) + Tailwind CSS v4, with a Zustand store for the
in-progress job and Vitest-free `node --test` unit tests for the
ventilation math (`src/lib/ventilation`). Auth and database wiring
(better-auth, PGLite) ship in the template but are disabled for this app
(see `.grok/app-env.json`) — the calculator itself has no accounts and no
persistence beyond `localStorage`.

## Development

```bash
npm install
npm run dev        # http://localhost:8080
npm run typecheck
npm run lint
npm test
npm run build
```
