"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodePositionChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { OwnershipNode, type OwnershipNodeData } from "./OwnershipNode";
import { EntityDetailsPane } from "./EntityDetailsPane";
import type { DbEntity, DbEdge } from "./types";
import * as store from "./store";

const nodeTypes = { ownership: OwnershipNode };

// Width of the details pane (must match EntityDetailsPane). Used to offset
// auto-panning so a focused node lands left of the pane, not behind it.
const PANE_WIDTH = 360;

const EDGE_STYLE = {
  labelStyle: { fontWeight: 600, fontSize: 12, fill: "#374151" },
  labelBgStyle: { fill: "#ffffff" },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
  style: { stroke: "#6b7280", strokeWidth: 2 },
};

function pctLabel(p: number) {
  return `${Number(p).toFixed(Number(p) % 1 === 0 ? 0 : 2)}%`;
}

export function OwnershipGraph() {
  const [entities, setEntities] = useState<DbEntity[]>([]);
  const [dbEdges, setDbEdges] = useState<DbEdge[]>([]);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  // localStorage is browser-only, so load after mount.
  useEffect(() => {
    const g = store.loadGraph();
    setEntities(g.entities);
    setDbEdges(g.edges);
  }, []);

  // For each child entity, sum the percentages / count of its incoming edges.
  const inboundTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of dbEdges) m.set(e.child_id, (m.get(e.child_id) ?? 0) + Number(e.percentage));
    return m;
  }, [dbEdges]);

  const inboundCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of dbEdges) m.set(e.child_id, (m.get(e.child_id) ?? 0) + 1);
    return m;
  }, [dbEdges]);

  const toRFNodes = useCallback(
    (list: DbEntity[]): Node[] =>
      list.map((e) => ({
        id: e.id,
        type: "ownership",
        position: {
          x: e.position_x ?? Math.random() * 600,
          y: e.position_y ?? Math.random() * 400,
        },
        data: {
          name: e.name,
          category: e.category,
          subcategory: e.subcategory,
          color: e.color,
          link_count: e.links.length,
          inbound_total_pct: inboundCounts.get(e.id) ? inboundTotals.get(e.id) ?? 0 : null,
          is_root: !inboundCounts.get(e.id),
          onClick: () => setEditingEntityId(e.id),
        } satisfies OwnershipNodeData,
      })),
    [inboundTotals, inboundCounts],
  );

  const toRFEdges = useCallback(
    (list: DbEdge[]): Edge[] =>
      list.map((e) => ({
        id: e.id,
        source: e.parent_id,
        target: e.child_id,
        label: pctLabel(e.percentage),
        ...EDGE_STYLE,
      })),
    [],
  );

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    setNodes(toRFNodes(entities));
  }, [entities, toRFNodes]);

  useEffect(() => {
    setEdges(toRFEdges(dbEdges));
  }, [dbEdges, toRFEdges]);

  // Debounce position saves so we don't write on every drag pixel.
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const flushPositionSaves = useCallback(() => {
    if (pendingPositions.current.size === 0) return;
    const positions = Array.from(pendingPositions.current.entries()).map(
      ([id, p]) => ({ id, x: p.x, y: p.y }),
    );
    pendingPositions.current.clear();
    store.updateEntityPositions(positions);
    const map = new Map(positions.map((p) => [p.id, p]));
    setEntities((prev) =>
      prev.map((e) => {
        const p = map.get(e.id);
        return p ? { ...e, position_x: p.x, position_y: p.y } : e;
      }),
    );
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

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    const pctStr = window.prompt("Ownership percentage (0–100):", "100");
    if (pctStr === null) return;
    const pct = parseFloat(pctStr);
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      alert("Percentage must be a number between 0 and 100.");
      return;
    }
    const res = store.addEdge({
      parent_id: params.source,
      child_id: params.target,
      percentage: pct,
    });
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setDbEdges((prev) => [...prev, res.edge]);
  }, []);

  function handleEdgeClick(edge: Edge) {
    const action = window.prompt(
      `Edit edge: enter new % (0–100), or "delete" to remove. Currently: ${edge.label}`,
      String(edge.label).replace("%", ""),
    );
    if (action === null) return;
    if (action.trim().toLowerCase() === "delete") {
      store.deleteEdge(edge.id);
      setDbEdges((prev) => prev.filter((e) => e.id !== edge.id));
      return;
    }
    const pct = parseFloat(action);
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      alert("Percentage must be a number between 0 and 100.");
      return;
    }
    store.updateEdge(edge.id, { percentage: pct });
    setDbEdges((prev) => prev.map((e) => (e.id === edge.id ? { ...e, percentage: pct } : e)));
  }

  // Center the viewport on a graph point, shifted right by half the pane width
  // so the focused node sits in the visible area to the left of the pane.
  const focusPoint = useCallback((x: number, y: number) => {
    const inst = rfRef.current;
    if (!inst) return;
    const zoom = inst.getZoom();
    inst.setCenter(x + PANE_WIDTH / 2 / zoom, y, { zoom, duration: 400 });
  }, []);

  function handleAdd() {
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 200;
    const entity = store.addEntity({ name: "New box", position_x: x, position_y: y });
    setEntities((prev) => [...prev, entity]);
    setEditingEntityId(entity.id);
  }

  // Create a new box already connected as a child (100% by default — click the
  // edge to change it) and switch the pane to it.
  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = entities.find((e) => e.id === parentId);
      const siblingCount = dbEdges.filter((e) => e.parent_id === parentId).length;
      const x = (parent?.position_x ?? 100) + siblingCount * 80;
      const y = (parent?.position_y ?? 100) + 170;

      const child = store.addEntity({ name: "New box", position_x: x, position_y: y });
      setEntities((prev) => [...prev, child]);

      const res = store.addEdge({ parent_id: parentId, child_id: child.id, percentage: 100 });
      if (!res.ok) {
        alert(res.error);
      } else {
        setDbEdges((prev) => [...prev, res.edge]);
      }
      setEditingEntityId(child.id);
      focusPoint(x, y);
    },
    [entities, dbEdges, focusPoint],
  );

  function handleEntityUpdated(updated: DbEntity) {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleEntityDeleted(id: string) {
    setEntities((prev) => prev.filter((e) => e.id !== id));
    setDbEdges((prev) => prev.filter((e) => e.parent_id !== id && e.child_id !== id));
  }

  const editingEntity = editingEntityId
    ? entities.find((e) => e.id === editingEntityId) ?? null
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-90px)]">
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-black text-white px-3 py-1.5 text-sm hover:bg-gray-800"
        >
          + Add box
        </button>
        <span className="ml-auto text-xs text-gray-500">
          Click a box to edit it. Drag from the bottom of a box to another
          box&rsquo;s top to create an ownership edge; click any edge to edit
          its %.
        </span>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_e, edge) => handleEdgeClick(edge)}
          onPaneClick={() => setEditingEntityId(null)}
          onInit={(inst) => { rfRef.current = inst; }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>

        {editingEntity && (
          <EntityDetailsPane
            key={editingEntity.id}
            entity={editingEntity}
            onClose={() => setEditingEntityId(null)}
            onUpdated={handleEntityUpdated}
            onDeleted={handleEntityDeleted}
            onAddChild={handleAddChild}
          />
        )}
      </div>
    </div>
  );
}
