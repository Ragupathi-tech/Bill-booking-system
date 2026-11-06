'use client';

import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Category,
  Product,
  CartItem,
  Bill,
  RestaurantSettings,
  PrinterSettings,
  PaymentMethod,
  SplitPaymentDetail,
} from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { calculateBillTotals, formatCurrency } from '@/lib/calculations/billCalculator';
import { printThermalReceipt } from '@/lib/printing/printerService';
import { PaymentModal } from '@/components/billing/PaymentModal';
import { ThermalReceiptModal } from '@/components/receipt/ThermalReceiptModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertModal } from '@/components/ui/AlertModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ShoppingCart,
  Percent,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Utensils,
  Check,
  X,
  Flame,
  UtensilsCrossed,
  Drumstick,
  Beef,
  Salad,
  Wheat,
  Layers,
  Cookie,
  GlassWater,
  Citrus,
  Coffee,
  IceCream2,
} from 'lucide-react';

// Icon Map for dynamic category icons
const ICON_MAP: Record<string, any> = {
  Flame,
  UtensilsCrossed,
  Drumstick,
  Beef,
  Salad,
  Wheat,
  Layers,
  Cookie,
  GlassWater,
  Citrus,
  Coffee,
  IceCream2,
};

export const PosScreen: React.FC = () => {
  // Store Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(posStore.getPrinterSettings());

  // UI Selection States
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyGst, setApplyGst] = useState<boolean>(true);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);

  // Modals & Drawers
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Initialize and subscribe to store
  useEffect(() => {
    const syncData = () => {
      setCategories(posStore.getActiveCategories());
      setProducts(posStore.getActiveProducts());
      setSettings(posStore.getSettings());
      setPrinterSettings(posStore.getPrinterSettings());
    };

    syncData();
    const unsub = subscribeToStore(syncData);
    return () => unsub();
  }, []);

  // Filtered products based on category and live search
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat =
        selectedCategoryId === 'ALL' || prod.category_id === selectedCategoryId;
      const matchSearch =
        searchQuery.trim() === '' ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Centralized Bill Calculation
  const billTotals = useMemo(() => {
    return calculateBillTotals({
      items: cart.map((c) => ({
        quantity: c.quantity,
        unit_price: c.unit_price,
        gst_percent: c.gst_percent,
      })),
      discountType,
      discountValue,
      applyGst: settings.enable_gst && applyGst,
      defaultGstPercent: settings.default_gst_percent || 5,
    });
  }, [cart, discountType, discountValue, applyGst, settings]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.price,
          gst_percent: product.gst_percent,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setShowClearConfirm(true);
  };

  const executeClearCart = () => {
    setShowClearConfirm(false);
    setCart([]);
    setDiscountValue(0);
    setIsMobileCartOpen(false);
  };

  const getCartQuantityForProduct = (productId: string): number => {
    const found = cart.find((item) => item.product.id === productId);
    return found ? found.quantity : 0;
  };

  // Payment Completion
  const handlePaymentConfirm = async (paymentData: {
    method: PaymentMethod;
    tenderedAmount?: number;
    changeAmount?: number;
    splitDetails?: SplitPaymentDetail;
    autoPrint: boolean;
  }) => {
    if (cart.length === 0) return;

    try {
      const billItems = cart.map((item) => ({
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_percent: item.gst_percent,
        total: item.quantity * item.unit_price,
      }));

      const newBill = await posStore.createBill({
        subtotal: billTotals.subtotal,
        discount: billTotals.discount,
        discount_type: discountType,
        discount_value: discountValue,
        gst: billTotals.gst,
        gst_percent: settings.default_gst_percent || 5,
        total: billTotals.total,
        payment_method: paymentData.method,
        split_details: paymentData.splitDetails,
        tendered_amount: paymentData.tenderedAmount,
        change_amount: paymentData.changeAmount,
        items: billItems,
      });

      // Celebration Confetti!
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // ignore
      }

      // Close modal and mobile drawer
      setIsPaymentModalOpen(false);
      setIsMobileCartOpen(false);

      // Auto print if requested
      if (paymentData.autoPrint) {
        printThermalReceipt({
          bill: newBill,
          settings,
          printerSettings,
        });
      }

      // Show receipt modal
      setActiveReceiptBill(newBill);

      // Reset cart for next order
      setCart([]);
      setDiscountValue(0);
    } catch (err) {
      console.error('Failed to create bill:', err);
      alert('Unable to save bill. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-slate-100">
      {/* 3-Column POS Layout for Desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* COLUMN 1: CATEGORIES (Hidden on mobile, Left bar on desktop) */}
        {/* ============================================================== */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-900 border-r border-slate-800 p-3 overflow-y-auto">
          <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-2">
            Categories
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Utensils size={16} />
                <span>All Dishes</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                {products.length}
              </span>
            </button>

            {categories.map((cat) => {
              const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || UtensilsCrossed;
              const count = products.filter((p) => p.category_id === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComponent size={16} className={isSelected ? 'text-slate-950' : 'text-amber-400'} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-amber-600/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ============================================================== */}
        {/* COLUMN 2: SEARCH & PRODUCT GRID (Center area) */}
        {/* ============================================================== */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Top Search & Filter Bar */}
          <div className="p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food by name (Biryani, Parotta, 65...)"
                className="w-full pl-10 pr-9 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick stats on items */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Showing <strong>{filteredProducts.length}</strong> items</span>
            </div>
          </div>

          {/* Mobile Categories Horizontal Carousel */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-900/40 border-b border-slate-800 no-scrollbar">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-6">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Utensils size={40} className="text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No food items found</p>
                <p className="text-xs text-slate-500 mt-1">Try changing category or search keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const qtyInCart = getCartQuantityForProduct(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`group relative bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer select-none flex flex-col active:scale-[0.98] ${
                        qtyInCart > 0
                          ? 'border-amber-500/80 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 hover:border-slate-700 shadow-md'
                      }`}
                    >
                      {/* Product Image Header with Price Badge */}
                      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400'}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                        {/* Price Badge */}
                        <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs sm:text-sm font-mono shadow-md">
                          {formatCurrency(product.price)}
                        </span>

                        {/* Quantity Counter Badge if in Cart */}
                        {qtyInCart > 0 && (
                          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg animate-bounce">
                            {qtyInCart}
                          </span>
                        )}
                      </div>

                      {/* Info & Add Action */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-medium">
                            GST {product.gst_percent}%
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              qtyInCart > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            <Plus size={13} />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ============================================================== */}
        {/* COLUMN 3: CURRENT BILL / CART (Desktop right pane) */}
        {/* ============================================================== */}
        <aside className="hidden xl:flex flex-col w-96 bg-slate-900 border-l border-slate-800 shadow-2xl overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Receipt size={18} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Current Bill</h2>
                <p className="text-[11px] font-mono text-slate-400">
                  {posStore.generateNextBillNumber()}
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
                title="Clear current cart"
              >
                <Trash2 size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <ShoppingCart size={48} className="text-slate-700" />
                <p className="text-sm font-semibold text-slate-400">Bill is Empty</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Tap or click dishes on the food menu to add them to this bill.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      ₹{item.unit_price} each
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-800 active:scale-95"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-amber-400 hover:bg-slate-800 active:scale-95"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-16">
                    <span className="font-mono font-bold text-xs text-amber-400">
                      ₹{item.quantity * item.unit_price}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Calculation Footer */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
              {/* Discount & GST Controls */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <Percent size={13} />
                  {discountValue > 0 ? `Discount: ₹${billTotals.discount}` : '+ Add Discount'}
                </button>

                {settings.enable_gst && (
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={applyGst}
                      onChange={(e) => setApplyGst(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <span>GST ({settings.default_gst_percent || 5}%)</span>
                  </label>
                )}
              </div>

              {/* Discount Inputs Drawer */}
              {showDiscountInput && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2 text-xs">
                  <div className="flex rounded-md overflow-hidden border border-slate-700">
                    <button
                      onClick={() => setDiscountType('FLAT')}
                      className={`px-2 py-1 font-bold ${
                        discountType === 'FLAT' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      ₹ Flat
                    </button>
                    <button
                      onClick={() => setDiscountType('PERCENT')}
                      className={`px-2 py-1 font-bold ${
                        discountType === 'PERCENT' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      % Off
                    </button>
                  </div>
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    placeholder="Discount amount"
                    className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-white font-mono text-xs"
                  />
                  {discountValue > 0 && (
                    <button
                      onClick={() => setDiscountValue(0)}
                      className="text-rose-400 p-1"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal ({billTotals.totalQuantity} items):</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(billTotals.subtotal)}
                  </span>
                </div>

                {billTotals.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(billTotals.discount)}</span>
                  </div>
                )}

                {billTotals.gst > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({settings.default_gst_percent || 5}%):</span>
                    <span className="font-mono text-slate-200">
                      +{formatCurrency(billTotals.gst)}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Bar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    GRAND TOTAL
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    {formatCurrency(billTotals.total)}
                  </div>
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95"
                >
                  Pay Now
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ============================================================== */}
      {/* MOBILE STICKY BOTTOM CART BAR & SLIDEOVER BILL DRAWER */}
      {/* ============================================================== */}
      {cart.length > 0 && (
        <div className="xl:hidden fixed bottom-14 left-0 right-0 z-30 p-2 sm:p-3 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-2xl shadow-black/80 transition-transform active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                  {billTotals.totalQuantity}
                </span>
                <div className="text-left leading-tight">
                  <div className="text-xs uppercase font-extrabold tracking-wide">
                    {billTotals.itemCount} {billTotals.itemCount === 1 ? 'Dish' : 'Dishes'}
                  </div>
                  <div className="text-base font-mono font-black">
                    {formatCurrency(billTotals.total)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-slate-950 text-white px-3.5 py-2 rounded-xl">
                View Bill
                <ChevronRight size={15} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Slide-Over Cart Drawer */}
      {isMobileCartOpen && (
        <div className="xl:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Current Bill ({billTotals.totalQuantity} items)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-400 font-semibold"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Mobile Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-white">{item.product.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      ₹{item.unit_price} × {item.quantity} = ₹{item.unit_price * item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-300"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-amber-400"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Bill Summary Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 pb-8">
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">
                    {formatCurrency(billTotals.subtotal)}
                  </span>
                </div>
                {billTotals.gst > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({settings.default_gst_percent}%):</span>
                    <span className="font-mono text-white">
                      +{formatCurrency(billTotals.gst)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-base text-amber-400 font-mono">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(billTotals.total)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileCartOpen(false);
                  setIsPaymentModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2"
              >
                Proceed to Payment ({formatCurrency(billTotals.total)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalAmount={billTotals.total}
          upiId={settings.upi_id}
          customQrImage={settings.upi_qr_image}
          autoPrintEnabled={printerSettings.auto_print_on_save}
          onConfirm={handlePaymentConfirm}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Thermal Receipt Print / Download Modal */}
      {activeReceiptBill && (
        <ThermalReceiptModal
          bill={activeReceiptBill}
          settings={settings}
          printerSettings={printerSettings}
          onClose={() => setActiveReceiptBill(null)}
          onNewBill={() => {
            setActiveReceiptBill(null);
            setCart([]);
          }}
        />
      )}
    </div>
  );
};
