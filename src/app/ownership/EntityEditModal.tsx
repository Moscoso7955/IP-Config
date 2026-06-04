"use client";

import { useState, useTransition } from "react";
import { updateEntity, deleteEntity } from "./actions";

type Entity = {
  id: string;
  name: string;
  entity_type: "individual" | "company";
  email: string | null;
  position_x: number | null;
  position_y: number | null;
};

export function EntityEditModal({
  entity,
  onClose,
  onUpdated,
  onDeleted,
}: {
  entity: Entity;
  onClose: () => void;
  onUpdated: (entity: Entity) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(entity.name);
  const [entityType, setEntityType] = useState(entity.entity_type);
  const [email, setEmail] = useState(entity.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = entityType === "individual" ? email.trim() || null : null;
    startTransition(async () => {
      const r = await updateEntity(entity.id, {
        name: trimmedName,
        entity_type: entityType,
        email: trimmedEmail,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      onUpdated({
        ...entity,
        name: trimmedName,
        entity_type: entityType,
        email: trimmedEmail,
      });
      onClose();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this node? All connected edges will also be removed.")) return;
    startTransition(async () => {
      const r = await deleteEntity(entity.id);
      if (r.error) {
        setError(r.error);
        return;
      }
      onDeleted(entity.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit node</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntityType("individual")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                entityType === "individual"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              Person
            </button>
            <button
              type="button"
              onClick={() => setEntityType("company")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                entityType === "company"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              Entity (LLC, corp, holding)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={entityType === "individual" ? "Jane Smith" : "Acme Holdings LLC"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {entityType === "individual" && (
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !name.trim()}
              className="rounded-md bg-black text-white px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
