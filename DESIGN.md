---
name: AUVP Carteira
description: A ledger of seven asset classes on AUVP near-black, each row stating how far it sits from its meta.
colors:
  ground: "#12110e"
  surface: "#1a1915"
  surface-raised: "#23211c"
  hairline: "#2f2c25"
  hairline-strong: "#423e34"
  ivory: "#efeae0"
  muted: "#a39c8e"
  faint: "#8f887b"
  gold: "#d9a852"
  gold-hover: "#e6b75f"
  gold-soft: "rgb(217 168 82 / 0.14)"
  gold-ink: "#1c1406"
  danger: "#ec7465"
  danger-soft: "rgb(236 116 101 / 0.12)"
  ok: "#7ccf9a"
  class-acoes-nacionais: "#57c9a0"
  class-acoes-internacionais: "#6cb8e8"
  class-fiis: "#e3cb5a"
  class-reits: "#e07fc8"
  class-cripto: "#8597f2"
  class-renda-fixa: "#e8964f"
  class-renda-fixa-internacional: "#b9a0ee"
typography:
  display:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  figure-input:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    fontFeature: "tnum"
  title:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  body:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  column-head:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  bar: "3px"
  sm: "4px"
  control: "8px"
  container: "12px"
  dialog: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#210805"
    rounded: "{rounded.control}"
    height: "36px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "38px"
  money-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ivory}"
    typography: "{typography.figure-input}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "52px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.gold}"
  ledger-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ivory}"
    padding: "0 20px"
    height: "60px"
  ledger-row-hover:
    backgroundColor: "{colors.surface-raised}"
  side-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.container}"
    width: "min(420px, calc(100vw - 32px))"
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dialog}"
    width: "560px"
  nota-badge:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ivory}"
    rounded: "5px"
    height: "22px"
---

# Design System: AUVP Carteira

## Overview

**Creative North Star: "The Class Ledger"**

The wallet reads as an accountant's ledger lit by one gold lamp. A warm near-black ground carries ivory text and hairline rules; seven asset classes sit as rows, each stating its value, its current share, a bar with a gold meta tick, and its drift in percentage points. Gold is scarce on purpose: it marks where the investor is headed (metas), what to do next (primary actions), what is selected, and what this month's aporte adds. Everything else stays ivory, muted or faint.

Density is high but calm. Rows are 60px for classes and 42px for holdings, figures are tabular and right-aligned, and structure comes from 1px hairlines rather than boxes. Editing never leaves the ledger: an asset editor or the aporte plan opens in a single right panel that floats over the page without reflowing it, and only two jobs (adding an asset, importing CSV) take a native modal dialog.

The world is AUVP's: the original horizontal AUVP logo and favicon, gold on near-black, set in Geist rather than AUVP's legacy Montserrat.

**Key Characteristics:**
- Warm near-black ground with two tonal raised layers; no cards inside cards.
- Gold reserved for metas, primary actions, selection and aporte figures.
- Every figure in tabular numerals.
- Seven muted class hues as small swatches, always beside a text label.
- One floating right panel at a time, never reflowing the page; native `<dialog>` for add and import.
- Hairline rules (1px) as the main structural device; 8px control radius, 12px container radius.

## Colors

A warm, low-chroma dark palette with one gold accent and seven class hues that never appear without their names.

### Primary
- **AUVP Gold** (`gold`): meta ticks and meta percentages, primary buttons, the active tab underline, selected chips and rows, focus rings, the hatched aporte extension, and every aporte figure (plan total, per-asset aporte, "+R$" gap notes). Hover lifts to **Lamp Gold** (`gold-hover`). Text on gold is **Gold Ink** (`gold-ink`).
- **Gold Wash** (`gold-soft`): selected holding row, selected chip fill, focus halo around inputs.

### Secondary (class hues)
- **Ações Nacionais Jade**, **Ações Internacionais Sky**, **FII Straw**, **REIT Orchid**, **Cripto Periwinkle**, **Renda Fixa Amber**, **Renda Fixa Internacional Lilac** (`class-*`): 10px swatches (3px radius) beside the class name and as the fill of each class's meta bar. Mapped in `domain.ts`; never used for text, buttons or state.

### Tertiary (status)
- **Coral** (`danger`) with **Coral Wash** (`danger-soft`): destructive actions, negative notas, validation errors, metas that do not sum to 100%.
- **Sage** (`ok`): "na meta", completed plan lines, success toasts, metas summing to 100%.

### Neutral
- **Ledger Night** (`ground`): page background, input wells, expanded holdings band.
- **Raised Umber** (`surface`): ledger table, aporte card, side panel, modal.
- **Upper Umber** (`surface-raised`): row hover, secondary buttons, toasts, nota badges, bar tracks.
- **Hairline** (`hairline`) and **Strong Hairline** (`hairline-strong`): row dividers and container borders; control and panel borders.
- **Ivory** (`ivory`): primary text and figures. **Muted** (`muted`): labels, column heads, secondary text. **Faint** (`faint`): counts, hints, footnotes, placeholders.

### Named Rules
**The Gold Lamp Rule.** Gold marks only metas, primary actions, selection and aporte figures. If a gold element is none of these, it is wrong.

**The Named Hue Rule.** A class hue never stands alone: every swatch or bar fill sits in the same row as the class's text label.

## Typography

**Display Font:** Geist Variable (with system-ui, sans-serif)
**Body Font:** Geist Variable
**Label Font:** Geist Variable

**Character:** One modern grotesque at several weights; hierarchy comes from weight (500 to 700) and size, not from a second family.

### Hierarchy
- **Display** (700, 1.875rem, 1.15, -0.01em): patrimônio total only.
- **Headline** (700, 1.375rem to 1.75rem, 1.2 to 1.25): card and panel titles (Aporte do mês, asset ticker in the panel), page titles on Metas and Perguntas (1.625rem), connect screen (1.75rem).
- **Figure input** (700, 1.5rem, tabular): the aporte amount and the plan total.
- **Title** (700, 1.125rem): section heads such as "Classes de ativos"; fieldset heads at 0.95rem.
- **Body** (400, 15px root, 1.5): running text; hints cap at 62 to 75ch.
- **Label** (600, 0.8125rem, muted): field labels, summary terms, chips.
- **Column head** (600, 0.75rem, 0.02em tracking, muted, sentence case): ledger and metas table heads.

### Named Rules
**The Tabular Figure Rule.** Every number (R$, %, p.p., quantities, notas, counts) uses `font-variant-numeric: tabular-nums` and right-aligns in its column.

## Layout

A centered column, max 1320px, padded 28px 24px 64px (20px 16px 96px under 640px). The Carteira screen is a grid: an overview row (aporte card 2fr beside a 260px-min summary 1fr, 20px gap), then the class ledger. The right panel never takes a column: it is a fixed overlay (top 72px, right and bottom 16px) above the unchanged layout, and becomes a full-screen sheet at 640px and below. Under 900px the overview stacks and ledger rows reflow into a three-line card (name and value, bar, atual / meta / drift) with inline "Atual" and "meta" labels replacing the hidden column heads. Metas and Perguntas use a narrower 960px page.

Spacing is a loose 4px rhythm dominated by 8, 14, 20 and 24px; row padding is 20px inline on desktop, 16px on mobile. The top bar is 60px, sticky, translucent ground with a 10px blur.

## Elevation & Depth

Depth is tonal first: ground, surface, raised surface, separated by hairlines. Shadows appear only on things that float above the ledger: the right panel, the native modal, toasts and the sticky metas footer.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.55), 0 2px 6px rgb(0 0 0 / 0.3)`): side panel, modal, toast, sticky metas footer.
- **Focus halo** (`box-shadow: 0 0 0 3px gold-soft`): text inputs, search and money field on focus.
- **Tick knockout** (`box-shadow: 0 0 0 2px surface`): separates the gold meta tick from the bar fill beneath it.

### Named Rules
**The Overlay Panel Rule.** The layout never reflows for the right panel. It floats above the ledger and summary, which keep their width and stay usable underneath.

**The Flat Ledger Rule.** Nothing in the ledger column casts a shadow. Only floating layers (panel, dialog, toast, sticky footer) do.

## Shapes

Gently rounded, never soft. Controls (buttons, inputs, stepper, toast) use 8px; containers (ledger table, aporte card, summary, panel, goals, questions list) use 12px; the modal 14px; chips are pills; bars and swatches 3px; nota badges 5px. Borders are 1px hairlines everywhere. The meta tick is a 3px gold rule overshooting the 10px bar by 5px top and bottom; the aporte extension is a -45deg gold hatch (2px gold, 3px gold at 25%).

## Components

### Buttons
Compact and firm: 36px tall (30px small, 52px beside the money field), 600 weight, 0.875rem.
- **Shape:** 8px radius, 1px border.
- **Primary:** gold fill, gold-ink text. One per region (Calcular/Recalcular, Salvar alterações, Confirmar compras). Disabled primary drops to the secondary look with faint text rather than a faded gold.
- **Secondary:** raised surface, strong hairline border, ivory text; hover brightens the border to muted.
- **Ghost:** transparent, muted text; hover shows the border and ivory text.
- **Danger:** coral fill for confirmed deletes; plain coral text with a trash icon for the entry point.
- **Press:** translateY(1px). Transitions 150ms on the house ease.
- **Icon buttons:** 34px square (24px small), transparent, muted, raised-surface hover. Icons are Lucide SVG.

### Chips
- **Style:** 32px pill, strong hairline border, muted 0.8125rem/600 text, optional faint count.
- **State:** pressed or selected turns gold wash, gold border, gold text.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** surface, or no fill (summary) with hairline border.
- **Shadow Strategy:** none (see Flat Ledger Rule).
- **Border:** 1px hairline.
- **Internal Padding:** 24px (18px under 640px).

### Inputs / Fields
- **Style:** ground-filled well, strong hairline border, 8px radius, 38px tall; labels above in label style.
- **Focus:** gold border plus 3px gold-wash halo.
- **Error / Disabled:** coral border with coral 0.8125rem message below; hints in faint.
- **Money field:** 52px well with a muted "R$" prefix and a 1.5rem/700 tabular amount.
- **Stepper:** minus / quantity / plus inside one 8px-radius bordered group.
- **Checkbox and range:** native, accent gold; range thumb ivory with a gold ring.

### Navigation
Sticky 60px top bar: logo (16px tall) plus muted product name, then text tabs (600, muted; hover and current ivory). The current tab carries a 2px gold underline flush with the bar's bottom hairline. Session controls sit right as icon buttons. Under 640px the product name and user name hide and tabs tighten to 8px padding.

### Class Ledger Row (signature)
Grid of class name (swatch, label, faint count, chevron), value, the meta bar, atual %, meta % in gold, and drift. The meta bar is a 10px raised track with the class-hue fill and a gold meta tick; after a calculated aporte, a hatched gold extension grows from the fill end (600ms) showing how much of the gap this month closes, and the atual cell gains a small gold "-> new %" line. Drift shows an arrow and signed p.p. (ivory under, muted over, sage on target) with a 0.75rem gap note beneath. Expanding a row reveals holdings on a ground-colored band, indented 66px; the selected holding takes the gold wash.

### Right Panel
One panel, shared by the asset editor and the aporte plan; opening one replaces the other. It floats over the page at every desktop width: fixed at top 72px, right 16px, bottom 16px, width up to 420px (never wider than the viewport minus 32px), surface, strong hairline, 12px radius, Float shadow, slides in 16px over 260ms. No backdrop: the page underneath stays interactive, so selecting another holding swaps the panel content. At 640px and below it becomes a full-screen sheet with no radius or border. Head (title, class line, meta info) and foot (actions) are fixed; the body scrolls. Primary action spans the foot in the plan.

### Modal Dialog
Native `<dialog>` for "Adicionar ativo" and CSV import only. 560px max, 14px radius, surface, Float shadow, backdrop ground at 72% with 3px blur, pops in at 98% scale over 220ms.

### Nota Badge
22px tabular badge: raised surface with ivory text for scored assets, coral wash and coral text for notas at or below zero.

## Do's and Don'ts

### Do:
- **Do** use gold only for metas, primary actions, selection and aporte figures (The Gold Lamp Rule).
- **Do** set every figure in tabular numerals, right-aligned.
- **Do** pair every class hue with its text label.
- **Do** open asset editing and the aporte plan in the single floating right panel, one at a time, leaving the layout beneath unchanged (The Overlay Panel Rule).
- **Do** use native `<dialog>` for adding an asset and importing CSV.
- **Do** separate rows with 1px hairlines and lift floating layers only with the Float shadow.
- **Do** honor `prefers-reduced-motion`; motion uses `cubic-bezier(0.16, 1, 0.3, 1)` at 150 to 600ms.

### Don't:
- **Don't** identify an asset class by color alone.
- **Don't** put a card inside a card; nest with tonal bands and hairlines instead.
- **Don't** use gold for decoration, status or class identity.
- **Don't** open modals for edits that the right panel can hold.
- **Don't** resize or reflow the ledger, summary or aporte card when the right panel opens.
- **Don't** replace the original AUVP logo or favicon, or swap Geist for Montserrat.
