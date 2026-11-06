'use client';

import {
  Category,
  Product,
  Bill,
  BillItem,
  RestaurantSettings,
  PrinterSettings,
} from '@/types/pos';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_PRINTER_SETTINGS,
} from '@/lib/seed/menuSeed';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

// Local storage keys
const STORAGE_KEYS = {
  CATEGORIES: 'sushi_hotel_categories_v1',
  PRODUCTS: 'sushi_hotel_products_v1',
  BILLS: 'sushi_hotel_bills_v1',
  SETTINGS: 'sushi_hotel_settings_v1',
  PRINTER_SETTINGS: 'sushi_hotel_printer_settings_v1',
  OFFLINE_QUEUE: 'sushi_hotel_offline_queue_v1',
  AUTH_SESSION: 'sushi_hotel_admin_session_v1',
  LEAVES: 'sushi_hotel_leaves_v1',
};

// Event listener for real-time reactivity across components
type StoreListener = () => void;
const listeners = new Set<StoreListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Error notifying store listener:', err);
    }
  });
}

export function subscribeToStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// In-Memory cache with LocalStorage backing
class PosDataStore {
  private categories: Category[] = [];
  private products: Product[] = [];
  private bills: Bill[] = [];
  private settings: RestaurantSettings = INITIAL_SETTINGS;
  private printerSettings: PrinterSettings = INITIAL_PRINTER_SETTINGS;
  private hotelLeaves: Record<string, string> = {}; // { 'YYYY-MM-DD': reason }
  private offlineQueue: string[] = []; // array of bill IDs pending cloud sync
  private isInitialized = false;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initStore();
      // Listen to window online event to trigger auto-sync
      window.addEventListener('online', () => {
        this.syncOfflineQueue();
      });
    }
  }

  private initStore() {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) return;

    try {
      // 1. Categories
      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (storedCategories) {
        this.categories = JSON.parse(storedCategories);
      } else {
        this.categories = [...INITIAL_CATEGORIES];
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      }

      // 2. Products
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (storedProducts) {
        this.products = JSON.parse(storedProducts);
      } else {
        this.products = [...INITIAL_PRODUCTS];
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      }

      // 3. Settings
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        this.settings = { ...INITIAL_SETTINGS, ...JSON.parse(storedSettings) };
      } else {
        this.settings = { ...INITIAL_SETTINGS };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      }

      // 4. Printer Settings
      const storedPrinter = localStorage.getItem(STORAGE_KEYS.PRINTER_SETTINGS);
      if (storedPrinter) {
        this.printerSettings = { ...INITIAL_PRINTER_SETTINGS, ...JSON.parse(storedPrinter) };
      } else {
        this.printerSettings = { ...INITIAL_PRINTER_SETTINGS };
        localStorage.setItem(STORAGE_KEYS.PRINTER_SETTINGS, JSON.stringify(this.printerSettings));
      }

      // 5. Bills
      const storedBills = localStorage.getItem(STORAGE_KEYS.BILLS);
      if (storedBills) {
        this.bills = JSON.parse(storedBills);
      } else {
        this.bills = [];
      }

      // 6. Offline Queue
      const storedQueue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (storedQueue) {
        this.offlineQueue = JSON.parse(storedQueue);
      } else {
        this.offlineQueue = [];
      }

      // 7. Hotel Leaves
      const storedLeaves = localStorage.getItem(STORAGE_KEYS.LEAVES);
      if (storedLeaves) {
        this.hotelLeaves = JSON.parse(storedLeaves);
      } else {
        this.hotelLeaves = {};
      }

      this.isInitialized = true;

      // Try initial remote sync in background if Supabase is set up
      if (isSupabaseConfigured()) {
        this.pullRemoteData();
      }
    } catch (e) {
      console.warn('LocalStorage initialization fallback:', e);
      this.categories = [...INITIAL_CATEGORIES];
      this.products = [...INITIAL_PRODUCTS];
      this.settings = { ...INITIAL_SETTINGS };
      this.printerSettings = { ...INITIAL_PRINTER_SETTINGS };
      this.bills = [];
      this.isInitialized = true;
    }
  }

  // --- Remote Supabase Sync Methods ---

  public async pullRemoteData() {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      // Pull Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!catErr && catData && catData.length > 0) {
        this.categories = catData;
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      }

      // Pull Products
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!prodErr && prodData && prodData.length > 0) {
        this.products = prodData;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      }

      // Pull Settings
      const { data: setData, error: setErr } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();

      if (!setErr && setData) {
        this.settings = { ...this.settings, ...setData };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      }

      notifyListeners();
    } catch (err) {
      console.warn('Background remote pull error (using cached local data):', err);
    }
  }

  public async syncOfflineQueue() {
    if (this.isSyncing || this.offlineQueue.length === 0 || !isSupabaseConfigured() || !supabase) {
      return;
    }

    this.isSyncing = true;
    notifyListeners();

    try {
      const pendingIds = [...this.offlineQueue];
      for (const billId of pendingIds) {
        const bill = this.bills.find((b) => b.id === billId);
        if (!bill) {
          this.offlineQueue = this.offlineQueue.filter((id) => id !== billId);
          continue;
        }

        // Insert into Supabase 'bills'
        const { error: billErr } = await supabase.from('bills').upsert({
          id: bill.id,
          bill_number: bill.bill_number,
          subtotal: bill.subtotal,
          discount: bill.discount,
          discount_type: bill.discount_type || 'FLAT',
          discount_value: bill.discount_value || 0,
          gst: bill.gst,
          gst_percent: bill.gst_percent,
          total: bill.total,
          payment_method: bill.payment_method,
          split_details: bill.split_details || null,
          tendered_amount: bill.tendered_amount || null,
          change_amount: bill.change_amount || null,
          status: bill.status,
          created_at: bill.created_at,
        });

        if (billErr) {
          console.error('Failed to sync bill:', bill.bill_number, billErr);
          break; // Stop loop and retry later
        }

        // Insert items into 'bill_items'
        if (bill.items && bill.items.length > 0) {
          const itemPayload = bill.items.map((item) => ({
            bill_id: bill.id,
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            quantity: item.quantity,
            unit_price: item.unit_price,
            gst_percent: item.gst_percent,
            total: item.total,
          }));
          await supabase.from('bill_items').upsert(itemPayload);
        }

        // Mark as synced locally
        bill.synced = true;
        this.offlineQueue = this.offlineQueue.filter((id) => id !== billId);
      }

      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(this.bills));
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      this.isSyncing = false;
      notifyListeners();
    }
  }

  // --- Categories CRUD ---

  public getCategories(): Category[] {
    this.initStore();
    return [...this.categories].sort((a, b) => a.sort_order - b.sort_order);
  }

  public getActiveCategories(): Category[] {
    return this.getCategories().filter((c) => c.active);
  }

  public async saveCategory(category: Category) {
    this.initStore();
    const idx = this.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      this.categories[idx] = category;
    } else {
      this.categories.push(category);
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('categories').upsert(category);
    }
  }

  public async deleteCategory(id: string) {
    this.initStore();
    this.categories = this.categories.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('categories').delete().eq('id', id);
    }
  }

  // --- Products CRUD ---

  public getProducts(): Product[] {
    this.initStore();
    return [...this.products].sort((a, b) => a.sort_order - b.sort_order);
  }

  public getActiveProducts(): Product[] {
    return this.getProducts().filter((p) => p.active);
  }

  public async saveProduct(product: Product) {
    this.initStore();
    product.updated_at = new Date().toISOString();
    const idx = this.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.push(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('products').upsert(product);
    }
  }

  public async deleteProduct(id: string) {
    this.initStore();
    this.products = this.products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('products').delete().eq('id', id);
    }
  }

  public async toggleProductAvailability(id: string) {
    this.initStore();
    const prod = this.products.find((p) => p.id === id);
    if (prod) {
      prod.active = !prod.active;
      await this.saveProduct(prod);
    }
  }

  // --- Bills Management ---

  public getBills(): Bill[] {
    this.initStore();
    return [...this.bills].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getBillById(id: string): Bill | undefined {
    this.initStore();
    return this.bills.find((b) => b.id === id || b.bill_number === id);
  }

  /**
   * Generates the next sequential unique bill number.
   * Configurable format: SH-000101, SH-000102 etc.
   */
  public generateNextBillNumber(): string {
    this.initStore();
    const prefix = this.settings.bill_prefix || 'SH-';
    const nextSeq = this.settings.next_bill_number || 101;
    
    // Format sequence with 6 digits: SH-000101
    const padded = String(nextSeq).padStart(6, '0');
    return `${prefix}${padded}`;
  }

  /**
   * Saves a new completed bill.
   * 1. Saves locally instantly.
   * 2. Increments bill sequence.
   * 3. Queues for cloud sync.
   * 4. Triggers background sync.
   */
  public async createBill(billData: Omit<Bill, 'id' | 'bill_number' | 'created_at' | 'status'> & { bill_number?: string }): Promise<Bill> {
    this.initStore();

    const billNumber = billData.bill_number || this.generateNextBillNumber();
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bill_number: billNumber,
      status: 'PAID',
      created_at: new Date().toISOString(),
      synced: false,
    };

    // Save locally
    this.bills.unshift(newBill);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(this.bills));

    // Increment next bill number sequence
    this.settings.next_bill_number = (this.settings.next_bill_number || 101) + 1;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));

    // Queue for sync
    this.offlineQueue.push(newBill.id);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));

    notifyListeners();

    // Trigger background sync if online
    if (typeof window !== 'undefined' && navigator.onLine && isSupabaseConfigured()) {
      this.syncOfflineQueue();
    }

    return newBill;
  }

  public async deleteBill(id: string) {
    this.initStore();
    this.bills = this.bills.filter((b) => b.id !== id && b.bill_number !== id);
    this.offlineQueue = this.offlineQueue.filter((billId) => billId !== id);

    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(this.bills));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));

    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('bill_items').delete().eq('bill_id', id);
        await supabase.from('bills').delete().eq('id', id);
      } catch (err) {
        console.error('Remote bill delete error:', err);
      }
    }
  }

  // --- Settings & Printers ---

  public getSettings(): RestaurantSettings {
    this.initStore();
    return { ...this.settings };
  }

  public async saveSettings(newSettings: RestaurantSettings) {
    this.initStore();
    this.settings = { ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('settings').upsert(this.settings);
    }
  }

  public getPrinterSettings(): PrinterSettings {
    this.initStore();
    return { ...this.printerSettings };
  }

  public async savePrinterSettings(newSettings: PrinterSettings) {
    this.initStore();
    this.printerSettings = { ...newSettings };
    localStorage.setItem(STORAGE_KEYS.PRINTER_SETTINGS, JSON.stringify(this.printerSettings));
    notifyListeners();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('printer_settings').upsert(this.printerSettings);
    }
  }

  public getQueueStatus() {
    return {
      pendingCount: this.offlineQueue.length,
      isSyncing: this.isSyncing,
    };
  }

  // --- Hotel Leaves Management ---

  public getHotelLeaves(): Record<string, string> {
    this.initStore();
    return { ...this.hotelLeaves };
  }

  public isDateHotelLeave(dateStr: string): boolean {
    this.initStore();
    return Boolean(this.hotelLeaves[dateStr]);
  }

  public getLeaveReason(dateStr: string): string | undefined {
    this.initStore();
    return this.hotelLeaves[dateStr];
  }

  public setHotelLeave(dateStr: string, reason = 'Hotel Leave / Off-Day') {
    this.initStore();
    this.hotelLeaves[dateStr] = reason;
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));
    notifyListeners();
  }

  public removeHotelLeave(dateStr: string) {
    this.initStore();
    delete this.hotelLeaves[dateStr];
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));
    notifyListeners();
  }

  public toggleHotelLeave(dateStr: string, reason = 'Hotel Leave / Off-Day'): boolean {
    this.initStore();
    if (this.hotelLeaves[dateStr]) {
      delete this.hotelLeaves[dateStr];
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));
      notifyListeners();
      return false;
    } else {
      this.hotelLeaves[dateStr] = reason;
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));
      notifyListeners();
      return true;
    }
  }

  /**
   * Generates a sample week of realistic bills with 1 designated Hotel Leave day
   * so the user can immediately experience the red leave reporting.
   */
  public seedSampleWeekWithLeave() {
    this.initStore();
    const prods = this.getProducts();
    if (prods.length === 0) return;

    const sampleBills: Bill[] = [];
    const today = new Date();

    // 7 days window: days 0 to 6
    // Let day 2 (two days ago) be the official Hotel Leave day (Tuesday or off-day)
    const leaveDayIndex = 2;
    const leaveDateStr = new Date(today.getTime() - leaveDayIndex * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Mark the leave day in hotel leaves store
    this.hotelLeaves[leaveDateStr] = 'Weekly Tuesday Holiday / Hotel Leave';
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));

    let billSeq = 1001;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      if (dayOffset === leaveDayIndex) {
        // Hotel Leave day: 0 bills generated!
        continue;
      }

      const dateObj = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dayDateStr = dateObj.toISOString().split('T')[0];

      // Generate 4 to 8 bills for this day
      const orderCount = 4 + (dayOffset % 5);
      for (let b = 0; b < orderCount; b++) {
        const item1 = prods[(b + dayOffset) % prods.length];
        const item2 = prods[(b + dayOffset + 3) % prods.length];

        const q1 = 1 + (b % 3);
        const q2 = 1 + ((b + 1) % 2);

        const subtotal = item1.price * q1 + item2.price * q2;
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;

        const methods: ('CASH' | 'UPI' | 'CARD')[] = ['UPI', 'CASH', 'UPI', 'CASH', 'CARD'];
        const pMethod = methods[(b + dayOffset) % methods.length];

        const billTime = new Date(dateObj);
        billTime.setHours(11 + (b * 2) % 11, (b * 17) % 60, 0);

        sampleBills.push({
          id: `seed-bill-${dayOffset}-${b}`,
          bill_number: `SH-${String(billSeq++).padStart(6, '0')}`,
          subtotal,
          discount: 0,
          discount_type: 'FLAT',
          discount_value: 0,
          gst,
          gst_percent: 5,
          total,
          payment_method: pMethod,
          status: 'PAID',
          created_at: billTime.toISOString(),
          items: [
            {
              id: `seed-item-${dayOffset}-${b}-1`,
              product_id: item1.id,
              product_name_snapshot: item1.name,
              quantity: q1,
              unit_price: item1.price,
              gst_percent: item1.gst_percent,
              total: item1.price * q1,
            },
            {
              id: `seed-item-${dayOffset}-${b}-2`,
              product_id: item2.id,
              product_name_snapshot: item2.name,
              quantity: q2,
              unit_price: item2.price,
              gst_percent: item2.gst_percent,
              total: item2.price * q2,
            },
          ],
        });
      }
    }

    // Append to existing bills without duplicates
    this.bills = [...sampleBills, ...this.bills.filter((b) => !b.id.startsWith('seed-'))];
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(this.bills));
    notifyListeners();
  }

  public resetToSeedData() {
    this.categories = [...INITIAL_CATEGORIES];
    this.products = [...INITIAL_PRODUCTS];
    this.settings = { ...INITIAL_SETTINGS };
    this.printerSettings = { ...INITIAL_PRINTER_SETTINGS };
    this.bills = [];
    this.hotelLeaves = {};
    this.offlineQueue = [];

    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.PRINTER_SETTINGS, JSON.stringify(this.printerSettings));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(this.bills));
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(this.hotelLeaves));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));

    notifyListeners();
  }
}

// Global Singleton Instance
export const posStore = new PosDataStore();
