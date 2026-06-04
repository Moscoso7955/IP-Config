import { OwnershipGraph } from "./OwnershipGraph";

export default function OwnershipPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-xl font-semibold">Ownership &amp; IP map</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Add boxes for people, entities, products, and IP. Drag from one to
          another to define ownership percentages. Your map is saved in this
          browser.
        </p>
      </div>

      <OwnershipGraph />
    </main>
  );
}
