//D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\components\CartDrawer.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { cartAPI, type CartItem } from "../services/cartService";
import { API_BASE_URL } from "../services/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function CartDrawer({ isOpen, onClose, onCountChange }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    setLoading(true);
    try {
      const data = await cartAPI.getCart();
      setItems(data);
      onCountChange?.(data.length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { if (isOpen) fetchCart(); }, [isOpen, fetchCart]);

  // Nghe event từ ProductDetailPage khi thêm vào giỏ
  useEffect(() => {
    window.addEventListener("cartUpdated", fetchCart);
    return () => window.removeEventListener("cartUpdated", fetchCart);
  }, [fetchCart]);

  // ── Selection ──────────────────────────────────────────────────────────
  const toggle = (productId: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });

  const toggleAll = () =>
    setSelected(
      selected.size === items.length ? new Set() : new Set(items.map(i => i.product_id))
    );

  // ── Quantity update ────────────────────────────────────────────────────
  const updateQty = async (productId: string, qty: number) => {
    if (qty < 1) { await removeItem(productId); return; }
    setUpdatingId(productId);
    try {
      await cartAPI.updateQuantity(productId, qty);
      setItems(prev =>
        prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i)
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (productId: string) => {
    setUpdatingId(productId);
    try {
      await cartAPI.removeItem(productId);
      setItems(prev => {
        const next = prev.filter(i => i.product_id !== productId);
        onCountChange?.(next.length);
        return next;
      });
      setSelected(prev => { const next = new Set(prev); next.delete(productId); return next; });
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Checkout ───────────────────────────────────────────────────────────
  const selectedItems = items.filter(i => selected.has(i.product_id));
  const total = selectedItems.reduce(
    (s, i) => s + (i.product?.price ?? 0) * i.quantity, 0
  );

  const handleCheckout = () => {
    if (!selectedItems.length) return;
    onClose();
    navigate("/checkout", { state: { items: selectedItems, fromCart: true } });
  };

  const getImage = (item: CartItem) => {
    const img = item.product?.image_url || item.product?.images?.[0];
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `${API_BASE_URL.replace("/api", "")}${img}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: 440, maxWidth: "100vw" }}
      >
        {/* ── Drawer header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h2 className="text-[17px] font-bold tracking-tight">Giỏ hàng</h2>
            {items.length > 0 && (
              <span className="bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </div>

        {/* ── Select all bar ── */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <CheckBox
              checked={selected.size === items.length && items.length > 0}
              indeterminate={selected.size > 0 && selected.size < items.length}
              onChange={toggleAll}
            />
            <span className="text-sm text-gray-600">
              Chọn tất cả
              <span className="text-gray-400 ml-1">({items.length} sản phẩm)</span>
            </span>
            {selected.size > 0 && (
              <span className="ml-auto text-xs font-semibold text-cyan-600">
                Đã chọn {selected.size}
              </span>
            )}
          </div>
        )}

        {/* ── Item list ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-56 gap-4">
              <div className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin"
                style={{ borderTopColor: "#06b6d4" }} />
              <p className="text-sm text-gray-400">Đang tải giỏ hàng…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 gap-4 px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center text-4xl">
                🛍️
              </div>
              <div>
                <p className="font-semibold text-gray-800">Giỏ hàng trống</p>
                <p className="text-sm text-gray-400 mt-1">
                  Hãy khám phá và thêm sản phẩm yêu thích!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full text-white text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition-opacity shadow-md shadow-cyan-200"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <CartRow
                  key={item.id}
                  item={item}
                  imgSrc={getImage(item)}
                  checked={selected.has(item.product_id)}
                  updating={updatingId === item.product_id}
                  onToggle={() => toggle(item.product_id)}
                  onIncrease={() => updateQty(item.product_id, item.quantity + 1)}
                  onDecrease={() => updateQty(item.product_id, item.quantity - 1)}
                  onRemove={() => removeItem(item.product_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 pt-4 pb-5 bg-white flex-shrink-0">
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Tạm tính ({selectedItems.length}/{items.length} sản phẩm)
                </span>
                <span className="font-semibold text-gray-700">{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className="text-green-600 font-medium">Tính khi thanh toán</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 mt-3">
                <span className="font-bold text-gray-900">Tổng tiền</span>
                <span className="text-2xl font-extrabold text-red-500">{fmt(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={!selectedItems.length}
              className="w-full h-12 rounded-xl font-bold text-[15px] transition-all duration-200"
              style={{
                background: selectedItems.length
                  ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                  : "#f3f4f6",
                color: selectedItems.length ? "white" : "#9ca3af",
                boxShadow: selectedItems.length
                  ? "0 4px 16px rgba(6,182,212,0.35)"
                  : "none",
                cursor: selectedItems.length ? "pointer" : "not-allowed",
              }}
            >
              {selectedItems.length
                ? `Đặt hàng ngay (${selectedItems.length}) →`
                : "Vui lòng chọn sản phẩm"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// ── CheckBox ──────────────────────────────────────────────────────────────────
function CheckBox({
  checked, indeterminate, onChange,
}: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="flex-shrink-0 flex items-center justify-center rounded transition-all"
      style={{
        width: 20, height: 20,
        background: checked
          ? "linear-gradient(135deg,#06b6d4,#2563eb)"
          : "white",
        border: checked || indeterminate ? "none" : "2px solid #d1d5db",
        boxShadow: checked ? "0 2px 8px rgba(6,182,212,0.4)" : "none",
      }}
    >
      {indeterminate && !checked
        ? <span style={{ display: "block", width: 8, height: 2, background: "#9ca3af", borderRadius: 2 }} />
        : checked
          ? <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : null}
    </button>
  );
}

// ── CartRow ───────────────────────────────────────────────────────────────────
function CartRow({
  item, imgSrc, checked, updating, onToggle, onIncrease, onDecrease, onRemove,
}: {
  item: CartItem; imgSrc: string | null; checked: boolean; updating: boolean;
  onToggle: () => void; onIncrease: () => void; onDecrease: () => void; onRemove: () => void;
}) {
  const price = item.product?.price ?? 0;

  return (
    <div
      className="flex items-center gap-3 px-5 py-4 transition-colors duration-150"
      style={{ background: checked ? "#f0f9ff" : "white" }}
    >
      <CheckBox checked={checked} onChange={onToggle} />

      {/* Image */}
      <div className="w-[68px] h-[68px] rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
        {imgSrc
          ? <img src={imgSrc} alt={item.product?.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
          {item.product?.name ?? "Sản phẩm"}
        </p>
        <p className="text-[15px] font-bold text-red-500 mt-0.5">{fmt(price)}</p>

        {/* +/- controls */}
        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={onDecrease}
            disabled={updating}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 text-lg leading-none hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all disabled:opacity-40"
          >
            −
          </button>

          <div className="w-8 h-7 flex items-center justify-center text-sm font-bold text-gray-800">
            {updating
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin block" />
              : item.quantity
            }
          </div>

          <button
            onClick={onIncrease}
            disabled={updating}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 text-lg leading-none hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all disabled:opacity-40"
          >
            +
          </button>

          <span className="text-xs text-gray-400 font-medium">
            = {fmt(price * item.quantity)}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        disabled={updating}
        className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
        title="Xóa"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  );
}