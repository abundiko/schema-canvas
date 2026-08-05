import { useDiagramStore } from "./diagramStore";
import type { Column, CompositeIndex, Group, Relationship, StickyNote, TableEntity } from "#/types/diagram";

export function useSelectedTable(): TableEntity | null {
  return useDiagramStore((s) => {
    if (s.selection.type !== "table") return null;
    const tableId = s.selection.tableId;
    return s.diagram.tables.find((t) => t.id === tableId) ?? null;
  });
}

export function useSelectedGroup(): Group | null {
  return useDiagramStore((s) => {
    if (s.selection.type !== "group") return null;
    const groupId = s.selection.groupId;
    return s.diagram.groups.find((g) => g.id === groupId) ?? null;
  });
}

export function useSelectedNote(): StickyNote | null {
  return useDiagramStore((s) => {
    if (s.selection.type !== "note") return null;
    const noteId = s.selection.noteId;
    return s.diagram.notes.find((n) => n.id === noteId) ?? null;
  });
}

export function useSelectedRelationship(): Relationship | null {
  return useDiagramStore((s) => {
    if (s.selection.type !== "relationship") return null;
    const relationshipId = s.selection.relationshipId;
    return (
      s.diagram.relationships.find((r) => r.id === relationshipId) ?? null
    );
  });
}

export function sortedColumns(table: TableEntity): Column[] {
  return [...table.columns].sort((a, b) => a.order - b.order);
}

export function sortedIndexes(table: TableEntity): CompositeIndex[] {
  return [...table.indexes].sort((a, b) => a.order - b.order);
}
