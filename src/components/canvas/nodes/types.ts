import type { Group, Relationship, StickyNote, TableEntity } from "#/types/diagram";
import type { Node, Edge } from "@xyflow/react";

export type TableNodeData = {
  table: TableEntity;
  onRename: (tableId: string, name: string) => void;
  autoFocusName?: boolean;
};

export type GroupNodeData = {
  group: Group;
  onResizeCommit: (groupId: string, bounds: Group["bounds"]) => void;
};

export type StickyNoteNodeData = {
  note: StickyNote;
  onResizeCommit: (
    noteId: string,
    position: StickyNote["position"],
    size: StickyNote["size"],
  ) => void;
};

export type RelationshipEdgeData = {
  cardinality: Relationship["cardinality"];
};

export type TableNode = Node<TableNodeData, "table">;
export type GroupNode = Node<GroupNodeData, "group">;
export type StickyNoteCanvasNode = Node<StickyNoteNodeData, "note">;

export type CanvasNode = TableNode | GroupNode | StickyNoteCanvasNode;

export type CanvasEdge = Edge<RelationshipEdgeData, "relationship">;
