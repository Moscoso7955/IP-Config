"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodePositionChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { OwnershipNode, type OwnershipNodeData } from "./OwnershipNode";
import { EntityEditModal } from "./EntityEditModal";
import {
  addEntity,
  addEdge as addEdgeAction,
  updateEdge,
  deleteEdge,
  updateEntityPositions,
} from "./actions";

const nodeTypes = { ownership: OwnershipNode };

type DbEntity = {
  id: string;
  name: string;
  entity_type: "individual" | "company";
  email: string | null;
  position_x: number | null;
  position_y: number | null;
};

type DbEdge = {
  id: string;
  parent_id: string;
  child_id: string;
  percentage: number;
};

export function OwnershipGraph({
  initialEntities,
  initialEdges,
}: {
  initialEntities: DbEntity[];
  initialEdges: DbEdge[];
}) {
  // For each child entity, sum the percentages of its incoming edges.
  const inboundTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of initialEdges) {
      m.set(e.child_id, (m.get(e.child_id) ?? 0) + Number(e.percentage));
    }
    return m;
  }, [initialEdges]);

  const inboundCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of initialEdges) {
      m.set(e.child_id, (m.get(e.child_id) ?? 0) + 1);
    }
    return m;
  }, [initialEdges]);

  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Client-side copy of entities so the modal can find a row immediately
  // after adding, without waiting for revalidatePath to round-trip.
  const [entities, setEntities] = useState<DbEntity[]>(initialEntities);

  const toRFNodes = useCallback(
    (entities: DbEntity[]): Node[] =>
      entities.map((e) => ({
        id: e.id,
        type: "ownership",
        position: {
          x: e.position_x ?? Math.random() * 600,
          y: e.position_y ?? Math.random() * 400,
        },
        data: {
          name: e.name,
          entity_type: e.entity_type,
          email: e.email,
          inbound_total_pct: inboundCounts.get(e.id)
            ? inboundTotals.get(e.id) ?? 0
            : null,
          is_root: !inboundCounts.get(e.id),
          onClick: () => setEditingEntityId(e.id),
        } satisfies OwnershipNodeData,
      })),
    [inboundTotals, inboundCounts],
  );

  const toRFEdges = useCallback(
    (edges: DbEdge[]): Edge[] =>
      edges.map((e) => ({
        id: e.id,
        source: e.parent_id,
        target: e.child_id,
        label: `${Number(e.percentage).toFixed(Number(e.percentage) % 1 === 0 ? 0 : 2)}%`,
        labelStyle: { fontWeight: 600, fontSize: 12, fill: "#374151" },
        labelBgStyle: { fill: "#ffffff" },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        style: { stroke: "#6b7280", strokeWidth: 2 },
      })),
    [],
  );

  const [nodes, setNodes] = useState<Node[]>(() => toRFNodes(entities));
  const [edges, setEdges] = useState<Edge[]>(() => toRFEdges(initialEdges));

  useEffect(() => {
    setNodes(toRFNodes(entities));
  }, [entities, toRFNodes]);

  useEffect(() => {
    setEdges(toRFEdges(initialEdges));
  }, [initialEdges, toRFEdges]);

  // Reconcile with server pushes — new server entities win; preserve any
  // client-only optimistic adds we haven't seen on the server yet.
  useEffect(() => {
    setEntities((prev) => {
      const serverIds = new Set(initialEntities.map((e) => e.id));
      const clientOnly = prev.filter((e) => !serverIds.has(e.id));
      return [...initialEntities, ...clientOnly];
    });
  }, [initialEntities]);

  // Debounce position saves so we don't fire a request per drag pixel.
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const flushPositionSaves = useCallback(async () => {
    if (pendingPositions.current.size === 0) return;
    const positions = Array.from(pendingPositions.current.entries()).map(
      ([id, p]) => ({ id, x: p.x, y: p.y }),
    );
    pendingPositions.current.clear();
    await updateEntityPositions(positions);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      for (const c of changes) {
        if (c.type === "position" && (c as NodePositionChange).position) {
          const pos = (c as NodePositionChange).position!;
          pendingPositions.current.set(c.id, { x: pos.x, y: pos.y });
        }
      }
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(flushPositionSaves, 400);
    },
    [flushPositionSaves],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      const pctStr = window.prompt("Ownership percentage (0–100):", "100");
      if (pctStr === null) return;
      const pct = parseFloat(pctStr);
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
        alert("Percentage must be a number between 0 and 100.");
        return;
      }
      const result = await addEdgeAction({
        parent_id: params.source,
        child_id: params.target,
        percentage: pct,
      });
      if (result.error) {
        alert(result.error);
        return;
      }
      setEdges((eds) =>
        rfAddEdge(
          {
            id: result.id!,
            source: params.source!,
            target: params.target!,
            label: `${pct}%`,
            labelStyle: { fontWeight: 600, fontSize: 12, fill: "#374151" },
            labelBgStyle: { fill: "#ffffff" },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4,
            style: { stroke: "#6b7280", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [],
  );

  async function handleEdgeClick(edge: Edge) {
    const action = window.prompt(
      `Edit edge: enter new % (0–100), or "delete" to remove. Currently: ${edge.label}`,
      String(edge.label).replace("%", ""),
    );
    if (action === null) return;
    if (action.trim().toLowerCase() === "delete") {
      const r = await deleteEdge(edge.id);
      if (r.error) return alert(r.error);
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      return;
    }
    const pct = parseFloat(action);
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      alert("Percentage must be a number between 0 and 100.");
      return;
    }
    const r = await updateEdge(edge.id, { percentage: pct });
    if (r.error) return alert(r.error);
    setEdges((eds) =>
      eds.map((e) => (e.id === edge.id ? { ...e, label: `${pct}%` } : e)),
    );
  }

  async function handleAdd(entity_type: "individual" | "company") {
    const name = entity_type === "individual" ? "New person" : "New entity";
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 200;
    const result = await addEntity({
      name,
      entity_type,
      position_x: x,
      position_y: y,
    });
    if (result.error || !result.id) {
      alert(result.error ?? "Failed to add");
      return;
    }
    const newEntity: DbEntity = {
      id: result.id,
      name,
      entity_type,
      email: null,
      position_x: x,
      position_y: y,
    };
    setEntities((prev) => [...prev, newEntity]);
    setEditingEntityId(result.id);
  }

  function handleEntityUpdated(updated: DbEntity) {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleEntityDeleted(id: string) {
    setEntities((prev) => prev.filter((e) => e.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-90px)]">
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => handleAdd("individual")}
          className="rounded-md bg-black text-white px-3 py-1.5 text-sm hover:bg-gray-800"
        >
          + Person
        </button>
        <button
          type="button"
          onClick={() => handleAdd("company")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + Entity
        </button>
        <span className="ml-auto text-xs text-gray-500">
          Drag from the bottom of a node to another node&rsquo;s top to create an
          ownership edge. Click any edge to edit its %.
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_e, edge) => handleEdgeClick(edge)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {editingEntityId && (() => {
        const entity = entities.find((e) => e.id === editingEntityId);
        if (!entity) {
          setEditingEntityId(null);
          return null;
        }
        return (
          <EntityEditModal
            entity={entity}
            onClose={() => setEditingEntityId(null)}
            onUpdated={handleEntityUpdated}
            onDeleted={handleEntityDeleted}
          />
        );
      })()}
    </div>
  );
}
