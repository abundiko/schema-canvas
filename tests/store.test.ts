import { beforeEach, describe, expect, it } from "vitest";
import { useDiagramStore } from "#/lib/store/diagramStore";

beforeEach(() => {
  useDiagramStore.getState().reset();
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

  it("adds tables without a sandbox cap", () => {
    const store = useDiagramStore.getState();
    for (let i = 0; i < 25; i++) store.addTable();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(25);
    expect(store.addTable()).not.toBe("");
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(26);
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

describe("tabs", () => {
  it("adds a tab and switches to it", () => {
    useDiagramStore.getState().reset();
    const firstId = useDiagramStore.getState().diagram.id;
    const secondId = useDiagramStore.getState().addTab();
    expect(useDiagramStore.getState().diagram.id).toBe(secondId);
    expect(useDiagramStore.getState().tabs).toHaveLength(2);

    useDiagramStore.getState().switchTab(firstId);
    expect(useDiagramStore.getState().diagram.id).toBe(firstId);
    expect(useDiagramStore.getState().activeTabId).toBe(firstId);
  });

  it("keeps each tab's tables independent", () => {
    useDiagramStore.getState().addTab();
    useDiagramStore.getState().addTable();
    expect(useDiagramStore.getState().diagram.tables.length).toBeGreaterThan(0);

    const firstId = useDiagramStore.getState().tabs[0].id;
    const secondId = useDiagramStore.getState().activeTabId;
    useDiagramStore.getState().switchTab(firstId);
    const firstTables = useDiagramStore.getState().diagram.tables.length;
    useDiagramStore.getState().switchTab(secondId);
    expect(useDiagramStore.getState().diagram.tables.length).toBeGreaterThan(firstTables);
  });

  it("renames the active tab via the active diagram", () => {
    useDiagramStore.getState().setDiagramName("Payments");
    expect(useDiagramStore.getState().diagram.name).toBe("Payments");
    expect(useDiagramStore.getState().tabs[0].name).toBe("Payments");
  });

  it("renames an inactive tab without changing the active tab", () => {
    const firstId = useDiagramStore.getState().diagram.id;
    const secondId = useDiagramStore.getState().addTab();
    useDiagramStore.getState().renameTab(secondId, "Billing");
    const s = useDiagramStore.getState();
    expect(s.tabs.find((t) => t.id === secondId)?.name).toBe("Billing");
    expect(s.diagram.id).toBe(secondId);
    expect(s.diagram.name).toBe("Billing");

    useDiagramStore.getState().switchTab(firstId);
    expect(useDiagramStore.getState().diagram.name).toBe("Untitled diagram");
  });

  it("closes an inactive tab and stays on the active one", () => {
    const store = useDiagramStore.getState();
    const firstId = store.diagram.id;
    const secondId = store.addTab();
    store.switchTab(firstId);
    store.closeTab(secondId);
    const s = useDiagramStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual([firstId]);
    expect(s.activeTabId).toBe(firstId);
  });

  it("closing the active tab activates a neighbor", () => {
    const store = useDiagramStore.getState();
    const firstId = store.diagram.id;
    const secondId = store.addTab();
    store.closeTab(secondId);
    const s = useDiagramStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual([firstId]);
    expect(s.activeTabId).toBe(firstId);
  });
});

describe("file library", () => {
  it("keeps a closed tab in the file library", () => {
    useDiagramStore.getState().reset();
    const secondId = useDiagramStore.getState().addTab();
    useDiagramStore.getState().switchTab(useDiagramStore.getState().tabs[0].id);
    useDiagramStore.getState().closeTab(secondId);

    const s = useDiagramStore.getState();
    expect(s.tabs.map((t) => t.id)).not.toContain(secondId);
    expect(s.files.map((f) => f.id)).toContain(secondId);
  });

  it("reopens a file from the library as a tab", () => {
    useDiagramStore.getState().reset();
    const secondId = useDiagramStore.getState().addTab();
    useDiagramStore.getState().switchTab(useDiagramStore.getState().tabs[0].id);
    useDiagramStore.getState().closeTab(secondId);

    const file = useDiagramStore.getState().files.find((f) => f.id === secondId)!;
    useDiagramStore.getState().openDiagram(file);

    const s = useDiagramStore.getState();
    expect(s.tabs.map((t) => t.id)).toContain(secondId);
    expect(s.activeTabId).toBe(secondId);
  });

  it("deletes a file from the library permanently", () => {
    useDiagramStore.getState().reset();
    const secondId = useDiagramStore.getState().addTab();
    useDiagramStore.getState().deleteFile(secondId);

    const s = useDiagramStore.getState();
    expect(s.files.map((f) => f.id)).not.toContain(secondId);
    expect(s.tabs.map((t) => t.id)).not.toContain(secondId);
  });

  it("registerFile dedupes by id keeping the latest", () => {
    useDiagramStore.getState().reset();
    const s = useDiagramStore.getState();
    const tab = s.tabs[0];
    const updated = { ...tab, name: "Renamed", updatedAt: new Date().toISOString() };
    s.registerFile(updated);
    const files = useDiagramStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("Renamed");
  });
});

describe("undo/redo history", () => {
  it("undoes and redoes table creation", () => {
    const store = useDiagramStore.getState();
    store.addTable();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(1);

    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(0);

    useDiagramStore.getState().redo();
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

    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().diagram.relationships).toHaveLength(0);
  });

  it("undo is per-tab", () => {
    useDiagramStore.getState().addTab();
    useDiagramStore.getState().addTable();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(2);

    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(1);
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(2);

    const firstId = useDiagramStore.getState().tabs[0].id;
    useDiagramStore.getState().switchTab(firstId);
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(0);
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().diagram.tables).toHaveLength(0);
  });
});
