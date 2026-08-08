import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  SelectionMode,
  ConnectionLineType,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams,
} from "@xyflow/react";

import { isSelectionEqual, useDiagramStore } from "#/lib/store/diagramStore";import { useUiStore } from "#/lib/store/uiStore";
import { onCanvasEvent } from "#/lib/utils/canvasEvents";
import type { Diagram, Group, Selection, StickyNote } from "#/types/diagram";
import { TableNode } from "./nodes/TableNode";
import { GroupNode } from "./nodes/GroupNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { RelationshipEdge } from "./edges/RelationshipEdge";

const nodeTypes = {
  table: TableNode,
  group: GroupNode,
  note: StickyNoteNode,
} as const;

const edgeTypes = {
  relationship: RelationshipEdge,
} as const;

const FIT_VIEW_OPTIONS = { padding: 0.4, maxZoom: 1.25 } as const;

function groupAtPoint(diagram: Diagram, point: { x: number; y: number }): Group | null {
  for (const g of diagram.groups) {
    const { x, y, width, height } = g.bounds;
    if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) {
      return g;
    }
  }
  return null;
}

function nodeCenter(n: Node): { x: number; y: number } {
  return {
    x: n.position.x + (n.width ?? 240) / 2,
    y: n.position.y + (n.height ?? 100) / 2,
  };
}

interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GroupDragState {
  groupId: string;
  startBounds: { x: number; y: number };
  memberStart: Map<string, { x: number; y: number }>;
}

function DiagramCanvasInner() {
  const diagram = useDiagramStore((s) => s.diagram);
  const activeTabId = useDiagramStore((s) => s.activeTabId);
  const activeTool = useDiagramStore((s) => s.activeTool);
  const selection = useDiagramStore((s) => s.selection);
  const setSelection = useDiagramStore((s) => s.setSelection);

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [drawRect, setDrawRect] = useState<DrawRect | null>(null);
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const suppressPaneClickRef = useRef(false);
  const lastPushedSelectionRef = useRef<Selection | null>(null);
  const groupDragRef = useRef<GroupDragState | null>(null);
  const lastDrawRef = useRef<DrawRect | null>(null);
  const isSelectingRef = useRef(false);
  const pendingSelectionRef = useRef<Selection | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, zoomIn, zoomOut, setViewport, fitView, getViewport } =
    useReactFlow();
  const gridVisible = useUiStore((s) => s.gridVisible);
  const setZoom = useUiStore((s) => s.setZoom);

  // Keep a per-tab viewport so switching tabs restores that tab's pan/zoom.
  const hadInitialViewport = useRef(false);
  useEffect(() => {
    const store = useDiagramStore.getState();
    const saved = store.viewports[activeTabId];
    if (saved && hadInitialViewport.current) {
      setViewport({ x: saved.x, y: saved.y, zoom: saved.zoom });
    }
    hadInitialViewport.current = true;
  }, [activeTabId, setViewport]);

  const handleMove = useCallback(
    (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setZoom(viewport.zoom);
      const store = useDiagramStore.getState();
      store.setViewportForTab(store.activeTabId, viewport);
    },
    [setZoom],
  );

  /* ---------- app-level canvas events (toolbars, keyboard) ---------- */
  useEffect(() => {
    return onCanvasEvent((e) => {
      switch (e.type) {
        case "fit-view":
          fitView({ padding: 0.5, maxZoom: 1.25 });
          break;
        case "fit-to-node":
          fitView({ nodes: [{ id: e.nodeId }], padding: 1.2, maxZoom: 1.5 });
          break;
        case "zoom-in":
          zoomIn({ duration: 120 });
          break;
        case "zoom-out":
          zoomOut({ duration: 120 });
          break;
        case "zoom-reset":
          setViewport({ ...getViewport(), zoom: 1 }, { duration: 120 });
          break;
        case "toggle-fullscreen":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
      }
    });
  }, [zoomIn, zoomOut, setViewport, fitView, getViewport]);

  const isTable = useCallback(
    (id: string) => diagram.tables.some((t) => t.id === id),
    [diagram],
  );
  const isGroup = useCallback(
    (id: string) => diagram.groups.some((g) => g.id === id),
    [diagram],
  );
  const isNote = useCallback(
    (id: string) => diagram.notes.some((n) => n.id === id),
    [diagram],
  );

  /* -------- stable handlers passed into node data -------- */
  const handleTableRename = useCallback((tableId: string, name: string) => {
    useDiagramStore.getState().updateTable(tableId, { name });
  }, []);
  const handleGroupResizeCommit = useCallback((groupId: string, bounds: Group["bounds"]) => {
    useDiagramStore.getState().updateGroup(groupId, { bounds });
  }, []);
  const handleNoteResizeCommit = useCallback(
    (noteId: string, position: StickyNote["position"], size: StickyNote["size"]) => {
      useDiagramStore.getState().updateNote(noteId, { position, size });
    },
    [],
  );

  /* ---------------- derive nodes/edges from the store ---------------- */
  const desired = useMemo(() => {
    const nodes: Node[] = [];
    for (const g of diagram.groups) {
      nodes.push({
        id: g.id,
        type: "group",
        position: { x: g.bounds.x, y: g.bounds.y },
        data: { group: g, onResizeCommit: handleGroupResizeCommit },
        style: { width: g.bounds.width, height: g.bounds.height },
        zIndex: 0,
        selectable: true,
        draggable: true,
        dragHandle: ".group-drag-handle",
        selected: selection.type === "group" && selection.groupId === g.id,
      });
    }
    for (const t of diagram.tables) {
      nodes.push({
        id: t.id,
        type: "table",
        position: t.position,
        data: {
          table: t,
          onRename: handleTableRename,
          autoFocusName: autoFocusId === t.id,
        },
        zIndex: 1,
        selected:
          (selection.type === "table" && selection.tableId === t.id) ||
          (selection.type === "tables" && selection.tableIds.includes(t.id)),
      });
    }
    for (const n of diagram.notes) {
      nodes.push({
        id: n.id,
        type: "note",
        position: n.position,
        data: { note: n, onResizeCommit: handleNoteResizeCommit },
        style: { width: n.size.width, height: n.size.height },
        zIndex: 1,
        selected: selection.type === "note" && selection.noteId === n.id,
      });
    }

    const edges: Edge[] = [];
    for (const rel of diagram.relationships) {
      edges.push({
        id: rel.id,
        type: "relationship",
        source: rel.sourceTableId,
        target: rel.targetTableId,
        sourceHandle: rel.sourceColumnId,
        targetHandle: rel.targetColumnId,
        data: { cardinality: rel.cardinality },
        selected: selection.type === "relationship" && selection.relationshipId === rel.id,
      });
    }
    return { nodes, edges };
  }, [diagram, autoFocusId, selection, handleTableRename, handleGroupResizeCommit, handleNoteResizeCommit]);

  /* ---------------- sync store → RF (skipped mid-drag) ---------------- */
  useEffect(() => {
    if (busyRef.current) return;
    // The zustand `selection` is the single source of truth (kept in sync with
    // canvas clicks via onSelectionChange / onPaneClick), so `desired` already
    // carries the `selected` flags — including selections made from the sidebar.
    // Record what we pushed so handleSelectionChange can ignore RF's echo of it.
    lastPushedSelectionRef.current = selection;
    setNodes(desired.nodes);
    setEdges(desired.edges);
  }, [desired, setNodes, setEdges, selection]);

  /* ---------------- user changes ---------------- */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      let next: Selection | null = null;
      if (selEdges.length === 1 && selNodes.length === 0) {
        next = { type: "relationship", relationshipId: selEdges[0].id };
      } else if (selNodes.length === 1) {
        const id = selNodes[0].id;
        if (isTable(id)) next = { type: "table", tableId: id };
        else if (isGroup(id)) next = { type: "group", groupId: id };
        else if (isNote(id)) next = { type: "note", noteId: id };
        else next = { type: "none" };
      } else if (selNodes.length > 1) {
        if (selNodes.every((n) => isTable(n.id))) {
          next = { type: "tables", tableIds: selNodes.map((n) => n.id) };
        } else {
          next = { type: "none" };
        }
      }
      if (!next) return;
      // During a marquee selection drag React Flow fires this on every
      // mousemove. Pushing each one into the store rebuilds every node/edge
      // and re-renders the whole canvas (slow with many tables). Defer to the
      // end of the drag; React Flow owns the live marquee highlight anyway.
      if (isSelectingRef.current) {
        pendingSelectionRef.current = next;
        return;
      }
      // Ignore the echo of a selection we just pushed into RF via the sync
      // effect; otherwise store→RF→onSelectionChange→store loops forever.
      if (lastPushedSelectionRef.current && isSelectionEqual(lastPushedSelectionRef.current, next)) {
        return;
      }
      setSelection(next);
    },
    [isTable, isGroup, isNote, setSelection],
  );

  const handleSelectionStart = useCallback(() => {
    isSelectingRef.current = true;
    pendingSelectionRef.current = null;
  }, []);

  const handleSelectionEnd = useCallback(() => {
    isSelectingRef.current = false;
    const pending = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    if (pending) setSelection(pending);
  }, [setSelection]);

  const handleNodeDragStart: OnNodeDrag<Node> = useCallback((_, node) => {
    busyRef.current = true;
    if (node.type === "group") {
      const d = useDiagramStore.getState().diagram;
      const group = d.groups.find((g) => g.id === node.id);
      if (group) {
        const memberStart = new Map<string, { x: number; y: number }>();
        for (const t of d.tables) {
          if (t.groupId === group.id) memberStart.set(t.id, { ...t.position });
        }
        for (const n of d.notes) {
          if (n.groupId === group.id) memberStart.set(n.id, { ...n.position });
        }
        groupDragRef.current = {
          groupId: group.id,
          startBounds: { x: group.bounds.x, y: group.bounds.y },
          memberStart,
        };
      }
    }
  }, []);

  const handleNodeDrag: OnNodeDrag<Node> = useCallback((_, node) => {
    const state = groupDragRef.current;
    if (node.type === "group" && state && node.id === state.groupId) {
      const dx = node.position.x - state.startBounds.x;
      const dy = node.position.y - state.startBounds.y;
      setNodes((nds) =>
        nds.map((n) => {
          const start = state.memberStart.get(n.id);
          if (!start) return n;
          return {
            ...n,
            position: { x: start.x + dx, y: start.y + dy },
          };
        }),
      );
    }
  }, [setNodes]);

  const handleNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_, node) => {
      const store = useDiagramStore.getState();
      const d = store.diagram;
      busyRef.current = false;

      if (isTable(node.id)) {
        const table = d.tables.find((t) => t.id === node.id);
        if (!table) return;
        store.moveTable(node.id, node.position);
        const g = groupAtPoint(d, nodeCenter(node));
        if ((g?.id ?? null) !== table.groupId) {
          store.assignTableToGroup(node.id, g?.id ?? null);
        }
      } else if (isNote(node.id)) {
        store.moveNote(node.id, node.position);
        const g = groupAtPoint(d, nodeCenter(node));
        const note = d.notes.find((n) => n.id === node.id);
        if ((g?.id ?? null) !== (note?.groupId ?? null)) {
          store.updateNote(node.id, { groupId: g?.id ?? null });
        }
      } else if (isGroup(node.id)) {
        const state = groupDragRef.current;
        groupDragRef.current = null;
        if (state && node.id === state.groupId) {
          store.moveGroup(
            state.groupId,
            node.position.x - state.startBounds.x,
            node.position.y - state.startBounds.y,
          );
        }
      }
    },
    [isTable, isGroup, isNote],
  );

  /* ---------------- connections ---------------- */
  const isValidConnection = useCallback((conn: Connection | Edge) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return false;
    const d = useDiagramStore.getState().diagram;
    return (
      !!d.tables.find((t) => t.id === conn.source) &&
      !!d.tables.find((t) => t.id === conn.target)
    );
  }, []);

  const handleConnect = useCallback((conn: Connection) => {
    if (!conn.sourceHandle || !conn.targetHandle) return;
    useDiagramStore
      .getState()
      .addRelationship(
        conn.source,
        conn.sourceHandle,
        conn.target,
        conn.targetHandle,
        "one-to-many",
      );
  }, []);

  /* ---------------- tool placement ---------------- */
  const handlePaneMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(".react-flow__pane")) return;
      const tool = useDiagramStore.getState().activeTool;

      if (e.button === 0 && (tool === "table" || tool === "note")) {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const store = useDiagramStore.getState();
        if (tool === "table") {
          const id = store.addTable();
          if (id) {
            store.moveTable(id, pos);
            setAutoFocusId(id);
            window.setTimeout(() => setAutoFocusId(null), 400);
          }
        } else {
          const id = store.addNote();
          if (id) store.moveNote(id, pos);
        }
        store.setActiveTool("select");
        suppressPaneClickRef.current = true;
        window.setTimeout(() => {
          suppressPaneClickRef.current = false;
        }, 500);
        return;
      }

      if (tool !== "group" || e.button !== 0) return;

      const startScreen = { x: e.clientX, y: e.clientY };
      const startFlow = screenToFlowPosition(startScreen);
      let moved = false;
      lastDrawRef.current = null;

      const onMove = (ev: MouseEvent) => {
        moved = true;
        const x = Math.min(startScreen.x, ev.clientX);
        const y = Math.min(startScreen.y, ev.clientY);
        const width = Math.abs(ev.clientX - startScreen.x);
        const height = Math.abs(ev.clientY - startScreen.y);
        const rect = { x, y, width, height };
        lastDrawRef.current = rect;
        setDrawRect(rect);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setDrawRect(null);
        const store = useDiagramStore.getState();
        if (!moved) {
          store.addGroup({
            x: startFlow.x - 200,
            y: startFlow.y - 150,
            width: 400,
            height: 300,
          });
        } else {
          const last = lastDrawRef.current!;
          const endFlow = screenToFlowPosition({
            x: last.x + last.width,
            y: last.y + last.height,
          });
          const topLeftFlow = screenToFlowPosition({ x: last.x, y: last.y });
          store.addGroup({
            x: Math.min(topLeftFlow.x, endFlow.x),
            y: Math.min(topLeftFlow.y, endFlow.y),
            width: Math.abs(endFlow.x - topLeftFlow.x),
            height: Math.abs(endFlow.y - topLeftFlow.y),
          });
        }
        store.setActiveTool("select");
        suppressPaneClickRef.current = true;
        window.setTimeout(() => {
          suppressPaneClickRef.current = false;
        }, 500);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [screenToFlowPosition],
  );

  const handlePaneClick = useCallback(() => {
    if (suppressPaneClickRef.current) {
      suppressPaneClickRef.current = false;
      return;
    }
    const store = useDiagramStore.getState();
    if (store.activeTool === "select") {
      setSelection({ type: "none" });
    }
  }, [setSelection]);

  return (
    <div ref={wrapRef} className="h-full w-full" data-testid="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onSelectionChange={handleSelectionChange}
        onSelectionStart={handleSelectionStart}
        onSelectionEnd={handleSelectionEnd}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onPaneClick={handlePaneClick}
        onMouseDown={handlePaneMouseDown}
        onMove={handleMove}
        deleteKeyCode={null}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.05}
        maxZoom={4}
        selectionOnDrag={activeTool === "select"}
        panOnDrag={activeTool === "pan" ? [0, 1, 2] : [1, 2]}
        panOnScroll
        panOnScrollSpeed={0.5}
        zoomOnScroll={false}
        zoomOnPinch
        panActivationKeyCode="Space"
        selectionMode={SelectionMode.Partial}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={24}
        className="!bg-canvas-bg"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="var(--color-canvas-dot)"
          className={gridVisible ? "" : "hidden"}
        />
        {drawRect && (
          <div
            className="pointer-events-none fixed z-50 rounded-sm border-2 border-brand-500 bg-brand-100/30"
            style={{
              left: drawRect.x,
              top: drawRect.y,
              width: drawRect.width,
              height: drawRect.height,
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
