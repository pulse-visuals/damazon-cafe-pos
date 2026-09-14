import React, { useEffect, useMemo, useState } from "react";
import { Search, Barcode } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import CartPanel from "../components/CartPanel";
import ModifierModal from "../components/ModifierModal";
import CheckoutModal from "../components/CheckoutModal";
import { lineKey, lineUnitPrice } from "../lib/cart";

export default function POS() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("DINE_IN");
  const [tableId, setTableId] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [orderNotes, setOrderNotes] = useState("");

  const [modalProduct, setModalProduct] = useState(null);
  const [productDetailCache, setProductDetailCache] = useState({});
  const [busy, setBusy] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [cats, prods, tbls] = await Promise.all([
        api.get("/categories"),
        api.get("/products"),
        api.get("/tables"),
      ]);
      setCategories(cats.filter((c) => c.active));
      setProducts(prods);
      setTables(tbls);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryIconFor = (categoryId) => categories.find((c) => c.id === categoryId)?.icon;

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") list = list.filter((p) => p.category_id === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const openProduct = async (product) => {
    let detail = productDetailCache[product.id];
    if (!detail) {
      try {
        detail = await api.get(`/products/${product.id}`);
        setProductDetailCache((c) => ({ ...c, [product.id]: detail }));
      } catch (err) {
        toast.error(err.message);
        return;
      }
    }
    if (!detail.modifierGroups?.length) {
      addToCart({ product, qty: 1, notes: null, modifiers: [] });
    } else {
      setModalProduct(detail);
    }
  };

  const addToCart = ({ product, qty, notes, modifiers }) => {
    const key = lineKey(product.id, modifiers.map((m) => m.id));
    const unitPrice = lineUnitPrice(product, modifiers);
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key && l.notes === notes);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { key: `${key}::${Date.now()}`, product, qty, notes, modifiers, unitPrice }];
    });
    setModalProduct(null);
    toast.success(`${product.name} added`);
  };

  const updateQty = (key, qty) => {
    if (qty < 1) return removeItem(key);
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)));
  };
  const removeItem = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  const buildOrderPayload = () => ({
    type: orderType,
    tableId: orderType === "DINE_IN" ? tableId : undefined,
    guestCount: orderType === "DINE_IN" ? guestCount : undefined,
    notes: orderNotes || undefined,
    items: cart.map((l) => ({
      productId: l.product.id,
      qty: l.qty,
      notes: l.notes || undefined,
      modifierOptionIds: l.modifiers.map((m) => m.id),
    })),
  });

  const resetCart = () => {
    setCart([]);
    setOrderNotes("");
    setTableId("");
  };

  const sendOrder = async () => {
    setBusy(true);
    try {
      const order = await api.post("/orders", buildOrderPayload());
      toast.success(`${order.order_number} sent!`);
      resetCart();
      loadCatalog();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const chargeNow = async () => {
    setBusy(true);
    try {
      const order = await api.post("/orders", buildOrderPayload());
      setCheckoutOrder(order);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 border-b border-canopy-100 bg-cream/95 p-4 backdrop-blur dark:border-canopy-800 dark:bg-canopy-950/95">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-canopy-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKU, or scan barcode…"
              className="w-full rounded-xl border border-canopy-200 bg-white py-3 pl-10 pr-10 text-sm text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-900 dark:text-canopy-50"
            />
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 text-canopy-300" size={18} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategory === "all"
                  ? "bg-canopy-700 text-white shadow-card"
                  : "bg-white text-canopy-600 hover:bg-canopy-50 dark:bg-canopy-900 dark:text-canopy-300 dark:hover:bg-canopy-800"
              }`}
            >
              🍴 All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === c.id
                    ? "bg-canopy-700 text-white shadow-card"
                    : "bg-white text-canopy-600 hover:bg-canopy-50 dark:bg-canopy-900 dark:text-canopy-300 dark:hover:bg-canopy-800"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl2 bg-canopy-100 dark:bg-canopy-800" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-canopy-400">No products found.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} categoryIcon={categoryIconFor(p.category_id)} onClick={openProduct} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full shrink-0 border-t border-canopy-100 dark:border-canopy-800 md:w-[380px] md:border-l md:border-t-0">
        <CartPanel
          orderType={orderType} setOrderType={setOrderType}
          tables={tables} tableId={tableId} setTableId={setTableId}
          guestCount={guestCount} setGuestCount={setGuestCount}
          cart={cart} updateQty={updateQty} removeItem={removeItem}
          subtotal={subtotal} orderNotes={orderNotes} setOrderNotes={setOrderNotes}
          onSendOrder={sendOrder} onChargeNow={chargeNow} busy={busy}
        />
      </div>

      {modalProduct && (
        <ModifierModal product={modalProduct} onClose={() => setModalProduct(null)} onAdd={addToCart} />
      )}
      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          onClose={() => {
            setCheckoutOrder(null);
            resetCart();
            loadCatalog();
          }}
          onPaid={() => loadCatalog()}
        />
      )}
    </div>
  );
}
