"use client";

import { useState } from "react";
import { updateEntity, deleteEntity } from "./store";
import { MAX_LINKS, type DbEntity, type EntityLink } from "./types";

const DEFAULT_COLOR = "#3b82f6";

export function EntityDetailsPane({
  entity,
  onClose,
  onUpdated,
  onDeleted,
  onAddChild,
}: {
  entity: DbEntity;
  onClose: () => void;
  onUpdated: (entity: DbEntity) => void;
  onDeleted: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [name, setName] = useState(entity.name);
  const [category, setCategory] = useState(entity.category ?? "");
  const [subcategory, setSubcategory] = useState(entity.subcategory ?? "");
  const [email, setEmail] = useState(entity.email ?? "");
  const [notes, setNotes] = useState(entity.notes ?? "");
  const [color, setColor] = useState<string | null>(entity.color);
  const [links, setLinks] = useState<EntityLink[]>(entity.links);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setLink(i: number, patch: Partial<EntityLink>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    setSaved(false);
  }
  function addLink() {
    if (links.length >= MAX_LINKS) return;
    setLinks((prev) => [...prev, { label: "", url: "" }]);
    setSaved(false);
  }
  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  // Persist the current pane fields to the browser store, then notify the
  // parent so the canvas reflects the change.
  function persist() {
    setError(null);
    const cleanLinks = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url !== "" || l.label !== "");
    const patch = {
      name: name.trim(),
      category: category.trim() || null,
      subcategory: subcategory.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
      color,
      links: cleanLinks,
    };
    updateEntity(entity.id, patch);
    onUpdated({ ...entity, ...patch });
  }

  function handleSave() {
    persist();
    setSaved(true);
  }

  // Save this box, then create a new box already connected below it and switch
  // the pane to the new child.
  function handleAddChild() {
    persist();
    onAddChild(entity.id);
  }

  function handleDelete() {
    if (!confirm("Delete this box? All connected edges will also be removed.")) return;
    deleteEntity(entity.id);
    onDeleted(entity.id);
    onClose();
  }

  const fieldClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <aside className="absolute top-0 right-0 h-full w-[360px] max-w-[90vw] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-semibold">Edit box</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-900 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
            placeholder="e.g. Acme Holdings, Widget App, US Patent 1234"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Parent label</label>
            <input
              type="text"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSaved(false); }}
              placeholder="Owner / Product / IP"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sub</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => { setSubcategory(e.target.value); setSaved(false); }}
              placeholder="SaaS / Patent / LLC"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color ?? DEFAULT_COLOR}
              onChange={(e) => { setColor(e.target.value); setSaved(false); }}
              className="h-9 w-12 rounded border border-gray-300 bg-white p-0.5 cursor-pointer"
            />
            <input
              type="text"
              value={color ?? ""}
              onChange={(e) => { setColor(e.target.value || null); setSaved(false); }}
              placeholder="#3b82f6"
              className={`${fieldClass} font-mono`}
            />
            {color && (
              <button
                type="button"
                onClick={() => { setColor(null); setSaved(false); }}
                className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
            placeholder="optional"
            className={fieldClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">
              Links <span className="text-gray-400 font-normal">({links.length}/{MAX_LINKS})</span>
            </label>
            <button
              type="button"
              onClick={addLink}
              disabled={links.length >= MAX_LINKS}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
            >
              + Add link
            </button>
          </div>
          <div className="space-y-2">
            {links.length === 0 && (
              <p className="text-xs text-gray-400">No links yet.</p>
            )}
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={l.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  placeholder="Label"
                  className="w-1/3 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="url"
                  value={l.url}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  placeholder="https://…"
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-gray-400 hover:text-red-600 text-lg leading-none px-1"
                  aria-label="Remove link"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="optional"
            rows={3}
            className={fieldClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleAddChild}
          className="w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          + Add child (connected below)
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved ✓</span>}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </aside>
  );
}
