import { beforeEach, describe, expect, it } from "vitest";
import { useDiagramStore, MAX_TABLES, createBlankDiagram } from "#/lib/store/diagramStore";

beforeEach(() => {
  useDiagramStore.getState().setDiagram({ ...createBlankDiagram(), tables: [] });
  useDiagramStore.getState().setSelection({ type: "none" });
});

describe("diagramStore", () => {
  it("starts blank", () => {
    const s = useDiagramStore.getState();
    expect(s.diagram.tables).toHaveLength(0);
    expect(s.diagram.relationships).toHaveLength(0);
  });

  it("adds a table with a primary key column", () => {
    const store = useDiagramStore.getState();
    const id = store.addTable();
    expect(id).not.toBe("");
    const table = useDiagramStore.getState().diagram.tables[0];
    expect(table.id).toBe(id);
    expect(table.columns).toHaveLength(1);
    expect(table.columns[0].keyType).toBe("primary");
  });

  it("adds columns and keeps order", () => {
    const store = useDiagramStore.getState();
    const tableId = store.addTable();
    store.addColumn(tableId);
    store.addColumn(tableId);
    const table = useDiagramStore.getState().diagram.tables[0];
    expect(table.columns.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("reorders columns", () => {
    const store = useDiagramStore.getState();
    const tableId = store.addTable();
    store.addColumn(tableId);
    const table = useDiagramStore.getState().diagram.tables[0];
    const [, second] = table.columns;
    store.reorderColumn(tableId, second.id, 0);
    const after = useDiagramStore.getState().diagram.tables[0];
    expect(after.columns.find((c) => c.id === second.id)?.order).toBe(0);
  });

  it("adds a relationship between two tables", () => {
    const store = useDiagramStore.getState();
    const a = store.addTable();
    const b = store.addTable();
    const tA = useDiagramStore.getState().diagram.tables[0];
    const tB = useDiagramStore.getState().diagram.tables[1];
    store.addRelationship(a, tA.columns[0].id, b, tB.columns[0].id, "one-to-many");
    expect(useDiagramStore.getState().diagram.relationships).toHaveLength(1);
  });

  it("deletes a table and cascades relationships", () => {
    const store = useDiagramStore.getState();
    const a = store.addTable();
    const b = store.addTable();
    const tA = useDiagramStore.getState().diagram.tables[0];
    const tB = useDiagramStore.getState().diagram.tables[1];
    store.addRelationship(a, tA.columns[0].id, b, tB.columns[0].id, "one-to-many");
    store.deleteTable(a);
    const s = useDiagramStore.getState();
    expect(s.diagram.tables.map((t) => t.id)).not.toContain(a);
    expect(s.diagram.relationships).toHaveLength(0);
  });

  it("enforces the 20-table sandbox cap", () => {
    const store = useDiagramStore.getState();
    for (let i = 0; i < MAX_TABLES; i++) store.addTable();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(MAX_TABLES);
    expect(store.addTable()).toBe("");
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(MAX_TABLES);
  });

  it("adds a group and assigns tables to it", () => {
    const store = useDiagramStore.getState();
    const tableId = store.addTable();
    const groupId = store.addGroup({ x: 0, y: 0, width: 400, height: 300 });
    store.assignTableToGroup(tableId, groupId);
    const s = useDiagramStore.getState();
    expect(s.diagram.groups).toHaveLength(1);
    expect(s.diagram.tables[0].groupId).toBe(groupId);
  });

  it("duplicates a group with its member tables", () => {
    const store = useDiagramStore.getState();
    const tableId = store.addTable();
    const groupId = store.addGroup();
    store.assignTableToGroup(tableId, groupId);
    store.duplicateGroup(groupId);
    const s = useDiagramStore.getState();
    expect(s.diagram.groups).toHaveLength(2);
    expect(s.diagram.tables.filter((t) => t.groupId).length).toBe(2);
  });
});

describe("undo/redo history", () => {
  it("undoes and redoes table creation", () => {
    const store = useDiagramStore.getState();
    store.addTable();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(1);

    const temporal = useDiagramStore.temporal.getState();
    temporal.undo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(0);

    temporal.redo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(1);
  });

  it("undoes relationship creation", () => {
    const store = useDiagramStore.getState();
    const a = store.addTable();
    const b = store.addTable();
    const tA = useDiagramStore.getState().diagram.tables[0];
    const tB = useDiagramStore.getState().diagram.tables[1];
    store.addRelationship(a, tA.columns[0].id, b, tB.columns[0].id, "one-to-many");
    expect(useDiagramStore.getState().diagram.relationships).toHaveLength(1);

    useDiagramStore.temporal.getState().undo();
    expect(useDiagramStore.getState().diagram.relationships).toHaveLength(0);
  });
});
