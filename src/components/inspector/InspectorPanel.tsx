import { useDiagramStore } from "#/lib/store/diagramStore";
import { useSelectedGroup, useSelectedNote, useSelectedRelationship, useSelectedTable } from "#/lib/store/selectors";
import { TableList } from "./TableList";
import { TableEditor } from "./TableEditor";
import { GroupEditor } from "./GroupEditor";
import { StickyNoteEditor } from "./StickyNoteEditor";
import { RelationshipInspector } from "./RelationshipInspector";

export function InspectorPanel() {
  const selection = useDiagramStore((s) => s.selection);
  const table = useSelectedTable();
  const group = useSelectedGroup();
  const note = useSelectedNote();
  const relationship = useSelectedRelationship();

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-panel-bg shadow-panel">
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {selection.type === "none" && <TableList />}
        {selection.type === "table" && table && (
          <div className="p-3">
            <TableEditor table={table} />
          </div>
        )}
        {selection.type === "tables" && <TableList />}
        {selection.type === "group" && group && (
          <div className="p-3">
            <GroupEditor group={group} />
          </div>
        )}
        {selection.type === "note" && note && (
          <div className="p-3">
            <StickyNoteEditor note={note} />
          </div>
        )}
        {selection.type === "relationship" && relationship && (
          <div className="p-3">
            <RelationshipInspector relationship={relationship} />
          </div>
        )}
      </div>
    </div>
  );
}
