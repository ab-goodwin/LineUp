# Fix Homepage Reorder on Mobile

## What & Why
The "Edit Homepage" dialog lets users drag stat cards to reorder them. The current implementation uses the HTML5 `draggable` attribute and `onDragStart`/`onDragOver`/`onDragEnd` events, which do not fire on touch screens. As a result, reordering is completely broken on mobile devices. Replace the drag implementation with `@dnd-kit/core` + `@dnd-kit/sortable`, which works identically on mouse and touch via the Pointer Sensor.

## Done looks like
- Users on mobile (touch screen) can press-and-hold a stat card row in the Edit Homepage dialog and drag it to a new position to reorder it
- The same reordering works on desktop with a mouse, exactly as before
- The visual drag indicator (opacity change on the item being dragged) is preserved
- Toggle show/hide checkboxes still work alongside the drag handles

## Out of scope
- Changing which stats are available or how they are saved
- Reordering anywhere else in the app

## Steps
1. **Install dnd-kit packages** — Add `@dnd-kit/core` and `@dnd-kit/sortable` via the package manager.
2. **Replace drag logic in EditHomepageDialog** — Swap out the `draggable` / drag event handlers on each stat row with `SortableContext` + `useSortable` from dnd-kit. Use `DndContext` with a `PointerSensor` (min-distance 8px to avoid conflicts with taps) and `TouchSensor` to cover all touch devices. Update reorder state in `onDragEnd`.
3. **Add a visible drag handle** — Replace the current grip icon (or add one if missing) wired to the `listeners` and `attributes` from `useSortable`, so the touch target is obvious and doesn't conflict with the toggle switch tap area.

## Relevant files
- `client/src/pages/Home.tsx:130-230`
