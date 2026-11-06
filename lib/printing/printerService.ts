'use client';

import { Bill, RestaurantSettings, PrinterSettings } from '@/types/pos';
import { formatCurrency } from '@/lib/calculations/billCalculator';

export interface PrintReceiptOptions {
  bill: Bill;
  settings: RestaurantSettings;
  printerSettings?: PrinterSettings;
  paperWidth?: '80mm' | '58mm';
}

/**
 * Generates raw ESC/POS command text suitable for direct transmission
 * to network/USB thermal receipt printers.
 */
export function generateEscPosCommands(options: PrintReceiptOptions): string {
  const { bill, settings, paperWidth = '80mm' } = options;
  const is58 = paperWidth === '58mm';
  const lineWidth = is58 ? 32 : 48;
  const dashLine = '-'.repeat(lineWidth);
  const doubleLine = '='.repeat(lineWidth);

  const dateObj = new Date(bill.created_at);
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let receipt = '';

  // Initialize & Center align
  receipt += `\x1B\x40`; // ESC @ (Init)
  receipt += `\x1B\x61\x01`; // ESC a 1 (Center)

  // Double height & width for Restaurant Name
  receipt += `\x1D\x21\x11`; // GS ! 17 (Double size)
  receipt += `${settings.restaurant_name}\n`;
  receipt += `\x1D\x21\x00`; // Normal text

  receipt += `${settings.tagline || 'Padalur – Oottathur Road'}\n`;
  if (settings.address) {
    const addressLines = settings.address.split(',').map((s) => s.trim()).filter(Boolean);
    for (const addrLine of addressLines) {
      receipt += `${addrLine}\n`;
    }
  } else {
    receipt += `Padalur – Oottathur Road\n`;
    receipt += `Perambalur Dist\n`;
    receipt += `Tamil Nadu\n`;
  }
  if (settings.phone) receipt += `Ph: ${settings.phone}\n`;
  if (settings.gstin) receipt += `GSTIN: ${settings.gstin}\n`;
  if (settings.fssai) receipt += `FSSAI: ${settings.fssai}\n`;

  receipt += `${dashLine}\n`;

  // Left align for bill meta
  receipt += `\x1B\x61\x00`; // ESC a 0 (Left align)
  receipt += `Bill No: ${bill.bill_number.padEnd(lineWidth - 20)}Date: ${dateStr}\n`;
  receipt += `Payment: ${bill.payment_method.padEnd(lineWidth - 20)}Time: ${timeStr}\n`;

  receipt += `${dashLine}\n`;

  // Item Header
  if (is58) {
    receipt += `ITEM            QTY   RATE   AMT\n`;
  } else {
    receipt += `ITEM                         QTY   RATE    TOTAL\n`;
  }
  receipt += `${dashLine}\n`;

  // Items
  for (const item of bill.items) {
    const name = item.product_name_snapshot;
    const qty = String(item.quantity);
    const rate = `₹${item.unit_price}`;
    const tot = `₹${item.total}`;

    if (is58) {
      const truncatedName = name.length > 32 ? name.substring(0, 30) + '..' : name;
      receipt += `${truncatedName}\n`;
      const metaLine = `             ${qty.padStart(3)}  ${rate.padStart(6)} ${tot.padStart(6)}`;
      receipt += `${metaLine.slice(-32)}\n`;
    } else {
      const truncatedName = name.length > 24 ? name.substring(0, 22) + '..' : name.padEnd(24);
      const cols = `${truncatedName}  ${qty.padStart(4)}  ${rate.padStart(6)}  ${tot.padStart(8)}`;
      receipt += `${cols}\n`;
    }
  }

  receipt += `${dashLine}\n`;

  // Summary (Right-aligned numbers)
  receipt += `Subtotal:`.padEnd(lineWidth - 12) + `₹${bill.subtotal.toFixed(2).padStart(10)}\n`;
  if (bill.discount > 0) {
    receipt += `Discount:`.padEnd(lineWidth - 12) + `-₹${bill.discount.toFixed(2).padStart(9)}\n`;
  }
  if (bill.gst > 0) {
    receipt += `GST (${bill.gst_percent}%):`.padEnd(lineWidth - 12) + `₹${bill.gst.toFixed(2).padStart(10)}\n`;
  }

  receipt += `${doubleLine}\n`;
  receipt += `\x1B\x45\x01`; // Bold ON
  receipt += `GRAND TOTAL:`.padEnd(lineWidth - 12) + `₹${bill.total.toFixed(0).padStart(10)}\n`;
  receipt += `\x1B\x45\x00`; // Bold OFF
  receipt += `${doubleLine}\n`;

  if (bill.tendered_amount && bill.tendered_amount > 0) {
    receipt += `Cash Tendered:`.padEnd(lineWidth - 12) + `₹${bill.tendered_amount.toFixed(2).padStart(10)}\n`;
    receipt += `Change Return:`.padEnd(lineWidth - 12) + `₹${(bill.change_amount || 0).toFixed(2).padStart(10)}\n`;
  }

  // Footer & Center align
  receipt += `\x1B\x61\x01`; // ESC a 1 (Center)
  receipt += `\n${settings.footer_message || 'THANK YOU! VISIT AGAIN'}\n`;
  receipt += `Powered by Sushi Hotel Smart POS\n`;
  receipt += `\n\n\n`; // Feed lines
  receipt += `\x1D\x56\x41\x00`; // Cut paper

  return receipt;
}

/**
 * Thermal Printing Service Abstraction
 * Handles:
 * 1. Native browser / system print dialog
 * 2. Network ESC/POS thermal printer via raw TCP/HTTP bridge
 * 3. Local Print Bridge (for USB/Bluetooth ESC/POS printers)
 */
export async function printThermalReceipt(options: PrintReceiptOptions): Promise<{ success: boolean; message: string }> {
  const { bill, settings, printerSettings } = options;
  const printerType = printerSettings?.printer_type || 'BROWSER';
  const paperWidth = printerSettings?.paper_width || settings.receipt_width || '80mm';

  if (printerType === 'NETWORK') {
    // Wi-Fi / LAN Network Thermal Printer (e.g., 192.168.1.100:9100)
    try {
      const escPosData = generateEscPosCommands({ bill, settings, printerSettings, paperWidth });
      const bridgeUrl = printerSettings?.local_bridge_url || 'http://localhost:9100/print';
      
      const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'network',
          ip: printerSettings?.ip_address || '192.168.1.100',
          port: printerSettings?.port || 9100,
          payload: btoa(escPosData),
        }),
      });

      if (!response.ok) {
        throw new Error(`Printer bridge returned ${response.status}`);
      }

      return { success: true, message: 'Print job sent to network printer.' };
    } catch (err) {
      console.warn('Network thermal print error, falling back to Browser print dialog:', err);
      // Seamlessly fallback to browser print if bridge isn't running
      return triggerBrowserPrint();
    }
  }

  if (printerType === 'LOCAL_BRIDGE') {
    // USB or Bluetooth printer connected via local agent / service
    try {
      const escPosData = generateEscPosCommands({ bill, settings, printerSettings, paperWidth });
      const bridgeUrl = printerSettings?.local_bridge_url || 'http://localhost:9100/print';

      await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'usb_or_bluetooth',
          printerName: printerSettings?.printer_name,
          payload: btoa(escPosData),
        }),
      });

      return { success: true, message: 'Print job sent to local printer bridge.' };
    } catch (err) {
      console.warn('Local print bridge error, falling back to browser print:', err);
      return triggerBrowserPrint();
    }
  }

  // Default: Native browser thermal printing
  return triggerBrowserPrint();
}

/**
 * Triggers the browser's native print dialog
 */
export function triggerBrowserPrint(): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ success: false, message: 'Window not available' });
      return;
    }

    try {
      window.print();
      resolve({ success: true, message: 'Printed via browser dialog.' });
    } catch (e: any) {
      resolve({ success: false, message: e?.message || 'Print dialog failed' });
    }
  });
}
