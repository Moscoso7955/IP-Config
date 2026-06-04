"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export type OwnershipNodeData = {
  name: string;
  entity_type: "individual" | "company";
  email: string | null;
  // Sum of incoming-edge percentages. Lets us flag "this entity only has 65%
  // accounted for — who owns the remaining 35%?".
  inbound_total_pct: number | null;
  // True when the node has no parents — typically the people / top-level
  // shareholders.
  is_root: boolean;
  onClick: () => void;
};

export function OwnershipNode({ data, selected }: NodeProps) {
  const d = data as unknown as OwnershipNodeData;
  const isIndividual = d.entity_type === "individual";
  const hasEmail = !!d.email;
  const pct = d.inbound_total_pct;
  const pctIncomplete = !d.is_root && pct !== null && pct < 100;
  const pctOver = pct !== null && pct > 100;

  return (
    <div
      className={[
        "min-w-[160px] max-w-[220px] rounded-2xl bg-white px-4 py-3 text-center transition-shadow cursor-pointer",
        "border-2",
        selected ? "border-blue-500 shadow-lg" : "border-gray-300 shadow-sm hover:shadow-md",
        isIndividual ? "" : "bg-blue-50",
      ].join(" ")}
      onClick={() => d.onClick()}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#888" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#888" }} />

      <div className="text-sm font-medium text-gray-900 leading-tight">
        {d.name || <span className="text-gray-400 italic">unnamed</span>}
      </div>
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
      {isIndividual && (
        <div className="text-[10px] mt-1 uppercase tracking-wider">
          {hasEmail ? (
            <span className="text-green-700">● {d.email}</span>
          ) : (
            <span className="text-gray-400">no email</span>
          )}
        </div>
      )}
      {!isIndividual && (
        <div className="text-[10px] mt-1 uppercase tracking-wider text-gray-400">
          entity
        </div>
      )}
    </div>
  );
}
