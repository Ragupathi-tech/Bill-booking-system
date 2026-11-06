export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export interface SplitPaymentDetail {
  cash: number;
  upi: number;
  card: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  price: number;
  gst_percent: number;
  image_url: string;
  description?: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  gst_percent: number;
}

export interface BillItem {
  id: string;
  bill_id?: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  total: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  subtotal: number;
  discount: number;
  discount_type?: 'FLAT' | 'PERCENT';
  discount_value?: number;
  gst: number;
  gst_percent: number;
  total: number;
  payment_method: PaymentMethod;
  split_details?: SplitPaymentDetail;
  tendered_amount?: number;
  change_amount?: number;
  status: 'PAID' | 'CANCELLED';
  items: BillItem[];
  created_at: string;
  created_by?: string;
  synced?: boolean;
}

export interface RestaurantSettings {
  id: string;
  restaurant_name: string;
  tagline: string;
  address: string;
  phone: string;
  gstin?: string;
  fssai?: string;
  upi_id?: string;
  upi_qr_image?: string;
  logo_url?: string;
  receipt_width: '80mm' | '58mm';
  currency: string;
  currency_symbol: string;
  bill_prefix: string;
  next_bill_number: number;
  daily_reset: boolean;
  default_gst_percent: number;
  enable_gst: boolean;
  footer_message: string;
}

export interface PrinterSettings {
  id: string;
  printer_type: 'BROWSER' | 'NETWORK' | 'LOCAL_BRIDGE';
  printer_name: string;
  ip_address: string;
  port: number;
  paper_width: '80mm' | '58mm';
  auto_print_on_save: boolean;
  local_bridge_url?: string;
}

export interface DailyReportDay {
  date: string; // 'YYYY-MM-DD'
  formattedDate: string; // '05 Oct 2026'
  dayName: string; // 'Monday'
  billsCount: number;
  grossSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  isLeave: boolean;
  leaveReason?: string;
}

export interface HotelLeaveDay {
  date: string; // 'YYYY-MM-DD'
  reason?: string; // 'Weekly Off', 'Deepavali Holiday', 'Renovation', etc.
}

