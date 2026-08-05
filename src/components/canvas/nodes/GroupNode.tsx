import { memo, useEffect, useState } from "react";
import type { NodeProps } from "@xyflow/react";

import type { GroupNode as GroupNodeType } from "./types";
import { ResizeHandles, type Rect } from "./ResizeHandles";

function GroupNodeInner({ data, selected }: NodeProps<GroupNodeType>) {
  const group = data.group;
  const [liveRect, setLiveRect] = useState<Rect | null>(null);

  useEffect(() => {
    setLiveRect(null);
  }, [group.bounds]);

  const rect: Rect = liveRect ?? {
    x: 0,
    y: 0,
    width: group.bounds.width,
    height: group.bounds.height,
  };

  return (
    <div
      className="relative rounded-xl"
      style={{ width: rect.width, height: rect.height }}
    >
      <div
        className="absolute inset-0 rounded-xl border-2 border-dashed"
        style={{
          borderColor: group.color,
          backgroundColor: `${group.color}1a`,
        }}
      />
      {/* header tab */}
      <div
        className="absolute -top-3.5 left-3 flex h-7 cursor-grab items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-white shadow-sm active:cursor-grabbing"
        style={{ backgroundColor: group.color }}
      >
        {group.name || "Untitled group"}
      </div>
      {selected && (
        <ResizeHandles
          onLive={setLiveRect}
          onEnd={(final) => {
            setLiveRect(null);
            data.onResizeCommit(group.id, {
              x: group.bounds.x,
              y: group.bounds.y,
              width: final.width,
              height: final.height,
            });
          }}
        />
      )}
    </div>
  );
}

export const GroupNode = memo(GroupNodeInner);
