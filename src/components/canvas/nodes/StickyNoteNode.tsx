import { memo, useEffect, useState } from "react";
import type { NodeProps } from "@xyflow/react";

import { NOTE_FONT_SIZES } from "#/lib/utils/palettes";
import { ResizeHandles, type Rect } from "./ResizeHandles";
import type { StickyNoteCanvasNode } from "./types";

function StickyNoteNodeInner({ data, selected }: NodeProps<StickyNoteCanvasNode>) {
  const note = data.note;
  const [liveRect, setLiveRect] = useState<Rect | null>(null);

  useEffect(() => {
    setLiveRect(null);
  }, [note.size]);

  const rect: Rect = liveRect ?? {
    x: 0,
    y: 0,
    width: note.size.width,
    height: note.size.height,
  };

  return (
    <div
      className="relative rounded-sm shadow-sm"
      style={{
        width: rect.width,
        height: rect.height,
        backgroundColor: note.color,
        fontSize: NOTE_FONT_SIZES[note.fontSize],
        transform: selected ? "rotate(-1.5deg)" : "rotate(0.5deg)",
      }}
    >
      <div className="no-scrollbar h-full w-full overflow-y-auto whitespace-pre-wrap p-2 text-zinc-800">
        {note.content || " "}
      </div>
      {selected && (
        <ResizeHandles
          onLive={setLiveRect}
          onEnd={(final) => {
            setLiveRect(null);
            data.onResizeCommit(note.id, note.position, {
              width: final.width,
              height: final.height,
            });
          }}
        />
      )}
    </div>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeInner);
