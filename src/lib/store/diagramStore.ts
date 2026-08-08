import { create } from "zustand";

import type {
  ActiveTool,
  Cardinality,
  Column,
  CompositeIndex,
  Diagram,
  Driver,
  Group,
  Relationship,
  Selection,
  StickyNote,
  TableEntity,
} from "#/types/diagram";
import { DEFAULT_TABLE_COLOR } from "#/lib/utils/palettes";
import { createId } from "#/lib/utils/ids";
import { layoutDiagram, type LayoutMode } from "#/lib/layout/autoLayout";

interface ClipboardPayload {
  tables: TableEntity[];
  relationships: Relationship[];
}

let clipboard: ClipboardPayload | null = null;

function now(): string {
  return new Date().toISOString();
}

export function isSelectionEqual(a: Selection, b: Selection): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "none":
      return true;
    case "table":
      return b.type === "table" && a.tableId === b.tableId;
    case "tables":
      return (
        b.type === "tables" &&
        a.tableIds.length === b.tableIds.length &&
        a.tableIds.every((id, i) => id === b.tableIds[i])
      );
    case "group":
      return b.type === "group" && a.groupId === b.groupId;
    case "note":
      return b.type === "note" && a.noteId === b.noteId;
    case "relationship":
      return b.type === "relationship" && a.relationshipId === b.relationshipId;
  }
}

function createDefaultTable(driver: Driver): TableEntity {
  const type =
    driver === "postgresql" ? "serial" : driver === "mongodb" ? "string" : "int";
  return {
    id: createId("tbl"),
    name: "users",
    color: DEFAULT_TABLE_COLOR,
    position: { x: 0, y: 0 },
    comment: undefined,
    columns: [
      {
        id: createId("col"),
        name: "id",
        type,
        nullable: false,
        keyType: "primary",
        autoIncrement: true,
        order: 0,
      },
    ],
    indexes: [],
  };
}

function defaultDiagram(name = "Untitled diagram"): Diagram {
  return {
    id: createId("diag"),
    name,
    driver: "mysql",
    tables: [createDefaultTable("mysql")],
    relationships: [],
    groups: [],
    notes: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

export function createBlankDiagram(): Diagram {
  return defaultDiagram();
}

/* ------------------------------ tab history ------------------------------ */

interface TabHistory {
  past: Diagram[];
  future: Diagram[];
}

const MAX_HISTORY = 100;

const histMap = new Map<string, TabHistory>();
let suppressCapture = false;

function getHistory(tabId: string): TabHistory {
  let h = histMap.get(tabId);
  if (!h) {
    h = { past: [], future: [] };
    histMap.set(tabId, h);
  }
  return h;
}

/** Record an edit to a tab's diagram (before the change is applied). */
function pushHistory(tabId: string, diagram: Diagram): void {
  const h = getHistory(tabId);
  h.past.push(diagram);
  if (h.past.length > MAX_HISTORY) h.past.shift();
  h.future.length = 0;
}

interface DiagramStoreState {
  /** Active diagram — every existing component reads this; kept in sync with `tabs`. */
  diagram: Diagram;
  /** All open diagram tabs, in tab order. */
  tabs: Diagram[];
  activeTabId: string;
  canUndo: boolean;
  canRedo: boolean;
  selection: Selection;
  activeTool: ActiveTool;
  panelCollapsed: boolean;

  setDiagram: (diagram: Diagram) => void;
  setDiagramName: (name: string) => void;
  setDiagramDescription: (description: string) => void;
  setDriver: (driver: Driver) => void;

  addTable: () => string;
  updateTable: (tableId: string, patch: Partial<TableEntity>) => void;
  moveTable: (tableId: string, position: { x: number; y: number }) => void;
  deleteTable: (tableId: string) => void;
  assignTableToGroup: (tableId: string, groupId: string | null) => void;
  copyTables: (tableIds: string[]) => void;
  pasteTables: () => string[];
  duplicateTable: (tableId: string) => void;
  arrangeTables: (mode: LayoutMode) => void;

  addColumn: (tableId: string) => string;
  updateColumn: (tableId: string, columnId: string, patch: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  reorderColumn: (tableId: string, columnId: string, targetIndex: number) => void;

  addCompositeIndex: (tableId: string) => void;
  updateCompositeIndex: (
    tableId: string,
    indexId: string,
    patch: Partial<CompositeIndex>,
  ) => void;
  deleteCompositeIndex: (tableId: string, indexId: string) => void;
  reorderCompositeIndex: (tableId: string, indexId: string, targetIndex: number) => void;

  addRelationship: (
    sourceTableId: string,
    sourceColumnId: string,
    targetTableId: string,
    targetColumnId: string,
    cardinality: Cardinality,
  ) => void;
  updateRelationship: (id: string, patch: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  addGroup: (bounds?: { x: number; y: number; width: number; height: number }) => string;
  updateGroup: (groupId: string, patch: Partial<Group>) => void;
  moveGroup: (groupId: string, dx: number, dy: number) => void;
  deleteGroup: (groupId: string) => void;
  deleteGroupAll: (groupId: string) => void;
  duplicateGroup: (groupId: string) => void;

  addNote: () => string;
  updateNote: (noteId: string, patch: Partial<StickyNote>) => void;
  moveNote: (noteId: string, position: { x: number; y: number }) => void;
  resizeNote: (noteId: string, size: { width: number; height: number }) => void;
  deleteNote: (noteId: string) => void;

  setSelection: (selection: Selection) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setPanelCollapsed: (collapsed: boolean) => void;

  addTab: () => string;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  openDiagram: (diagram: Diagram) => void;
  replaceSession: (session: { tabs: Diagram[]; activeTabId: string }) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
}

const initialTab = defaultDiagram();

export const useDiagramStore = create<DiagramStoreState>()((set, get) => {
  const rawSet = set;

  const commit = (partial: any, replace?: boolean) => {
    (rawSet as (p: any, r?: boolean) => void)((prev: DiagramStoreState) => {
      const patch = (
        typeof partial === "function" ? (partial as any)(prev) : partial
      ) as Partial<DiagramStoreState>;
      const nextActiveId = patch.activeTabId ?? prev.activeTabId;

      // A change to the active tab's diagram is an edit worth undoing.
      if (
        !suppressCapture &&
        patch.diagram &&
        patch.diagram !== prev.diagram &&
        nextActiveId === prev.activeTabId
      ) {
        pushHistory(nextActiveId, prev.diagram);
      }

      // Keep `tabs` in sync with the active `diagram`.
      let tabs = patch.tabs ?? prev.tabs;
      if (patch.diagram) {
        tabs = tabs.map((t) => (t.id === patch.diagram?.id ? patch.diagram! : t));
      }

      // Derive `diagram` from the active tab unless the call already supplied one
      // for a brand-new tab.
      let diagram = patch.diagram ?? prev.diagram;
      if (
        patch.activeTabId !== undefined ||
        patch.tabs !== undefined ||
        patch.diagram === undefined
      ) {
        const active = tabs.find((t) => t.id === nextActiveId);
        if (active) diagram = active;
      }

      const h = getHistory(nextActiveId);
      return {
        ...patch,
        tabs,
        diagram,
        activeTabId: nextActiveId,
        canUndo: h.past.length > 0,
        canRedo: h.future.length > 0,
      };
    }, replace);
  };

  // All actions below call `set(...)`; route them through the reconciler.
  set = commit as typeof set;

  return {
    diagram: initialTab,
    tabs: [initialTab],
    activeTabId: initialTab.id,
    canUndo: false,
    canRedo: false,
    selection: { type: "none" },
    activeTool: "select",
    panelCollapsed: false,

    setDiagram: (diagram) => set({ diagram: { ...diagram, updatedAt: now() } }),
      setDiagramName: (name) =>
        set((s) => ({ diagram: { ...s.diagram, name, updatedAt: now() } })),
      setDiagramDescription: (description) =>
        set((s) => ({ diagram: { ...s.diagram, description, updatedAt: now() } })),
      setDriver: (driver) =>
        set((s) => ({ diagram: { ...s.diagram, driver, updatedAt: now() } })),

      addTable: () => {
        const driver = get().diagram.driver;
        const table = createDefaultTable(driver);
        const count = get().diagram.tables.length;
        const position = { x: count * 40, y: count * 40 };
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: [...s.diagram.tables, { ...table, position }],
            updatedAt: now(),
          },
          selection: { type: "table", tableId: table.id },
        }));
        return table.id;
      },

      updateTable: (tableId, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id === tableId ? { ...t, ...patch } : t,
            ),
            updatedAt: now(),
          },
        })),

      moveTable: (tableId, position) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id === tableId ? { ...t, position } : t,
            ),
            updatedAt: now(),
          },
        })),

      deleteTable: (tableId) => {
        const keep = (s_: DiagramStoreState) => {
          const d = s_.diagram;
          return {
            ...d,
            tables: d.tables.filter((t) => t.id !== tableId),
            relationships: d.relationships.filter(
              (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId,
            ),
            updatedAt: now(),
          };
        };
        set((s) => ({
          diagram: keep(s),
          selection:
            s.selection.type === "table" && s.selection.tableId === tableId
              ? { type: "none" }
              : s.selection,
        }));
      },

      assignTableToGroup: (tableId, groupId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id === tableId ? { ...t, groupId } : t,
            ),
            updatedAt: now(),
          },
        })),

      copyTables: (tableIds) => {
        const { diagram } = get();
        const ids = new Set(tableIds);
        const tables = diagram.tables.filter((t) => ids.has(t.id));
        if (tables.length === 0) return;
        const tableIdSet = new Set(tables.map((t) => t.id));
        clipboard = {
          tables,
          relationships: diagram.relationships.filter(
            (r) =>
              tableIdSet.has(r.sourceTableId) && tableIdSet.has(r.targetTableId),
          ),
        };
      },

      pasteTables: () => {
        const payload = clipboard;
        if (!payload || payload.tables.length === 0) return [];

        const tableIdMap = new Map<string, string>();
        const columnIdMap = new Map<string, string>();

        const tablesToAdd = payload.tables;

        const newTables = tablesToAdd.map((t) => {
          const newTableId = createId("tbl");
          tableIdMap.set(t.id, newTableId);
          const columns = t.columns.map((c) => {
            const newColId = createId("col");
            columnIdMap.set(`${t.id}:${c.id}`, newColId);
            return { ...c, id: newColId };
          });
          const indexes = t.indexes.map((ix) => ({
            ...ix,
            id: createId("idx"),
            columnIds: ix.columnIds.map(
              (cid) => columnIdMap.get(`${t.id}:${cid}`) ?? cid,
            ),
          }));
          return {
            ...t,
            id: newTableId,
            position: { x: t.position.x + 40, y: t.position.y + 40 },
            columns,
            indexes,
          };
        });

        const relationships = payload.relationships
          .map((r) => {
            const st = tableIdMap.get(r.sourceTableId);
            const tt = tableIdMap.get(r.targetTableId);
            const sc = columnIdMap.get(`${r.sourceTableId}:${r.sourceColumnId}`);
            const tc = columnIdMap.get(`${r.targetTableId}:${r.targetColumnId}`);
            if (!st || !tt || !sc || !tc) return null;
            return {
              ...r,
              id: createId("rel"),
              sourceTableId: st,
              sourceColumnId: sc,
              targetTableId: tt,
              targetColumnId: tc,
            };
          })
          .filter((r): r is Relationship => !!r);

        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: [...s.diagram.tables, ...newTables],
            relationships: [...s.diagram.relationships, ...relationships],
            updatedAt: now(),
          },
          selection:
            newTables.length === 1
              ? { type: "table", tableId: newTables[0].id }
              : { type: "tables", tableIds: newTables.map((t) => t.id) },
        }));
        return newTables.map((t) => t.id);
      },

      duplicateTable: (tableId) => {
        get().copyTables([tableId]);
        get().pasteTables();
      },

      arrangeTables: (mode) =>
        set((s) => {
          const positions = layoutDiagram(s.diagram, mode);
          return {
            diagram: {
              ...s.diagram,
              tables: s.diagram.tables.map((t) => ({
                ...t,
                position: positions.get(t.id) ?? t.position,
              })),
              updatedAt: now(),
            },
          };
        }),

      addColumn: (tableId) => {
        const col: Column = {
          id: createId("col"),
          name: "",
          type: "",
          nullable: true,
          keyType: "none",
          order: 0,
        };
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) => {
              if (t.id !== tableId) return t;
              const maxOrder = t.columns.reduce((m, c) => Math.max(m, c.order), -1);
              return {
                ...t,
                columns: [
                  ...t.columns,
                  {
                    ...col,
                    type:
                      s.diagram.driver === "postgresql"
                        ? "integer"
                        : s.diagram.driver === "mongodb"
                          ? "string"
                          : "int",
                    order: maxOrder + 1,
                  },
                ],
              };
            }),
            updatedAt: now(),
          },
        }));
        return col.id;
      },

      updateColumn: (tableId, columnId, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id !== tableId
                ? t
                : {
                    ...t,
                    columns: t.columns.map((c) =>
                      c.id === columnId ? { ...c, ...patch } : c,
                    ),
                  },
            ),
            updatedAt: now(),
          },
        })),

      deleteColumn: (tableId, columnId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id !== tableId
                ? t
                : {
                    ...t,
                    columns: t.columns
                      .filter((c) => c.id !== columnId)
                      .sort((a, b) => a.order - b.order)
                      .map((c, i) => ({ ...c, order: i })),
                    indexes: t.indexes
                      .map((ix) => ({
                        ...ix,
                        columnIds: ix.columnIds.filter((id) => id !== columnId),
                      }))
                      .filter((ix) => ix.columnIds.length >= 2),
                  },
            ),
            relationships: s.diagram.relationships.filter(
              (r) => !(r.sourceColumnId === columnId || r.targetColumnId === columnId),
            ),
            updatedAt: now(),
          },
        })),

      reorderColumn: (tableId, columnId, targetIndex) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) => {
              if (t.id !== tableId) return t;
              const cols = [...t.columns].sort((a, b) => a.order - b.order);
              const from = cols.findIndex((c) => c.id === columnId);
              if (from === -1) return t;
              const [moved] = cols.splice(from, 1);
              cols.splice(targetIndex, 0, moved);
              return {
                ...t,
                columns: cols.map((c, i) => ({ ...c, order: i })),
              };
            }),
            updatedAt: now(),
          },
        })),

      addCompositeIndex: (tableId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) => {
              if (t.id !== tableId) return t;
              const idx: CompositeIndex = {
                id: createId("idx"),
                columnIds: [],
                type: "index",
                order: t.indexes.length,
              };
              return { ...t, indexes: [...t.indexes, idx] };
            }),
            updatedAt: now(),
          },
        })),

      updateCompositeIndex: (tableId, indexId, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id !== tableId
                ? t
                : {
                    ...t,
                    indexes: t.indexes.map((ix) =>
                      ix.id === indexId ? { ...ix, ...patch } : ix,
                    ),
                  },
            ),
            updatedAt: now(),
          },
        })),

      deleteCompositeIndex: (tableId, indexId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) =>
              t.id !== tableId
                ? t
                : { ...t, indexes: t.indexes.filter((ix) => ix.id !== indexId) },
            ),
            updatedAt: now(),
          },
        })),

      reorderCompositeIndex: (tableId, indexId, targetIndex) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.map((t) => {
              if (t.id !== tableId) return t;
              const idxs = [...t.indexes].sort((a, b) => a.order - b.order);
              const from = idxs.findIndex((ix) => ix.id === indexId);
              if (from === -1) return t;
              const [moved] = idxs.splice(from, 1);
              idxs.splice(targetIndex, 0, moved);
              return { ...t, indexes: idxs.map((ix, i) => ({ ...ix, order: i })) };
            }),
            updatedAt: now(),
          },
        })),

      addRelationship: (
        sourceTableId,
        sourceColumnId,
        targetTableId,
        targetColumnId,
        cardinality = "one-to-many",
      ) =>
        set((s) => {
          const rel: Relationship = {
            id: createId("rel"),
            sourceTableId,
            sourceColumnId,
            targetTableId,
            targetColumnId,
            cardinality,
          };
          const exists = s.diagram.relationships.some(
            (r) =>
              (r.sourceTableId === sourceTableId &&
                r.targetTableId === targetTableId &&
                r.sourceColumnId === sourceColumnId &&
                r.targetColumnId === targetColumnId) ||
              (r.sourceTableId === targetTableId &&
                r.targetTableId === sourceTableId &&
                r.sourceColumnId === targetColumnId &&
                r.targetColumnId === sourceColumnId),
          );
          return {
            diagram: {
              ...s.diagram,
              relationships: exists ? s.diagram.relationships : [...s.diagram.relationships, rel],
              updatedAt: now(),
            },
            selection: { type: "relationship", relationshipId: rel.id },
          };
        }),

      updateRelationship: (id, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            relationships: s.diagram.relationships.map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
            updatedAt: now(),
          },
        })),

      deleteRelationship: (id) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            relationships: s.diagram.relationships.filter((r) => r.id !== id),
            updatedAt: now(),
          },
          selection:
            s.selection.type === "relationship" && s.selection.relationshipId === id
              ? { type: "none" }
              : s.selection,
        })),

      addGroup: (bounds) => {
        const groupId = createId("grp");
        const g: Group = {
          id: groupId,
          name: "New group",
          color: "#818cf8",
          bounds: bounds ?? { x: 0, y: 0, width: 400, height: 300 },
        };
        set((s) => ({
          diagram: { ...s.diagram, groups: [...s.diagram.groups, g], updatedAt: now() },
          selection: { type: "group", groupId },
        }));
        return groupId;
      },

      updateGroup: (groupId, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            groups: s.diagram.groups.map((g) =>
              g.id === groupId ? { ...g, ...patch } : g,
            ),
            updatedAt: now(),
          },
        })),

      moveGroup: (groupId, dx, dy) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            groups: s.diagram.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    bounds: {
                      ...g.bounds,
                      x: g.bounds.x + dx,
                      y: g.bounds.y + dy,
                    },
                  }
                : g,
            ),
            tables: s.diagram.tables.map((t) =>
              t.groupId === groupId
                ? { ...t, position: { x: t.position.x + dx, y: t.position.y + dy } }
                : t,
            ),
            notes: s.diagram.notes.map((n) =>
              n.groupId === groupId
                ? {
                    ...n,
                    position: { x: n.position.x + dx, y: n.position.y + dy },
                  }
                : n,
            ),
            updatedAt: now(),
          },
        })),

      deleteGroup: (groupId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            groups: s.diagram.groups.filter((g) => g.id !== groupId),
            tables: s.diagram.tables.map((t) =>
              t.groupId === groupId ? { ...t, groupId: null } : t,
            ),
            notes: s.diagram.notes.map((n) =>
              n.groupId === groupId ? { ...n, groupId: null } : n,
            ),
            updatedAt: now(),
          },
          selection:
            s.selection.type === "group" && s.selection.groupId === groupId
              ? { type: "none" }
              : s.selection,
        })),

      deleteGroupAll: (groupId) =>
        set((s) => {
          const memberTableIds = s.diagram.tables
            .filter((t) => t.groupId === groupId)
            .map((t) => t.id);
          return {
            diagram: {
              ...s.diagram,
              groups: s.diagram.groups.filter((g) => g.id !== groupId),
              tables: s.diagram.tables.filter((t) => t.groupId !== groupId),
              notes: s.diagram.notes.filter((n) => n.groupId !== groupId),
              relationships: s.diagram.relationships.filter(
                (r) =>
                  !memberTableIds.includes(r.sourceTableId) &&
                  !memberTableIds.includes(r.targetTableId),
              ),
              updatedAt: now(),
            },
            selection:
              s.selection.type === "group" && s.selection.groupId === groupId
                ? { type: "none" }
                : s.selection,
          };
        }),

      duplicateGroup: (groupId) =>
        set((s) => {
          const src = s.diagram.groups.find((g) => g.id === groupId);
          if (!src) return {};
          const offset = 40;
          const newGroupId = createId("grp");
          const tableIdMap = new Map<string, string>();
          const columnIdMap = new Map<string, string>();
          const tables = s.diagram.tables.map((t) => {
            if (t.groupId !== groupId) return t;
            const newTableId = createId("tbl");
            tableIdMap.set(t.id, newTableId);
            return {
              ...t,
              id: newTableId,
              position: {
                x: t.position.x + offset,
                y: t.position.y + offset,
              },
              columns: t.columns.map((c) => {
                const newColId = createId("col");
                columnIdMap.set(`${t.id}:${c.id}`, newColId);
                return { ...c, id: newColId };
              }),
              indexes: t.indexes.map((ix) => ({
                ...ix,
                id: createId("idx"),
                columnIds: ix.columnIds.map((cid) => columnIdMap.get(`${t.id}:${cid}`) ?? cid),
              })),
            };
          });
          const notes = s.diagram.notes
            .filter((n) => n.groupId === groupId)
            .map((n) => ({
              ...n,
              id: createId("note"),
              position: { x: n.position.x + offset, y: n.position.y + offset },
            }));
          const relationships = s.diagram.relationships.map((r) => {
            const srcTable = tableIdMap.get(r.sourceTableId);
            const tgtTable = tableIdMap.get(r.targetTableId);
            if (!srcTable || !tgtTable) return r;
            const srcCol = columnIdMap.get(`${r.sourceTableId}:${r.sourceColumnId}`);
            const tgtCol = columnIdMap.get(`${r.targetTableId}:${r.targetColumnId}`);
            if (!srcCol || !tgtCol) return r;
            return {
              ...r,
              id: createId("rel"),
              sourceTableId: srcTable,
              sourceColumnId: srcCol,
              targetTableId: tgtTable,
              targetColumnId: tgtCol,
            };
          });
          return {
            diagram: {
              ...s.diagram,
              groups: [
                ...s.diagram.groups,
                {
                  ...src,
                  id: newGroupId,
                  name: `${src.name} (copy)`,
                  bounds: {
                    ...src.bounds,
                    x: src.bounds.x + offset,
                    y: src.bounds.y + offset,
                  },
                },
              ],
              tables: [...s.diagram.tables, ...tables],
              notes: [...s.diagram.notes, ...notes],
              relationships,
              updatedAt: now(),
            },
          };
        }),

      addNote: () => {
        const noteId = createId("note");
        const note: StickyNote = {
          id: noteId,
          content: "Sticky note",
          color: "#fef3c7",
          fontSize: "M",
          position: { x: 0, y: 0 },
          size: { width: 180, height: 140 },
        };
        set((s) => ({
          diagram: { ...s.diagram, notes: [...s.diagram.notes, note], updatedAt: now() },
          selection: { type: "note", noteId },
        }));
        return noteId;
      },

      updateNote: (noteId, patch) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            notes: s.diagram.notes.map((n) =>
              n.id === noteId ? { ...n, ...patch } : n,
            ),
            updatedAt: now(),
          },
        })),

      moveNote: (noteId, position) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            notes: s.diagram.notes.map((n) =>
              n.id === noteId ? { ...n, position } : n,
            ),
            updatedAt: now(),
          },
        })),

      resizeNote: (noteId, size) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            notes: s.diagram.notes.map((n) =>
              n.id === noteId ? { ...n, size } : n,
            ),
            updatedAt: now(),
          },
        })),

      deleteNote: (noteId) =>
        set((s) => ({
          diagram: {
            ...s.diagram,
            notes: s.diagram.notes.filter((n) => n.id !== noteId),
            updatedAt: now(),
          },
          selection:
            s.selection.type === "note" && s.selection.noteId === noteId
              ? { type: "none" }
              : s.selection,
        })),

      setSelection: (selection) => {
        if (isSelectionEqual(get().selection, selection)) return;
        set({ selection });
      },
      setActiveTool: (activeTool) => set({ activeTool }),
      setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),

      /* ------------------------------ tabs ------------------------------ */

      addTab: () => {
        const s = get();
        const numbered = s.tabs.filter((t) => t.name.startsWith("Untitled diagram"));
        const d = defaultDiagram(`Untitled diagram ${numbered.length + 1}`);
        set((st) => ({
          tabs: [...st.tabs, d],
          activeTabId: d.id,
          diagram: d,
          selection: { type: "none" },
        }));
        return d.id;
      },

      switchTab: (tabId) =>
        set((s) =>
          s.activeTabId === tabId
            ? {}
            : { activeTabId: tabId, selection: { type: "none" } },
        ),

      closeTab: (tabId) => {
        set((s) => {
          if (s.tabs.length <= 1) return {};
          const index = s.tabs.findIndex((t) => t.id === tabId);
          const tabs = s.tabs.filter((t) => t.id !== tabId);
          histMap.delete(tabId);
          if (s.activeTabId !== tabId) return { tabs };
          const nextActive = tabs[Math.min(Math.max(index, 0), tabs.length - 1)];
          return { tabs, activeTabId: nextActive.id, selection: { type: "none" } };
        });
      },

      renameTab: (tabId, name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return {};
          return {
            tabs: s.tabs.map((t) =>
              t.id === tabId ? { ...t, name: trimmed, updatedAt: now() } : t,
            ),
          };
        }),

      openDiagram: (diagram) =>
        set((s) => {
          const existing = s.tabs.find((t) => t.id === diagram.id);
          if (existing) return { activeTabId: existing.id, selection: { type: "none" } };
          const d = { ...diagram, updatedAt: now() };
          return {
            tabs: [...s.tabs, d],
            activeTabId: d.id,
            diagram: d,
            selection: { type: "none" },
          };
        }),

      replaceSession: ({ tabs, activeTabId }) => {
        const resolved = tabs.length ? tabs : [createBlankDiagram()];
        const id = resolved.some((t) => t.id === activeTabId)
          ? activeTabId
          : resolved[0].id;
        for (const key of [...histMap.keys()]) {
          if (!resolved.some((t) => t.id === key)) histMap.delete(key);
        }
        set(() => ({
          tabs: resolved,
          activeTabId: id,
          diagram: resolved.find((t) => t.id === id)!,
          selection: { type: "none" },
        }));
      },

      reset: () => {
        histMap.clear();
        const d: Diagram = { ...createBlankDiagram(), tables: [] };
        set(() => ({
          tabs: [d],
          activeTabId: d.id,
          diagram: d,
          selection: { type: "none" },
          canUndo: false,
          canRedo: false,
        }));
      },

      /* ------------------------- per-tab undo/redo ------------------------- */

      undo: () => {
        const { activeTabId, diagram } = get();
        const h = getHistory(activeTabId);
        const last = h.past.pop();
        if (!last) return;
        h.future.push(diagram);
        suppressCapture = true;
        try {
          set({ diagram: { ...last, updatedAt: now() } });
        } finally {
          suppressCapture = false;
        }
      },

      redo: () => {
        const { activeTabId, diagram } = get();
        const h = getHistory(activeTabId);
        const next = h.future.pop();
        if (!next) return;
        h.past.push(diagram);
        suppressCapture = true;
        try {
          set({ diagram: { ...next, updatedAt: now() } });
        } finally {
          suppressCapture = false;
        }
      },
    };
  },
);

export function useUndo(): () => void {
  return () => useDiagramStore.getState().undo();
}
