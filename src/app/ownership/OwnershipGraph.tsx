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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { OwnershipNode, type OwnershipNodeData } from "./OwnershipNode";
import { EntityDetailsPane } from "./EntityDetailsPane";
import type { DbEntity, DbEdge } from "./types";
import {
  addEntity,
  addEdge as addEdgeAction,
  updateEdge,
  deleteEdge,
  updateEntityPositions,
} from "./actions";

const nodeTypes = { ownership: OwnershipNode };

// Width of the details pane (must match EntityDetailsPane). Used to offset
// auto-panning so a focused node lands left of the pane, not behind it.
const PANE_WIDTH = 360;

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
  const rfRef = useRef<ReactFlowInstance | null>(null);

  // Center the viewport on a graph point, shifted right by half the pane width
  // so the focused node sits in the visible area to the left of the pane.
  const focusPoint = useCallback((x: number, y: number) => {
    const inst = rfRef.current;
    if (!inst) return;
    const zoom = inst.getZoom();
    inst.setCenter(x + PANE_WIDTH / 2 / zoom, y, { zoom, duration: 400 });
  }, []);

  // Client-side copy of entities so the pane can find a row immediately after
  // adding, without waiting for revalidatePath to round-trip.
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
          category: e.category,
          subcategory: e.subcategory,
          color: e.color,
          link_count: e.links.length,
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

  async function handleAdd() {
    const name = "New box";
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 200;
    const result = await addEntity({ name, position_x: x, position_y: y });
    if (result.error || !result.id) {
      alert(result.error ?? "Failed to add");
      return;
    }
    const newEntity: DbEntity = {
      id: result.id,
      name,
      category: null,
      subcategory: null,
      email: null,
      notes: null,
      color: null,
      links: [],
      position_x: x,
      position_y: y,
    };
    setEntities((prev) => [...prev, newEntity]);
    setEditingEntityId(result.id);
  }

  // Create a new box already connected as a child (100% ownership by default —
  // click the edge to change it) and switch the pane to it.
  const handleAddChild = useCallback(
    async (parentId: string) => {
      const parent = entities.find((e) => e.id === parentId);
      // Fan multiple children out horizontally so they don't stack on top of
      // each other; place them a row below the parent.
      const siblingCount = edges.filter((e) => e.source === parentId).length;
      const x = (parent?.position_x ?? 100) + siblingCount * 80;
      const y = (parent?.position_y ?? 100) + 170;

      const res = await addEntity({ name: "New box", position_x: x, position_y: y });
      if (res.error || !res.id) {
        alert(res.error ?? "Failed to add child");
        return;
      }
      const childId = res.id;
      const child: DbEntity = {
        id: childId,
        name: "New box",
        category: null,
        subcategory: null,
        email: null,
        notes: null,
        color: null,
        links: [],
        position_x: x,
        position_y: y,
      };
      setEntities((prev) => [...prev, child]);

      const edgeRes = await addEdgeAction({
        parent_id: parentId,
        child_id: childId,
        percentage: 100,
      });
      if (edgeRes.error || !edgeRes.id) {
        alert(edgeRes.error ?? "Created the box but couldn't connect it.");
      } else {
        setEdges((eds) =>
          rfAddEdge(
            {
              id: edgeRes.id!,
              source: parentId,
              target: childId,
              label: "100%",
              labelStyle: { fontWeight: 600, fontSize: 12, fill: "#374151" },
              labelBgStyle: { fill: "#ffffff" },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 4,
              style: { stroke: "#6b7280", strokeWidth: 2 },
            },
            eds,
          ),
        );
      }
      setEditingEntityId(childId);
      focusPoint(x, y);
    },
    [entities, edges, focusPoint],
  );

  function handleEntityUpdated(updated: DbEntity) {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleEntityDeleted(id: string) {
    setEntities((prev) => prev.filter((e) => e.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
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
