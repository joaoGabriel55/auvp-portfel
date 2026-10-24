# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript. Standalone local app (localhost) that talks directly to the real AUVP backend (`https://ferramentas-backend.auvp.com.br`, CORS `*`) using the user's Bearer token from `localStorage["auvp-web@token"]` on ferramentas.auvp.com.br.

## Users

AUVP students (Brazilian retail investors, pt-BR) managing a long-term buy-and-hold wallet with the "Diagrama do Cerrado" method. Typical session: once a month, they decide where this month's contribution (aporte) goes, record purchases, and occasionally re-score assets. Wallets are large: the reference account holds 121 assets across 5 classes.

The deliverable is a **pitch to the AUVP team**: a redesign that could plausibly replace the current `/carteira` page.

## Product Purpose

Make the wallet easy to read (what do I own, how far am I from my targets) and easy to write (add an asset, record a buy/sell, score an asset, run the monthly aporte) without losing any capability of the current page.

## Positioning

The Diagrama do Cerrado: each asset gets a "nota de força" (-10..10) from a yes/no questionnaire; class targets (metas) plus notas drive a server-side contribution suggestion. Only assets with nota > 0 enter the calculation.

## Operating Context

- Asset classes: `acoes_internacionais`, `acoes_nacionais`, `fundos_imobiliarios`, `reits`, `criptomoedas`, `rendafixa`, `rendafixa_internacional`.
- Investor profile from `/users/classification` (Conservador / Moderado / Arrojado).
- Currency: values stored in BRL; dollar quote from `/config/dollar-quote`.
- Diagram questions: two diagrams, `diagrama-do-cerrado` (stocks) and `investimentos-imobiliarios` (FIIs).

## Capabilities and Constraints

API surface (relative to backend base URL):

- `GET /auth/me` — user, `assets[]` (`_id, assetId, name, type, amount, value` = total position in BRL, `strength`, `diagramResponses[]`, `alocation`, `updatedAt`), `investimentGoals[]` (`type, value` %), `diagramQuestions[]` (`_id, criterias, question, diagram`).
- `GET /users/classification`, `GET /config/dollar-quote`.
- Assets: `POST users/assets`, `POST users/assets/many`, `PATCH users/assets/:id`, `DELETE users/assets/:id`, `DELETE users/assets?type=`, `PATCH users/assets/:id/input {value}` (buy), `PATCH users/assets/:id/sell-input {value}` (sell), `PATCH users/assets/:id/diagram {responses, strength}`, `GET assets/sugestions?type=&search=` (ticker autocomplete), `GET assets/:assetId/force-strength`.
- Goals: `PATCH users/:userId {investimentGoals}`; must sum to 100%.
- Aporte: `POST users/suggestions {value}` → `[{assetId, suggestionQuantity, suggestionValue}]`.
- Questions: `POST/PATCH/DELETE /wallets/diagrams[/:id]`, `POST /wallets/diagrams/:id/restore`, `PATCH /wallets/diagrams/autofill/:id`.
- Out of scope for v1: the Mapa (country map) section, xlsx import/export.
- Reloading the AUVP tab can expire the session; the app must handle 401 by asking for a fresh token.

## Brand Commitments

AUVP: yellow accent (#F5C451) on neutral near-black (#141414), matching AUVP Minhas Finanças (2026-10-24). Typeface: Geist (user asked for a more modern face than AUVP's Montserrat, 2026-10-24). The pitch should read as AUVP, not as a third-party product. Uses the original AUVP horizontal logo (cdn.asupernova.com.br/auvp-navbar/AUVP_HORIZONTAL.svg) at the user's request (2026-10-24). Favicon is the logo eye in off-white on #141414 (public/favicon.svg).

## Evidence on Hand

The user's real wallet (live via API). No testimonials, metrics or usage data; do not fabricate any.

## Product Principles

1. The monthly aporte is the hero workflow; everything else supports it.
2. Show distance from target, not just raw totals.
3. Every write is explicit, reversible where the API allows, and confirmed with the resulting numbers.
4. Dense but calm: 100+ rows must stay scannable.

## Accessibility & Inclusion

WCAG AA contrast; asset classes never identified by color alone; full keyboard use for forms and tables.
