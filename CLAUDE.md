# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A redesign of the AUVP `/carteira` page, made as a pitch to the AUVP team. It is a Vite + React 19 + TypeScript app in `app/` that talks **directly to the real AUVP backend** (`https://ferramentas-backend.auvp.com.br`) with the user's own Bearer token. Every write changes the user's real wallet; there is no mock or staging backend.

- `PRODUCT.md`: users, product principles, and the full AUVP API surface the app relies on. Read it before touching `api.ts` or adding features.
- `DESIGN.md` (+ `.impeccable/design.json`): the design system (tokens, components, do's and don'ts). Follow it for any UI change.
- `.impeccable/` scratch (screenshots, logs) and `/tools/*` are gitignored.

## Commands

Run from `app/`:

```sh
npm install
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build (this is the type-check)
npm run lint      # oxlint
```

There is no test runner. Verify changes with `npm run build` and by running the app.

## Architecture (app/src)

- **Auth**: there is no login. The token comes from the user's ferramentas.auvp.com.br session (`localStorage["auvp-web@token"]` there). It arrives through a bookmarklet (`Connect.tsx`) as a `#token=` URL fragment that `App.tsx` reads at module load, or is pasted by hand. It is stored in `localStorage["auvp-token"]`. A 401 throws `AuthError`, which clears the token and returns to `Connect`.
- **Data flow**: `App.tsx` owns the single `User` from `GET /auth/me`, which holds assets, goals and diagram questions. Pages (`Carteira`, `Metas`, `Perguntas`) get `user` plus a `run(fn, okMsg)` callback. `run` performs a mutation, shows a toast, then reloads `/auth/me`. Mutations go through `run`; there is no local optimistic state.
- **api.ts**: the typed `api` object of all backend calls. Asset `value` is the total position in **BRL**. `buy`/`sell` are server-side increments.
- **Currency**: data always stays in BRL. `display` in `domain.ts` is a mutable module-level object that `App` sets before each render. The `fmt` money formatters divide by `display.rate`. FX rates come from AwesomeAPI.
- **i18n** (`i18n.tsx`): the pt-BR string **is** the key, and `locales/en.ts` / `locales/es.ts` map it to translations. `t()` handles `{var}` placeholders and `tx()` takes React-node placeholders. The language is resolved once at module load, so switching languages reloads the page. Any new UI string needs entries in both `en.ts` and `es.ts`; missing keys log a console warning in dev.
- **domain.ts**: `CLASSES`, the 7 asset classes with label, short code, CSS color var, which diagram scores them, and `fixed` for renda fixa. It also holds the formatters.
- **Styling**: one global `index.css` with CSS custom properties (`--gold`, `--c-<class>` and others). No CSS framework. Tab changes use the View Transitions API (`html[data-nav]` sets the direction).
- Icons come from `lucide-react`, which has no brand icons.
