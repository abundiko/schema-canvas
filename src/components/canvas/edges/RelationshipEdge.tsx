import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import type { Cardinality } from "#/types/diagram";
import type { RelationshipEdgeData } from "../nodes/types";

function sourceLabel(c: Cardinality): string {
  if (c === "one-to-one") return "1";
  if (c === "many-to-many") return "∞";
  return "1";
}

function targetLabel(c: Cardinality): string {
  if (c === "one-to-one") return "1";
  if (c === "many-to-many") return "∞";
  return "∞";
}

function RelationshipEdgeInner(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const cardinality: Cardinality = (data as RelationshipEdgeData | undefined)?.cardinality ?? "one-to-many";

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const sx = sourceX + ux * 14;
  const sy = sourceY + uy * 14;
  const tx = targetX - ux * 14;
  const ty = targetY - uy * 14;

  return (
    <>
      <BaseEdge path={path} />
      <g style={{ pointerEvents: "none" }}>
        <circle cx={sx} cy={sy} r={7} fill="#fff" stroke="#a1a1aa" strokeWidth={1.2} />
        <text
          x={sx}
          y={sy + 3.5}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#52525b"
        >
          {sourceLabel(cardinality)}
        </text>
        <circle cx={tx} cy={ty} r={7} fill="#fff" stroke="#a1a1aa" strokeWidth={1.2} />
        <text
          x={tx}
          y={ty + 3.5}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#52525b"
        >
          {targetLabel(cardinality)}
        </text>
      </g>
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeInner);
