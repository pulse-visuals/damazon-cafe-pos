import React, { useMemo, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { lineUnitPrice } from "../lib/cart";

export default function ModifierModal({ product, onClose, onAdd }) {
  const { fmt } = useSettings();
  const groups = product.modifierGroups || [];
  const [selected, setSelected] = useState({}); // groupId -> [optionId,...]
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const toggleOption = (group, option) => {
    setSelected((prev) => {
      const current = prev[group.id] || [];
      const isSelected = current.includes(option.id);
      const max = group.max_select ?? 1;
      let next;
      if (isSelected) {
        next = current.filter((id) => id !== option.id);
      } else if (max <= 1) {
        next = [option.id];
      } else if (current.length < max) {
        next = [...current, option.id];
      } else {
        next = current; // at max, ignore
      }
      return { ...prev, [group.id]: next };
    });
  };

  const chosenOptions = useMemo(() => {
    const opts = [];
    for (const g of groups) {
      for (const id of selected[g.id] || []) {
        const opt = g.options.find((o) => o.id === id);
        if (opt) opts.push(opt);
      }
    }
    return opts;
  }, [selected, groups]);

  const unitPrice = lineUnitPrice(product, chosenOptions);
  const canAdd = groups.every((g) => (selected[g.id]?.length || 0) >= (g.min_select || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="animate-slide-up flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-pop dark:bg-canopy-900 md:max-w-md md:rounded-xl2">
        <div className="flex items-center justify-between border-b border-canopy-100 p-4 dark:border-canopy-800">
          <div>
            <h3 className="font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">{product.name}</h3>
            <p className="text-sm text-canopy-500 dark:text-canopy-400">{fmt(product.price)} base</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-canopy-400 hover:bg-canopy-50 dark:hover:bg-canopy-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {groups.map((g) => (
            <div key={g.id} className="mb-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="text-sm font-semibold text-canopy-800 dark:text-canopy-100">{g.name}</h4>
                <span className="text-xs text-canopy-400">
                  {g.max_select > 1 ? `choose up to ${g.max_select}` : "choose one"}
                  {g.min_select > 0 ? " · required" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const isSelected = (selected[g.id] || []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOption(g, o)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        isSelected
                          ? "border-canopy-700 bg-canopy-700 text-white"
                          : "border-canopy-200 text-canopy-700 hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-200 dark:hover:bg-canopy-800"
                      }`}
                    >
                      {o.name}
                      {Number(o.priceDelta) > 0 && <span className="ml-1 opacity-75">+{fmt(o.priceDelta)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mb-4">
            <h4 className="mb-2 text-sm font-semibold text-canopy-800 dark:text-canopy-100">Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no ice, allergy note..."
              className="w-full resize-none rounded-xl border border-canopy-200 bg-cream p-3 text-sm text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-canopy-100 p-4 dark:border-canopy-800">
          <div className="flex items-center gap-3 rounded-full border border-canopy-200 px-2 py-1 dark:border-canopy-700">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-canopy-600 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center font-semibold text-canopy-900 dark:text-canopy-50">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-canopy-600 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            disabled={!canAdd}
            onClick={() => onAdd({ product, qty, notes: notes.trim() || null, modifiers: chosenOptions })}
            className="flex-1 rounded-xl bg-canopy-700 py-3 font-semibold text-white shadow-card transition hover:bg-canopy-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add · {fmt(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
