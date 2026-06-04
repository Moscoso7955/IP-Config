"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export type OwnershipNodeData = {
  name: string;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  link_count: number;
  // Sum of incoming-edge percentages. Lets us flag "this entity only has 65%
  // accounted for — who owns the remaining 35%?".
  inbound_total_pct: number | null;
  // True when the node has no parents (no incoming ownership edges).
  is_root: boolean;
  onClick: () => void;
};

export function OwnershipNode({ data, selected }: NodeProps) {
  const d = data as unknown as OwnershipNodeData;
  const pct = d.inbound_total_pct;
  const pctIncomplete = !d.is_root && pct !== null && pct < 100;
  const pctOver = pct !== null && pct > 100;

  // Custom color drives the border and a faint background tint; text stays dark
  // for contrast. "RRGGBB" + alpha hex gives a light wash of the chosen color.
  const color = d.color;
  const style: React.CSSProperties = color
    ? { borderColor: color, backgroundColor: `${color}14` }
    : {};

  return (
    <div
      className={[
        "min-w-[170px] max-w-[230px] rounded-2xl px-4 py-3 text-center transition-shadow cursor-pointer border-2",
        color
          ? "bg-white"
          : "bg-white border-gray-300",
        selected ? "ring-2 ring-blue-500 shadow-lg" : "shadow-sm hover:shadow-md",
      ].join(" ")}
      style={style}
      onClick={() => d.onClick()}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#888" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#888" }} />

      {d.category && (
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: color ?? "#6b7280" }}
        >
          {d.category}
        </div>
      )}

      <div className="text-sm font-medium text-gray-900 leading-tight">
        {d.name || <span className="text-gray-400 italic">unnamed</span>}
      </div>

      {d.subcategory && (
        <div className="text-xs text-gray-500 mt-0.5">{d.subcategory}</div>
      )}

      {pct !== null && (
        <div
          className={`text-xs mt-1 font-medium ${
            pctOver ? "text-red-600" : pctIncomplete ? "text-amber-600" : "text-gray-500"
          }`}
        >
          {pct.toFixed(pct % 1 === 0 ? 0 : 2)}%
          {pctIncomplete && " (incomplete)"}
          {pctOver && " (over)"}
        </div>
      )}

      {d.link_count > 0 && (
        <div className="text-[10px] mt-1 text-gray-400">
          🔗 {d.link_count} link{d.link_count === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
