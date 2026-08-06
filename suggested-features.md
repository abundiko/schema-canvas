# Suggested Features

This app is a local-first ER diagram editor (DrawSQL-style). Everything lives in
the browser (IndexedDB / localStorage), there is no backend, and users can export
or import diagrams as JSON. Suggestions below are chosen because similar tools
(DrawSQL, dbdiagram.io, QuickDBD, SQLDBM, Eraser) have them and they map well onto
this app's architecture.

Legend for effort: **S** = small (hours), **M** = medium (a day or two),
**L** = large (a week+). Items marked *backend* are incompatible with the
local-only philosophy and are listed for awareness only.

---

## Quick wins (S)

### 1. Relationship ON DELETE / ON UPDATE rules
The #1 gap vs. real schema tools. DrawSQL / SQLDBM let you set
`ON DELETE (cascade | restrict | set null | no action | set default)` per
relationship and emit it in the generated DDL.

- **Why users want it**: cascade deletes are the most common real-world need and
  the single biggest reason people reach for a fuller tool.
- **Hook**: extend the `Relationship` type (`src/types/diagram.ts`), render two
  small `<Select>`s in `RelationshipInspector.tsx`, and emit in
  `src/lib/ddl/generateDdl.ts` (respect driver syntax, e.g. `ON UPDATE` for MySQL).

### 2. Keyboard shortcuts overlay (`?`) + command palette (Ctrl/Cmd+K)
Shortcuts already exist (`src/lib/utils/useEditorShortcuts.ts`) but are invisible
to users.

- **Why**: fast, cheap discoverability; users coming from dbdiagram.io expect it.
- **Hook**: a `Modal` listing shortcuts, plus a fuzzy "run command" list wired to
  the existing `emitCanvasEvent` actions and store actions (add table, fit view,
  export SQL/JSON, toggle theme, switch driver).

### 3. Copy & paste tables (with columns and relationships)
DrawSQL lets you duplicate a table and its edges. Users frequently copy a
"template" table (e.g. `audit_logs`) to stamp out similar ones.

- **Why**: massive time saver for repetitive schemas.
- **Hook**: `diagramStore` action `duplicateTable(id)` (copy columns/indexes, remap
  relationships, offset position +30/+30); wire `Ctrl+C/V` and the existing
  `Duplicate` button pattern from `GroupEditor`.

### 4. Single-table "Copy as SQL"
Right-click/ellipsis on a table → "Copy CREATE TABLE".

- **Hook**: reuse `generateDdl` but filter to one table (and its indexes); write to
  clipboard via the same helper used in `ExportDialog`.

### 5. Auto-layout / Arrange
One-click arrange tables (grid or a simple force-directed pass).

- **Why**: pasted/imported diagrams are a mess; every competitor has a layout
  button.
- **Hook**: pure function over `diagram.tables` positions; new button in
  `ViewportToolbar`; use the `temporal` undo wrapper so it's reversible.

### 6. SQL export options
`generateDdl` currently produces a bare script. Add export options:
`DROP TABLE IF EXISTS`, `IF NOT EXISTS`, MySQL `ENGINE=`/`CHARSET=`,
Postgres `EXTENSION` handling.

- **Why**: generated scripts that run against an existing DB on the first try are
  what users judge the tool by.
- **Hook**: options object threaded through `src/lib/export/exportActions.ts` and a
  small options panel in `ExportDialog`.

### 7. Diagram description / readme
A free-text notes field stored on the diagram (not a sticky note).

- **Hook**: `Diagram.notes`-adjacent field, editable in the inspector when nothing
  is selected (`InspectorPanel` "none" branch), included in JSON export.

---

## Medium (M)

### 8. Diagram manager — multiple diagrams in one browser
Store a list of diagrams in IndexedDB (`idb-keyval` is already used by autosave)
instead of a single autosaved one.

- **Why**: dbdiagram.io and DrawSQL both support multiple workspaces; users want to
  keep separate schemas.
- **Hook**: a `File ▸ Open` list + "duplicate diagram", plus a landing-page recent
  list. Keep the current autosave path as "reopen last opened".

### 9. In-browser version history / snapshots
Keep rolling autosave snapshots (e.g. every save, keep last 50) and a
"Restore version" picker.

- **Why**: local-first replacement for server-side version history; cheap to build
  with `idb-keyval`.
- **Hook**: on each autosave write `{t: timestamp, diagram}` to a capped list; a
  `Modal` listing timestamps with diff-aware restore (restore replaces the
  diagram + clears undo stack).

### 10. DBML import & export
[DBML](https://www.dbml.org/) is the interchange format used by dbdiagram.io and
many tools (also readable by Prisma et al).

- **Why**: interoperability is the strongest lock-in breaker; lets users move
  between tools freely.
- **Hook**: new `src/lib/dbml/generateDbml.ts` + `parseDbml.ts` (a small recursive
  descent parser for `Table`/`Ref` blocks), added to the File ▸ Import / Export
  menus alongside JSON and SQL.

### 11. Rule-based schema linter (offline)
Rule checks that flag issues instantly: missing primary key, FK without an index
on the referencing column, non-`snake_case` names, tables with no columns,
duplicate column names, M:N without a join table.

- **Why**: this is the "smart" feature users feel; it works offline and needs no LLM
  (the existing AI `reviewSchema` panel is a natural home for results).
- **Hook**: a `src/lib/lint/rules.ts` returning typed issues; render in a new
  "Issues" tab alongside the AI review tab in `AIPanel.tsx`; optionally add a
  canvas badge per node.

### 12. Check constraints & generated (virtual) columns
Two column-level features users expect: `CHECK (price > 0)` and generated
columns (`STORED`/`VIRTUAL` / `GENERATED ALWAYS AS (...)`).

- **Hook**: extend `Column` with `check?: string` and `generated?: {expr, stored}`;
  add fields to `ColumnAttributesPopover`; emit in `generateDdl` per-driver.

### 13. Table and relationship search / jump
Beyond the existing table-name search: search columns too, and jump/fit to the
match.

- **Hook**: extend `TableList` search to include column names; reuse the
  `fit-to-node` canvas event.

### 14. Sticky-note copy of a "canvas" snapshot + share improvements
The share URL already encodes a snapshot. Improve it with a lightweight
"share link" dialog that also copies the current theme, and a "last saved" /
"unsaved changes" indicator in the top bar.

### 15. Diagram templates / starter schemas
A "New from template" menu: blank, Users & Auth, E-commerce, Blog, CMS, Logging.

- **Why**: instant gratification for new users; trivial to ship as static data.
- **Hook**: `src/lib/templates/*.ts` returning `Diagram` objects (reuse
  `createBlankDiagram` shape).

---

## Larger / advanced (L)

### 16. PDF / print export
A print-optimized stylesheet + `window.print()` route so users get a shareable PDF.

- **Hook**: a `/print/:id`-style route or hidden iframe that renders the diagram
  (already possible via the export root used for PNG) with print CSS.

### 17. Diagram diff
Compare two diagrams (current vs. a snapshot, or two saved diagrams) and show
added/removed tables, columns, relationships.

- **Hook**: a structural diff function over the `Diagram` shape + a viewer modal.
  Great companion to #9.

### 18. Schema migrations between versions
After #17, generate an incremental migration script (ALTER TABLE...) between two
diagram versions.

- **Hook**: diff the DDL; emit per-driver `ALTER` statements. This is genuinely
  valuable but fiddly — do it last.

### 19. Multiple files/tabs within one diagram
Split the canvas into named tabs each with its own node layout but shared schema.

- **Hook**: add `Diagram.views` with per-view node visibility/positions. DrawSQL
  and SQLDBM both do this; it changes the node model, hence L.

---

## Out of scope for a local-only app (backend)

- Real-time collaboration / multi-user editing (needs a server + OT/CRDT).
- Account sync across devices / cloud storage.
- Live "reverse engineer from a database connection" (needs a database connector;
  a partial substitute is *paste a `SHOW CREATE TABLE` block* and run the existing
  DDL importer).

---

## Suggested roadmap

1. **Relationships**: ON DELETE/ON UPDATE rules (#1) — highest real-world value.
2. **Copy/paste + single-table SQL** (#3, #4) — everyday efficiency.
3. **Linter** (#11) and **shortcuts overlay** (#2) — perceived "pro" feel, cheap.
4. **Export options** (#6) and **DBML interop** (#10) — trust and interoperability.
5. **Diagram manager + version history** (#8, #9) — local-first "safety net".
6. Auto-layout (#5), templates (#15), search (#13) round out the polish pass.
