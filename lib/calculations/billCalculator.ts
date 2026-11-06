import { CartItem } from '@/types/pos';

export interface CalculationInput {
  items: Array<{
    quantity: number;
    unit_price: number;
    gst_percent?: number;
  }>;
  discountType?: 'FLAT' | 'PERCENT';
  discountValue?: number;
  applyGst?: boolean;
  defaultGstPercent?: number;
}

export interface CalculationResult {
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
}

/**
 * Rounds a number safely to 2 decimal places.
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Centralized calculation function for Sushi Hotel POS.
 * Ensures consistent totals across Billing Screen, Server actions, Reports, and Receipts.
 */
export function calculateBillTotals(input: CalculationInput): CalculationResult {
  const {
    items = [],
    discountType = 'FLAT',
    discountValue = 0,
    applyGst = true,
    defaultGstPercent = 5,
  } = input;

  let subtotal = 0;
  let totalQuantity = 0;

  // 1. Calculate raw subtotal and total item count
  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unit_price) || 0);
    const itemTotal = roundCurrency(qty * price);
    subtotal += itemTotal;
    totalQuantity += qty;
  }

  subtotal = roundCurrency(subtotal);

  // 2. Calculate Discount
  let discount = 0;
  const rawDiscount = Math.max(0, Number(discountValue) || 0);

  if (discountType === 'PERCENT') {
    const percent = Math.min(100, rawDiscount);
    discount = roundCurrency((subtotal * percent) / 100);
  } else {
    // FLAT discount cannot exceed subtotal
    discount = roundCurrency(Math.min(subtotal, rawDiscount));
  }

  const taxableAmount = Math.max(0, subtotal - discount);

  // 3. Calculate GST
  let gst = 0;
  if (applyGst && taxableAmount > 0) {
    const gstRate = Math.max(0, Number(defaultGstPercent) || 0);
    gst = roundCurrency((taxableAmount * gstRate) / 100);
  }

  // 4. Calculate Grand Total (Rupee rounding standard)
  const grandTotal = Math.max(0, Math.round(taxableAmount + gst));

  return {
    subtotal,
    discount,
    gst,
    total: grandTotal,
    itemCount: items.length,
    totalQuantity,
  };
}

/**
 * Formats a currency number with Indian Rupee symbol (₹).
 */
export function formatCurrency(amount: number): string {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
