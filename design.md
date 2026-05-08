# SubFlow Redesign Implementation Prompt

Refactor the existing SubFlow app into a fully responsive, screen-fitted finance interface. Do not add visual mock examples or long descriptive design fiction. Implement the logic and polish requirements below against the real project files.

## Primary Goal

Make the app work as a single-screen experience on desktop, tablet, and mobile:

- No page-level scrolling for the main app experience.
- Layout must auto-size to the current screen width and height.
- Calendar, graphs, selected-day actions, lists, and forms must fit inside controlled regions.
- Any necessary overflow must stay inside the relevant panel only, never on the page body.
- The interface must be polished across every component, not only the main layout.

## Files To Read First

Read these files before editing:

- `app/page.js` - main client UI, state, calendar, graph, form, side rail, row components.
- `app/globals.css` - all layout, responsive behavior, component styling, motion, and visual tokens.
- `app/layout.js` - metadata and viewport behavior.
- `lib/dateLogic.js` - recurrence, calendar occurrence, totals, and formatting helpers.
- `lib/db.js` - schema constraints for `type`, `startDate`, and `recurrenceMonths`.
- `app/api/items/route.js` - create/list API validation.
- `app/api/items/[id]/route.js` - update/delete API validation.
- `package.json` - available dependencies: Next, React, lucide-react, Recharts, date-fns, sql.js.

## Files Expected To Be Edited

Edit these files as needed:

- `app/page.js`
- `app/globals.css`
- `app/layout.js` if viewport or shell behavior needs adjustment
- `lib/dateLogic.js` only if recurrence or selected-day behavior needs helper changes
- `app/api/items/route.js` and `app/api/items/[id]/route.js` only if form logic requires validation alignment
- `README.md` only if user-facing behavior changes need documentation

Do not create a new design system folder unless the existing single-page structure becomes unmanageable. Keep the implementation close to the current project shape.

## Required App Logic

### Responsive Single-Screen Layout

- The root app shell must use the viewport height (`100dvh`) and prevent body/page scrolling.
- Desktop layout must fit into one screen with:
  - A fixed-width or clamp-sized sidebar.
  - A main content area that changes based on the active tab.
  - Header/summary areas sized so they do not push the calendar or graph below the fold.
- Mobile layout must fit into one screen with:
  - A compact sidebar/navigation area.
  - A main content region that remains visible without page scroll.
  - Touch-friendly controls and no overlapping text.
- Tablet layout must be treated as a real breakpoint, not just desktop squeezed smaller.
- Use CSS functions such as `clamp()`, `minmax()`, `dvh`, `svh`, grid tracks, and container constraints so the UI scales by screen type.
- Avoid viewport-width-driven font scaling that makes text unstable. Use bounded `clamp()` values only where needed.

### Sidebar Tabs

- Add a sidebar that owns the primary navigation.
- The sidebar must contain exactly two main tabs:
  - `Calendar`
  - `Graphs`
- The active tab controls the main content area.
- The calendar view must show the month calendar and day selection behavior.
- The graphs view must show the yearly/monthly visualizations and related summaries.
- Do not show calendar and graphs stacked vertically on the same page if that causes scrolling.
- The sidebar must stay usable on mobile, either as a compact rail, bottom-safe control, or collapsible panel, while preserving the two-tab logic.

### Calendar Day Selection

- A user must be able to click/tap a day in the calendar.
- Selecting a day must update the selected date state.
- The app must clearly know whether the user has actively selected a day.
- The create button must appear only after the user clicks/taps a day.
- The create button must create an item for the selected day, not for today unless today was selected.
- Changing months must not accidentally create for the wrong day.
- If the user selects a date outside the current month grid, the calendar may navigate to that month, but the selected date must remain the date the user chose.

### Create Flow

- The create action must be a single clear button that appears after day selection.
- Pressing create opens the create form using the selected day as `startDate`.
- The user must choose exactly one type:
  - `Expense`
  - `Income`
- The user must choose exactly one repeat option:
  - `One time`
  - `Every 1 month`
  - `Every 2 months`
  - Continue through `Every 12 months`
- The recurrence value sent to the API must remain:
  - `0` for one-time
  - `1` through `12` for monthly intervals
- The form must not allow saving without valid type, name, amount, date, and recurrence.
- Existing edit/delete behavior must continue to work.

### Graphs

- Move graph content behind the `Graphs` tab.
- Graphs must fit the available content area without page scrolling.
- Recharts containers must receive stable parent dimensions.
- Empty graph states must not resize or shift the layout.
- Existing yearly income, expense, and balance logic must remain correct.

### Selected Day And Lists

- The selected-day list must be tied to the selected date.
- It must not dominate the page before a date is selected.
- If there are no flows for the selected day, show a compact empty state.
- Existing all-flows/search behavior may remain, but it must fit inside the new layout and use internal scrolling if needed.
- Lists must have stable heights and must not push the app beyond the viewport.

## Component Polish Requirements

Touch and polish every component currently defined or rendered in `app/page.js`:

- `Home`
- `Metric`
- `FlowRow`
- `EmptyState`
- Calendar day cells
- Sidebar tab controls
- Month navigation controls
- Today control, if retained
- Create button
- Create/edit form
- Segmented income/expense control
- Recurrence control
- Search box
- Selected-day list
- All-flows list
- Chart shell
- Footer, if retained

Every component must be checked for:

- Responsive sizing on mobile, tablet, and desktop.
- No clipped labels or overlapping controls.
- Keyboard focus visibility.
- Pointer and touch usability.
- Disabled/loading/error states where applicable.
- Accessible labels for icon-only controls.
- Stable dimensions so hover, loading, empty, and selected states do not shift the layout.

## State And Behavior Expectations

- Add an `activeTab` state with `calendar` and `graphs`.
- Add state or derived logic that distinguishes default date from user-selected date.
- Do not show the create button until the user actively selects a day.
- `startNew()` must receive the selected date explicitly.
- `blankDraft()` must always use the intended date and type.
- Editing an existing item must not overwrite the current selected day unless the edit flow intentionally changes the date.
- Closing the form must reset only form-specific state, not the active tab.
- Saving a new item should leave the selected day intact and refresh visible lists/graphs.

## Styling Requirements

- Replace page-scroll layout with a viewport-bounded app layout.
- Use internal panel scrolling only where content can genuinely exceed its allocated area.
- Keep the current SubFlow identity unless changing it is required for responsiveness.
- Use existing CSS variables where possible.
- Avoid nested cards and decorative filler.
- Do not add marketing/landing-page content.
- Do not add explanatory text about how to use the app inside the UI.
- Keep controls compact, readable, and touch-safe.
- Ensure mobile safe-area spacing for bottom or side controls.
- Use lucide-react icons where icons are needed.

## Validation And Testing

After implementation:

- Run `npm run build`.
- Start the app locally and verify it in a browser.
- Check at least these viewport sizes:
  - Mobile narrow: `390 x 844`
  - Mobile short: `430 x 740`
  - Tablet: `768 x 1024`
  - Desktop: `1440 x 900`
  - Short desktop/laptop: `1366 x 768`
- Confirm there is no body/page scrolling at those sizes.
- Confirm Calendar and Graphs tabs switch correctly.
- Confirm the create button appears only after clicking a day.
- Confirm new income and expense items can be created with:
  - one-time recurrence
  - every 1 month recurrence
  - every 12 months recurrence
- Confirm existing item edit and delete still work.
- Confirm graph totals update after creating or editing items.

## Final Output Required

Deliver the finished implementation with:

- Updated source files.
- A short summary of what changed.
- The local test/build commands that were run.
- Any remaining limitations, if there are any.

The final app must feel complete and intentionally polished across all components, with no half-updated sections left behind.
