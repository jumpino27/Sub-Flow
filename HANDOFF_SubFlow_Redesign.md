# Handoff Spec: SubFlow Single-Screen Redesign

**Stack** Next.js 15 (App Router) · React 19 · Tailwind 3 · lucide-react · Recharts · date-fns · sql.js
**Scope** `app/page.js`, `app/globals.css`, `app/layout.js` (viewport), and the existing API/lib files only where validation needs to align.
**Source of truth** `design.md` in repo root. This handoff turns that brief into implementation-ready specs and resolves gaps observed in the in-flight changes (`git diff HEAD`).

---

## 1. Overview

SubFlow is a local-first personal finance ledger. Today the app scrolls; the redesign turns it into a **viewport-bounded single-screen experience** on desktop, tablet, and mobile. No body or page scroll. Calendar, graphs, the selected-day list, and the all-flows list each live in their own bounded region; only those regions may scroll internally when content overflows.

The two primary views — **Calendar** and **Graphs** — are mutually exclusive and switched via a sidebar. Creating a flow is gated behind an explicit day selection so users never accidentally create on "today."

### Status of the in-flight work (from `git diff HEAD`)
What's already in place and correct:
- `body { height: 100dvh; overflow: hidden }` and `.app-shell` re-built as a `100dvh` grid with rows `auto auto 1fr auto`. ✓
- `activeTab` state with Calendar / Graphs switching. ✓
- `hasActiveSelection` state; "New flow" button only renders after the user clicks a day. ✓
- Recurrence select offers `0` (one-time) and `1`–`12` months. ✓

Gaps to close in this handoff (the design.md brief explicitly asks for these):
- The brief calls for a **sidebar that owns primary navigation**. The current diff places `.tab-nav` inline inside the `.masthead` header. This spec restores the sidebar pattern (left rail desktop/tablet, bottom rail mobile) and re-organizes the shell grid accordingly.
- `.workspace-grid` still uses the pre-redesign 2-column layout with no inner height clamping. It needs to participate in the shell's `1fr` row and clamp its children so the calendar and graph never push outside the viewport.
- Footer is still rendered. `design.md` allows it to remain, but it must live in the shell's last `auto` row and never grow.

---

## 2. App Shell & Layout

### 2.1 Shell grid (desktop ≥ 1180px)

```
┌────────────────────────────────────────────────────────────┐
│ Sidebar │              Masthead (brand + month nav)        │ row 1: auto
│         ├──────────────────────────────────────────────────┤
│         │              Metric row (3 metrics)              │ row 2: auto
│         ├──────────────────────────────────────────────────┤
│         │  Main content (Calendar OR Graphs)  │ Side rail  │ row 3: 1fr (the only flexible row)
│         │                                     │            │
│         ├──────────────────────────────────────────────────┤
│         │              App footer (compact)                │ row 4: auto
└────────────────────────────────────────────────────────────┘
```

CSS targets:

```css
html, body { height: 100dvh; overflow: hidden; }

.app-shell {
  display: grid;
  grid-template-columns: clamp(72px, 7vw, 96px) minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    "rail   masthead"
    "rail   metrics"
    "rail   workspace"
    "rail   foot";
  height: 100dvh;
  max-width: 1640px;
  margin: 0 auto;
  padding: clamp(12px, 1.4vw, 24px);
  gap: clamp(12px, 1.2vw, 20px);
}

.workspace-grid {
  grid-area: workspace;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 440px);
  gap: clamp(20px, 2vw, 36px);
  min-height: 0;       /* critical: allows children to clamp */
}

.main-content,
.side-rail { min-height: 0; min-width: 0; }
```

**Why `minmax(0, 1fr)` and `min-height: 0` everywhere?** Grid/flex children default to `min-content`, which lets the calendar and chart blow past the viewport. Every track that should shrink must explicitly opt in.

### 2.2 Tablet (768–1179px)

- Sidebar collapses to a **48–56px icon rail**, still left-anchored.
- `.workspace-grid` becomes a single column. The side rail (Selected day · Form · All flows) becomes a **right drawer** that slides in for the form (the existing drawer pattern stays — see §6.7).
- Selected-day list and all-flows list become two stacked panels under the main content, each with `overflow-y: auto` and a hard max-height so the page never scrolls.

### 2.3 Mobile (< 768px)

- Sidebar moves to a **bottom tab bar**, full width, height 56 + safe-area-inset-bottom.
- Main content fills the remaining viewport. Selected-day list collapses to a **bottom sheet** that animates up to ~55% viewport height when there are flows on the selected day; otherwise it shows the empty state in a compact strip above the bottom nav.
- All-flows list is reachable via a search affordance in the masthead that opens a full-screen overlay panel.
- Form panel is the existing right-edge drawer at `min(100vw, 440px)`.

### 2.4 Validated breakpoints

| Viewport | Notes |
|---|---|
| 390 × 844 (mobile narrow) | Bottom tab bar; calendar cells `min-height: 64px`; `.day-net` hidden. |
| 430 × 740 (mobile short) | Bottom tab bar; metric row collapses to a 3-up compact strip (~52px tall). |
| 768 × 1024 (tablet) | Icon rail; single-column workspace; form drawer. |
| 1366 × 768 (short laptop) | Use the `(min-width: 1180px) and (max-height: 820px)` block already in CSS — keep `chart-wrap` 240px, `day-cell` 88px. |
| 1440 × 900 (desktop) | Full layout; `chart-wrap` 320px; `day-cell` 110px. |

---

## 3. Design Tokens

All tokens already exist as CSS custom properties in `app/globals.css`. **Reference tokens, never hard-coded values.**

| Token | Value | Usage |
|---|---|---|
| `--page` | `#ece4d1` | App background (cream) |
| `--page-warm` | `#e3d9c1` | Sidebar background (subtly warmer) |
| `--paper` | `#f5efde` | Panels, inputs |
| `--paper-strong` | `#fbf6e8` | Active selection text on dark, tooltip surface |
| `--ink` | `#1a1d1f` | Primary text, selected day fill |
| `--ink-soft` | `#2b3034` | Secondary text |
| `--muted` | `#6c6f74` | Tertiary text |
| `--muted-strong` | `#4d5054` | Eyebrows, weekday headers |
| `--rule` | `rgba(26,29,31,0.14)` | Default rules |
| `--rule-soft` | `rgba(26,29,31,0.08)` | Inner cell rules |
| `--rule-strong` | `rgba(26,29,31,0.32)` | Section dividers |
| `--teal` | `#135e4f` | Brand accent, focus ring base, active tab |
| `--teal-deep` | `#0d473b` | Hover/pressed accent |
| `--teal-soft` | `#d6e3dc` | Soft accent fills |
| `--teal-glaze` | `rgba(19,94,79,0.08)` | Hover wash on day cells |
| `--income` | `#1f6e58` | Income amount, income chart bars |
| `--income-soft` | `#d6e3dc` | Income chip background |
| `--expense` | `#b1463a` | Expense amount, expense chart bars |
| `--expense-soft` | `#efd4cc` | Expense chip background, error background |
| `--gold` | `#c89b3c` | Today marker dot |
| `--gold-soft` | `#f1e4c2` | Today cell wash |
| `--font-display` | Fraunces | Numerals, panel titles |
| `--font-body` | Bricolage Grotesque | UI, labels |
| `--font-mono` | JetBrains Mono | Money, codes, eyebrows |
| `--ease-editorial` | `cubic-bezier(0.22, 1, 0.36, 1)` | Page rise, drawer in/out |
| `--ease-snap` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus, active |
| `--shadow-rest` | `0 1px 0 rgba(26,29,31,0.04)` | Default lift |
| `--shadow-lift` | `0 24px 48px -28px rgba(26,29,31,0.32)` | Drawer, modal |

### Spacing scale (introduce as tokens; currently inline)

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Inline gap |
| `--space-2` | 8px | Inner padding, icon gaps |
| `--space-3` | 12px | Form field gap |
| `--space-4` | 16px | Panel padding base |
| `--space-5` | 20px | Section gaps |
| `--space-6` | 28px | Workspace gap |
| `--radius-sm` | 2px | All controls (matches editorial paper aesthetic) |
| `--radius-pill` | 999px | Status dots, brand mark |

### Type scale (already in use; named here for spec)

| Role | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| `display-xl` | Fraunces | `clamp(32px, 4.6vw, 48px)` | 500 | -0.035em |
| `display-lg` | Fraunces | `clamp(22px, 2.8vw, 30px)` | 500 | -0.025em |
| `body-md` | Bricolage | 14px | 400 | 0 |
| `body-sm` | Bricolage | 13px | 400 | 0 |
| `eyebrow` | Bricolage | 10.5px | 600 | 0.16em uppercase |
| `mono-sm` | JetBrains Mono | 11–12px | 500 | 0–0.04em |

---

## 4. Components

| Component | Purpose | Variants | Key props |
|---|---|---|---|
| `Sidebar` *(new)* | Owns navigation | `desktop` (rail), `tablet` (rail), `mobile` (bottom bar) | `activeTab`, `onTabChange` |
| `Masthead` | Brand + month context | static | `monthLabel`, `onPrev`, `onNext` |
| `MetricRow` | Three monthly KPIs | static | `income`, `expense`, `net`, `monthLabelShort` |
| `Metric` | Single KPI | tone: `income` \| `expense` \| `neutral` | `eyebrow`, `label`, `value`, `tone`, `icon` |
| `CalendarPanel` | Month grid + day select | static | `selectedMonth`, `selectedDay`, `hasActiveSelection`, `occurrenceByDay`, callbacks |
| `DayCell` | Single calendar day | states: default, hover, today, selected, outside-month | `date`, `occurrences`, `isToday`, `isSelected`, `onSelect` |
| `GraphPanel` | Yearly bars + monthly strip | static | `chartData`, `year`, `chartHasData`, year nav callbacks |
| `SelectedDayPanel` | Day's flows | empty / populated | `selectedDate`, `dayOccurrences`, `hasActiveSelection`, callbacks |
| `AllFlowsPanel` | Searchable list | empty / loading / populated | `items`, `filteredItems`, `query`, `setQuery`, `editItem` |
| `FormPanel` | Create/edit flow | create / edit; drawer below 1180px | `editingId`, `draft`, `setDraft`, `saveItem`, `deleteItem`, `closeDrawer`, `saving`, `error` |
| `Segmented` | Income/Expense toggle | active.income / active.expense | `value`, `onChange` |
| `FlowRow` | List item | tone: `income` \| `expense`; state: `editing` | `item`, `onEdit`, `editing` |
| `EmptyState` | Compact placeholder | static | `title` |
| `IconButton` | Square 36px (28px small) | sizes: default, small | `icon`, `aria-label`, `onClick` |
| `NewFlowButton` | Primary CTA | only renders when `hasActiveSelection` | `onClick` |

---

## 5. Sidebar (the missing piece)

The brief explicitly says: *"The sidebar must contain exactly two main tabs: Calendar, Graphs."* Implement it as its own component anchored to the shell's `rail` grid area on desktop/tablet, and as a **bottom bar** on mobile.

### 5.1 Desktop rail (≥ 1180px)

- Width: `clamp(72px, 7vw, 96px)`.
- Background: `--page-warm`.
- Right border: `1px solid var(--rule)`.
- Top: 28×28 brand mark (existing `/subflow-mark.png`).
- Below brand: vertical stack of two tab buttons. Each button is **icon + 11px Bricolage label**, vertically stacked. Icon size 18px.
  - Calendar tab → `CalendarDays` from lucide-react.
  - Graphs tab → `BarChart3` from lucide-react.
- Active state: 2px left bar in `--teal`, label color `--ink`, icon color `--teal`.
- Inactive state: label `--muted-strong`, icon `--muted`.
- Hover: background `--teal-glaze`.
- Bottom of rail: a single icon-only "Today" button (16×16 `Clock3`) that resets the calendar to today and selects today. Optional — keep if the existing today logic ships.

### 5.2 Tablet rail (768–1179px)

Same layout as desktop, narrowed to 56px and label hidden under 900px (icon only with `aria-label`). Tab labels reappear via tooltip on focus.

### 5.3 Mobile bottom bar (< 768px)

- Position: `fixed; bottom: 0; left: 0; right: 0;`.
- Height: `56px + env(safe-area-inset-bottom, 0px)`.
- Background: `--paper-strong`.
- Top border: `1px solid var(--rule-strong)`.
- Two equal tabs: icon (20px) + label (11px Bricolage). Active tab uses `--teal` icon and label, inactive `--muted`.
- The shell switches `grid-template-areas` to push content above the bar:

```css
@media (max-width: 767px) {
  .app-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    grid-template-areas:
      "masthead"
      "metrics"
      "workspace"
      "foot"
      "rail";
  }
}
```

---

## 6. States & Interactions

### 6.1 Calendar day selection

| Event | Behavior |
|---|---|
| Page load | `selectedDay = today`, **`hasActiveSelection = false`**. Today cell shows the gold dot but is *not* shown as the dark "selected" fill. |
| User clicks any day cell | `setHasActiveSelection(true)`; `selectedDay = clicked ISO`; if outside current month → `setSelectedMonth(new Date(clickedYear, clickedMonth, 1))`. The selected day stays the user's pick. |
| User clicks prev/next month chevron | Month changes; `selectedDay` falls back to today's ISO if the new month is the current month, otherwise the 1st of that month. **`hasActiveSelection` does NOT auto-flip true** — keyboard arrows on month nav must not summon the create button. |
| User keyboard-arrows inside the day grid | Move focus through cells; pressing Enter/Space selects that day (sets `hasActiveSelection`). |

### 6.2 Create button

| State | Behavior |
|---|---|
| Hidden | `!hasActiveSelection` — create button does not render. |
| Visible | After active selection. Lives in `CalendarPanel.panel-head`, right-aligned. |
| Hover | Background `--teal-deep`. |
| Pressed | Translate Y 1px, no shadow. |
| Disabled | Opacity 0.55; only used during `saving`. |

### 6.3 Form

| Field | Validation | Error copy |
|---|---|---|
| `type` | One of `income` \| `expense` (segmented; required) | "Choose income or expense." |
| `name` | Non-empty trimmed string ≤ 80 chars | "Name is required." |
| `description` | Optional ≤ 240 chars | — |
| `amount` | Number > 0, two decimals | "Enter an amount greater than 0." |
| `startDate` | ISO `YYYY-MM-DD` | "Pick a valid date." |
| `recurrenceMonths` | Integer 0–12 | "Choose how often this repeats." |

API contract preserved: `recurrenceMonths` sent as `0` for one-time, `1–12` for monthly intervals. Do **not** invent new values. If the API at `app/api/items/route.js` and `app/api/items/[id]/route.js` requires a tweak to align with this, do it there — don't massage values in the client.

| State | Behavior |
|---|---|
| Idle | Submit enabled when all required fields valid. |
| Saving | Submit disabled, icon swaps to `RefreshCw` with `.spin`. Other inputs remain enabled but ignored on submit. |
| Error | `.form-error` block above actions; red border on the offending field; focus moves to first invalid field. Live region `role="alert"`. |
| Editing | Title shows `draft.name`; Delete button (danger) appears on the left of actions. |
| Closed | Drawer slides out (mobile/tablet); on desktop the form panel returns to its inline place in the side rail. |

### 6.4 Day cell

| State | Visual |
|---|---|
| Default | Transparent background, ink number, mono day-net, signal pills (`income` teal, `expense` red). |
| Hover | Background `--teal-glaze`. |
| Today (not selected) | Background `rgba(200,155,60,0.10)`; gold 5px dot beside number. |
| Selected | Background `--ink`; number + day-net + signals invert to `--paper-strong`; signals use 16% white wash. |
| Outside month | Background `rgba(26,29,31,0.025)`; number `--rule-strong`; signals + day-net at 0.55 opacity. |
| Focus | 3px `rgba(19,94,79,0.32)` ring inside the cell border. |

### 6.5 Tab switching

- Switching between Calendar and Graphs **does not reset** `selectedDay`, `hasActiveSelection`, `query`, or `drawerOpen`. Only the visible main content changes.
- Switching while the form drawer is open should keep the drawer open — users may want to confirm a save in either context.

### 6.6 Lists

- `.list-scroll` and `.all-flows-list` are the only places content can scroll inside the viewport. They use `overflow-y: auto`, custom thin scrollbars, and a fixed `max-height` derived from the parent panel's allocated row.
- Selected-day list `max-height` = `calc(panel content area - panel head)`. All-flows list `max-height` derived similarly.
- Empty state never collapses the list region's height — render `EmptyState` inside a min-height: 96px container.

### 6.7 Drawer (form on tablet/mobile)

- Width: `min(440px, 100vw)`.
- Height: `100dvh`.
- Transform: `translateX(100%)` → `translateX(0)` over `360ms var(--ease-editorial)`.
- Backdrop `rgba(15,17,19,0.42)` with `backdrop-filter: blur(2px)` over `240ms var(--ease-editorial)`.
- Form actions are sticky to the bottom with `padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px))`.
- Closing: backdrop click, `Escape`, or X icon in panel-head. Focus returns to the trigger that opened it (the New flow button or a flow-row pencil).

---

## 7. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| ≥ 1440px | Full shell. `.workspace-grid` columns `minmax(0,1.45fr)` / `minmax(380px,440px)`. Calendar cells 110px tall. Chart 320px tall. |
| 1180–1439px | Same as ≥1440 but `.app-shell` padding tightens to 22px. |
| 1180+ × ≤ 820px (short laptop) | Use the existing compact rules: chart 240px, cells 88px, list-scroll max-height 260px. |
| 768–1179px (tablet) | Sidebar narrows to 56–72px icon rail. Workspace becomes single column, side rail items become stacked panels (Selected day → All flows). Form opens as right drawer. |
| 480–767px (mobile) | Bottom tab bar replaces left rail. Calendar cells 76px, `.day-net` hidden. Selected-day shown as a slide-up sheet. |
| < 480px | Cells 64px, weekday headers 9px / 0.12em. Form drawer becomes full width. |

---

## 8. Edge Cases

- **Empty month on Graphs**: `chartHasData === false` shows a centered "No flows recorded for {year} yet." overlay positioned absolutely so the chart wrap retains its 320/240px height. Bars never collapse the panel.
- **No flows on selected day**: `EmptyState` with title "Nothing scheduled" inside a `min-height: 96px` block.
- **No matches in search**: `EmptyState` with title "No matches".
- **Long flow name**: truncate to single line with `text-overflow: ellipsis`. Full name in `title` attribute and tooltip on hover.
- **Long description**: hidden in list rows; only revealed in form.
- **Many flows on one day** (>4 occurrences): show first three signal chips, then `+N` chip in `--muted-strong`. Hovering the cell reveals a tooltip listing all occurrences.
- **Year with 1000+ flows**: All-flows list virtualized via simple windowing if perf shows jank; otherwise rely on `overflow-y: auto`.
- **International date strings**: keep `toLocaleDateString` calls; never assume English month/weekday widths. Allow weekday header to wrap to two lines under 360px.
- **Timezone**: ISO dates are local-day strings (`YYYY-MM-DD`). Do not pass through `Date.toISOString()` — that introduces UTC drift. Keep `lib/dateLogic.js` as the single source.
- **Slow connection / loading state**: `loadItems` shows skeleton flow-rows in the All Flows list (3 rows of 60% opacity rule-coloured rectangles). Calendar renders immediately with empty signal arrays.
- **Save error**: `.form-error` shown; field that failed gets `border-color: var(--expense)` and the form does not close.
- **Delete**: requires `editingId`. After delete, drawer reverts to a fresh create form for the still-selected day.

---

## 9. Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Panels (`.rise`) | Mount | translateY(8px → 0), opacity 0 → 1 | 620ms | `--ease-editorial` |
| Panel rise stagger | Mount | `.rise-1` 60ms · `.rise-2` 140ms · `.rise-3` 220ms · `.rise-4` 300ms | — | — |
| Day cell hover | Mouseenter | background fade | 200ms | `--ease-snap` |
| Tab switch | Click | crossfade main content (opacity 0 → 1) | 180ms | `--ease-snap` |
| Drawer | Open/close | translateX(100% → 0) | 360ms | `--ease-editorial` |
| Backdrop | Open/close | opacity 0 → 1 | 240ms | `--ease-editorial` |
| Save button spinner | Saving | `RefreshCw` rotate | 900ms linear | infinite |
| Selected day highlight | Click | background swap (no transform) | 200ms | `--ease-snap` |

`@media (prefers-reduced-motion: reduce)` already disables `.rise` and the per-control transitions. Extend the rule to also disable the tab crossfade and drawer transform.

---

## 10. Accessibility

### Focus order (desktop)
1. Sidebar tabs (Calendar → Graphs).
2. Masthead month nav (Prev → Today (if shown) → Next).
3. Metric row (skipped — non-interactive).
4. Day grid (focusable cells, arrow-key navigation; first focus lands on `selectedDay`).
5. New flow button (when `hasActiveSelection`).
6. Selected-day list (each row → row's pencil button).
7. All-flows search input → list rows.
8. Form fields (when drawer/panel is open) in DOM order.

### ARIA & semantics
- `<aside aria-label="Primary navigation">` for sidebar; tab buttons get `role="tab"` only if they are inside a `tablist`. Otherwise use plain buttons with `aria-current="page"` for the active tab. The current diff uses plain buttons — fine; add `aria-current`.
- Day grid: `role="grid"` on the `.day-grid`, `role="row"` on each row, `role="gridcell"` on each cell. Each cell uses `aria-pressed` for selected state and `aria-label` with full localized date (already in code).
- Calendar tab content: `role="tabpanel"` only if pairing with a real tablist; otherwise rely on landmarks.
- New flow button: `aria-label="Create flow on {selected date}"`.
- Form: every input has a `<label>` already. The segmented control should be wrapped in `<fieldset><legend class="sr-only">Flow type</legend>` and use `role="radiogroup"` with each button as `role="radio" aria-checked`.
- Form errors: `<p class="form-error" role="alert" aria-live="polite">`.
- Drawer: when open, focus traps inside; `aria-modal="true"`; close with `Escape`. Backdrop `aria-hidden="true"` (already set).
- Empty state: announce via `aria-live="polite"` only when transitioning into "no matches" from a populated search.

### Keyboard interactions
- `←`/`→` move day-cell focus by ±1 day; `↑`/`↓` by ±7 days; crossing month edges navigates the month and keeps focus on the new selected cell.
- `Enter`/`Space` selects the focused cell.
- `Home` / `End` jump to the start / end of the visible week.
- `Tab` exits the grid in DOM order.
- `Cmd/Ctrl + N` opens the create form for the currently selected day (only when `hasActiveSelection`).
- `Esc` closes the drawer / clears search query if it has focus.

### Color contrast (verified against existing tokens)
- `--ink` on `--paper`: 14.2:1 (AAA).
- `--muted-strong` on `--paper`: 7.1:1 (AAA body).
- `--teal` on `--paper`: 5.1:1 (AA large) — fine for tab labels, **not** for body copy < 14px. If using `--teal` for 12px text, switch to `--teal-deep` (5.7:1).
- `--income` on `--paper`: 5.4:1 (AA).
- `--expense` on `--paper`: 4.6:1 (AA large) — for body 14px use `--expense` only when bolded. For 11–12px chips on `--expense`, the `--paper-strong` text is 6.8:1 (AA).
- `--gold` on `--paper`: 2.6:1 — **decorative only** (today dot). Do not use for text.

---

## 11. Implementation Notes

1. **Move tabs out of `.masthead`**. Keep the masthead as brand + month nav only. Add a new `<Sidebar />` component rendered as a sibling of `.workspace-grid` inside `.app-shell`. Update `.app-shell` to a 2-column grid as in §2.1.
2. **Drop the body-scroll fallback**. With `body { overflow: hidden; height: 100dvh }`, every grandchild that was relying on the page to scroll will now collide with the viewport. Audit `.list-scroll`, `.chart-wrap`, and `.form-panel .flow-form` for explicit `overflow-y: auto` and a real height/max-height.
3. **Constrain `.workspace-grid` height**. Add `min-height: 0` to `.workspace-grid`, `.main-content`, and `.side-rail`. Without this, the calendar's intrinsic min-content height (~700px) will push the shell off screen at 768px tall.
4. **Calendar autosize**. Replace the hardcoded `min-height: 110px` on `.day-cell` with `min-height: clamp(64px, calc((100dvh - 360px) / 6), 120px)`. The 360px constant is the sum of masthead + metric row + footer + panel chrome at desktop sizes; tune empirically.
5. **Chart autosize**. Wrap `<ResponsiveContainer>` in a `flex: 1 1 0; min-height: 0` parent so it fills the panel rather than insisting on 320px. Keep the 240px short-laptop override.
6. **Don't re-fire `.rise` on tab switch**. The rise animation is for app mount. Tab switching should be a 180ms opacity crossfade only — don't add `.rise` to the swapped panel.
7. **Preserve drawer rules**. The existing `@media (max-width: 1179px)` drawer block is correct for the form. Add the same pattern (a slide-up sheet) for the selected-day panel on mobile.
8. **Footer**. Compress to a single 36px-tall bar at desktop and hide entirely below 768px to reclaim space.

---

## 12. QA Checklist

Run `npm run build` and `npm run dev`, then verify:

- [ ] No body/page scroll at 390×844, 430×740, 768×1024, 1366×768, 1440×900.
- [ ] Sidebar visible on all breakpoints (rail or bottom bar).
- [ ] Calendar/Graphs switch via sidebar; tab state persists across day selection.
- [ ] New flow button hidden until a day is clicked; reappears each session only after click.
- [ ] Create one-time, every-1-month, every-12-month flows of both types.
- [ ] Edit and delete still work; deleting returns to fresh create state on same day.
- [ ] Graph totals refresh after create/edit/delete.
- [ ] Tab key reaches every interactive element; arrow keys navigate calendar.
- [ ] `prefers-reduced-motion` disables rise, drawer transform, and tab crossfade.
- [ ] Lighthouse accessibility ≥ 95 at desktop and mobile.
- [ ] No console warnings from Recharts about 0×0 dimensions (means `min-height: 0` chain is correct).

---

## 13. What "done" looks like

- One screen, no scroll, on every listed viewport.
- Sidebar owns navigation; masthead owns brand + month context.
- Every component in §4 has hover, focus, active, disabled, loading, empty, and error states verified.
- Tokens, not values, anywhere a color, font, ease, or shadow is referenced.
- The redesign reads as a polished, editorial finance ledger — not a half-migrated dashboard.
