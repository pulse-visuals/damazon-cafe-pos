import React from "react";
import { useSettings } from "../context/SettingsContext";

export default function ProductCard({ product, categoryIcon, onClick }) {
  const { fmt } = useSettings();
  const outOfStock = product.track_stock && Number(product.stock_qty) <= 0;
  const unavailable = !product.available || outOfStock;

  return (
    <button
      onClick={() => !unavailable && onClick(product)}
      disabled={unavailable}
      className={`group relative flex flex-col overflow-hidden rounded-xl2 border border-canopy-100 bg-white text-left shadow-card transition-all
        dark:border-canopy-800 dark:bg-canopy-900
        ${unavailable ? "opacity-50 grayscale" : "hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:scale-[0.98]"}`}
    >
      <div className="flex h-20 items-center justify-center bg-gradient-to-br from-canopy-100 to-amber-100 text-4xl dark:from-canopy-800 dark:to-canopy-700">
        {categoryIcon || "🍽️"}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-semibold text-canopy-900 dark:text-canopy-50">{product.name}</div>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-display text-base font-semibold text-canopy-700 dark:text-amber-300">
            {fmt(product.price)}
          </span>
          {product.prep_time_minutes ? (
            <span className="text-[11px] text-canopy-400">{product.prep_time_minutes}m</span>
          ) : null}
        </div>
      </div>
      {unavailable && (
        <div className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          Out of stock
        </div>
      )}
    </button>
  );
}
