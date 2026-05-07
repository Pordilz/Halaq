# Halaq — Design System Reference

This document is the source of truth for Halaq's UI. Every new page, component, or
feature must match the rules below. The goal is a **calm, premium, professional**
product that feels trustworthy to a Muslim investor making compliance-sensitive
decisions.

> **Non-negotiables**
>
> - Mobile-first. Every screen must look correct on a 375 px viewport before it
>   ships on desktop.
> - **No emojis** anywhere — UI text, illustrations, logos, badges, copy. Use the
>   `MaterialIcon` component or hand-tuned inline SVGs.
> - **No "sparkle/star" placeholder logo.** Use the `<Logo />` component which
>   renders the crescent + chart-bars mark from `/public/favicon.svg`.
> - **No floating, infinitely-animating decorations.** Subtle hover/focus
>   transitions are fine; perpetual motion (`floatBadge`, `gentleSway`,
>   `glowPulse`) is banned because it looks janky on low-end devices.

---

## 1. Brand voice

| Property      | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Personality   | The Trusted Scholar — knowledgeable, calm, clear, never preachy        |
| Tone          | Plain English. Short sentences. No jargon without definition.          |
| Audience      | Muslim retail investor, age 22–55, varying levels of finance knowledge |
| Anti-patterns | Hype words, emojis, exclamation marks, urgency tactics                 |

---

## 2. Colour system

All colours live as CSS variables in `src/index.css`. **Never hardcode hex.**

| Role             | Variable                            | Hex      | Usage                                  |
| ---------------- | ----------------------------------- | -------- | -------------------------------------- |
| Primary          | `--color-primary`                   | `#1a6b47` | Action, focus, brand                  |
| Primary cont.    | `--color-primary-container`         | `#22875a` | Gradients, hover                      |
| Secondary (gold) | `--color-secondary`                 | `#8a6500` | Sector chips, accents                 |
| Tertiary         | `--color-tertiary`                  | `#006837` | Compliant state                       |
| Caution          | `--color-caution`                   | `#92400e` | Doubtful state                        |
| Error            | `--color-error`                     | `#b91c1c` | Non-compliant state, destructive      |
| Surface          | `--color-surface`                   | `#f8f9fb` | Page background                       |
| Surface lowest   | `--color-surface-container-lowest`  | `#ffffff` | Cards, panels                         |
| On-surface       | `--color-on-surface`                | `#0f1a27` | Body text (NEVER `#000`)              |
| On-surface var.  | `--color-on-surface-variant`        | `#3a4a5c` | Secondary text                        |
| Outline          | `--color-outline`                   | `#627080` | Tertiary text                         |
| Outline var. 15% | `--color-outline-variant-15`        | rgba    | Hairline dividers                     |

State colours map 1:1 to compliance status:
- COMPLIANT → tertiary
- DOUBTFUL → caution
- NON_COMPLIANT → error

---

## 3. Typography

Family: `Manrope` (variable, 400/500/600/700/800).

| Token            | Size       | Weight | Use                                |
| ---------------- | ---------- | ------ | ---------------------------------- |
| `--text-display` | 3.5 rem    | 800    | Landing hero only                  |
| `--text-h1`      | 2.5 rem    | 800    | Page titles                        |
| `--text-h2`      | 1.75 rem   | 700    | Section titles, card heroes        |
| `--text-h3`      | 1.375 rem  | 600    | Sub-section titles                 |
| `--text-body-lg` | 1 rem      | 400    | Body copy                          |
| `--text-body-sm` | 0.875 rem  | 400/500 | Compact body, list items          |
| `--text-label`   | 0.75 rem   | 600    | Uppercase eyebrows                 |
| `--text-micro`   | 0.625 rem  | 600    | Tags, status chips                 |

Tabular numbers: any column of numeric data must use
`font-variant-numeric: tabular-nums` (`.tabular-nums` utility) so digits align.

---

## 4. Spacing

8 px base scale via `--space-*` variables. **Never** invent ad-hoc px values
inside components. Common rhythm:

- Inside cards: `var(--space-5)` (20 px) → `var(--space-6)` (24 px)
- Between sections: `var(--space-6)` → `var(--space-8)`
- Edge padding (mobile): `var(--space-5)`
- Edge padding (desktop): `var(--space-6)` to `var(--space-10)`

---

## 5. Radii & shadows

| Radius           | Value      | Use                                   |
| ---------------- | ---------- | ------------------------------------- |
| `--radius-md`    | 8 px       | Inline chips, ticker badges           |
| `--radius-lg`    | 12 px      | Buttons inside lists, dropdowns       |
| `--radius-xl`    | 16 px      | Form inputs, dropdown menus           |
| `--radius-2xl`   | 24 px      | Cards, panels                         |
| `--radius-3xl`   | 32 px      | Hero cards, large surfaces            |
| `--radius-full`  | pill       | Buttons, chips, dots                  |

Shadows are **whisper-soft**:

- `--shadow-standard` for resting state
- `--shadow-floating` for elevated/modal state

Never combine card shadows with other card shadows nested inside — pick one.

---

## 6. Buttons (`src/index.css`)

Use the `.btn` system. **Do not write inline button styles.**

| Class             | Height | Use                                            |
| ----------------- | ------ | ---------------------------------------------- |
| `.btn` (default)  | 48 px  | Default action                                 |
| `.btn--lg`        | 56 px  | Hero CTAs                                      |
| `.btn--sm`        | 36 px  | Compact / table actions                        |
| `.btn--block`     | full   | Stretch container width                        |

| Variant           | Use                                            |
| ----------------- | ---------------------------------------------- |
| `.btn-primary`    | Primary action (gradient)                      |
| `.btn-secondary`  | Secondary action                               |
| `.btn-ghost`      | Tertiary, low-emphasis                         |
| `.btn-outline`    | On surfaces where ghost is too quiet           |
| `.btn-danger`     | Destructive                                    |
| `.btn-on-glass`   | On dark / coloured surfaces (e.g. hero card)   |

Rules:

- Text and icons are vertically centred via flex; never absolute-position text
  inside a button.
- Always include a visible `:focus-visible` ring (`outline: 3px solid rgba(26,107,71,.35)`).
- Disabled state: `opacity: 0.55` + `cursor: not-allowed`. No hover effect.

---

## 7. Component primitives

### Card panel
Background `--color-surface-container-lowest`, radius `--radius-2xl`, shadow
`--shadow-standard`. Sectioned content uses internal hairlines (1 px
`--color-outline-variant-15`), not nested cards.

### List panel (e.g. Screener results, Watchlist, Profile settings)
- One outer card.
- Each row is full-bleed with horizontal padding `var(--space-5)` / `var(--space-6)`.
- Rows are separated by 1 px hairlines, not gaps and not double-shadows.

### Status badge
Use `<ComplianceBadge status>` for compliance state. Never inline.

### Empty state
Centered icon (40–48 px) in a 5 rem circle, h3 title, body copy 28 rem max,
optional CTA. Pad with `var(--space-10)` vertically.

### Skeleton
Use `.skeleton-block` (animated pulse) sized to the real content's footprint so
layout doesn't shift.

---

## 8. Iconography

- **`MaterialIcon`** for all UI icons. `name` is a Material Symbol identifier.
- **`Logo`** for the brand mark — never reproduce the SVG inline.
- **Bespoke illustrations** (onboarding, empty states) live in
  `src/components/illustrations/` as React components returning inline SVGs with
  `currentColor` so they inherit theme colours.
- No emoji anywhere — that includes copy strings.

---

## 9. Motion

Allowed:
- `200ms cubic-bezier(0.4, 0, 0.2, 1)` for hover, focus, active, and entrance.
- `300ms ease-out` for tab switches and modal entrances.
- One-shot entrance on first paint via `animate-entrance`.

Banned:
- Infinite loops (`floatBadge`, `gentleSway`, `glowPulse`, `pulse-shimmer` is fine
  for skeletons only).
- Auto-playing carousels.
- Parallax on scroll.

Honour `prefers-reduced-motion: reduce` — wrap any non-essential animation in
that media query off.

---

## 10. Accessibility

- All interactive elements have a visible `:focus-visible` ring.
- Tap targets are ≥ 44×44 px on mobile.
- Colour is **never** the only signal — pair it with an icon or label
  (e.g. compliance badges include both a colour and an icon).
- Body copy is at least `var(--text-body-sm)`. Micro text is reserved for
  category eyebrows and tags.
- Provide `aria-label` for icon-only buttons.
- Forms: every input has a visible `<label>` (or `aria-label` when paired with
  an obvious icon, e.g. search).

---

## 11. Page anatomy

Every authenticated page in the app follows this rhythm:

```
[Page hero]            ← h1, optional sub, optional inline CTA
[Primary panel]        ← the page's main job
[Secondary panel(s)]   ← supporting info, sticky on desktop
[Disclaimer]           ← compact, only where compliance advice appears
```

Standard padding: `padding: var(--space-2) var(--space-5) var(--space-12)` on
mobile, expanding via `.container` on desktop.

---

## 12. Layout chrome

- **Top bar (desktop):** logo, primary nav left; user avatar + notifications
  right. **No global search input** — searching lives in the Screener page.
- **Bottom nav (mobile):** four primary destinations only. Profile is the
  rightmost tab.
- **Sidebar (desktop):** primary nav + premium-tools group + brand footer.
- A **skip link** appears for keyboard users at the very top of every page.

---

## 13. Forms

- Inputs are 48 px tall, 16 px horizontal padding, radius `--radius-xl`.
- Background is `--color-surface-container`; on focus → `lowest` with primary
  border + 4 px primary halo.
- Errors live in a small banner above the field group, not inline next to
  inputs (avoids layout shift).
- `<button type="submit">` is the last child of the form; never two competing
  primaries.

---

## 14. Compliance UI rules

1. Compliance status appears as a `ComplianceBadge` (icon + label + colour) and
   never colour alone.
2. Always pair a status with a one-line plain-English reason.
3. Show the methodology being applied (AAOIFI, S&P, etc.).
4. Show the source data period (e.g. "as of 2024-09-28") so the user knows
   how fresh the verdict is.
5. Always link out to `SHARIAH.md` (or its rendered equivalent in `/learn`)
   for "How we determine halal".
6. The disclaimer "Guidance only — not a fatwa" appears on every detail
   surface.

---

## 15. Performance

- Each route is `React.lazy`-loaded.
- Total **initial JS** budget: **75 KB gzipped** (currently ~65 KB).
- Total **initial CSS** budget: **10 KB gzipped** (currently ~6 KB).
- Material Symbols font is loaded `media="print" onload` so it doesn't block
  first paint.
- API responses for screen + search use `s-maxage` on the edge with
  `stale-while-revalidate` so repeat visits feel instant.

---

## 16. Adding a new page — checklist

- [ ] Mobile-first layout passes at 375 px.
- [ ] Uses `useDocumentTitle` for per-page `<title>` and meta description.
- [ ] Wrapped in `<Layout>` (auto via `App.jsx` lazy route) or explicitly
      bypasses it (`isAuthPage`) for full-bleed shells.
- [ ] No emojis in JSX or strings.
- [ ] Logo via `<Logo />`; icons via `<MaterialIcon />`.
- [ ] Uses `.btn` variants — no inline button styling.
- [ ] All colour references via CSS variables.
- [ ] Has a skeleton state matching the real layout.
- [ ] Has an empty / error state.
- [ ] Has at least one `:focus-visible` test (tab through it).
- [ ] Build size delta ≤ 5 KB gzipped.
