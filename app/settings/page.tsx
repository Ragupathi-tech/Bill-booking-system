'use client';

import React, { useState, useEffect } from 'react';
import { RestaurantSettings, PrinterSettings } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { printThermalReceipt } from '@/lib/printing/printerService';
import { BackButton } from '@/components/ui/BackButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertModal } from '@/components/ui/AlertModal';
import {
  Settings,
  Store,
  Printer,
  Hash,
  Database,
  RotateCcw,
  CheckCircle,
  Save,
  FileText,
  Wifi,
  ExternalLink,
  QrCode,
  Upload,
  Trash2,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [printer, setPrinter] = useState<PrinterSettings>(posStore.getPrinterSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [testPrintFeedback, setTestPrintFeedback] = useState<string | null>(null);

  // In-Screen Modal States (No browser popups)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    const load = () => {
      setSettings(posStore.getSettings());
      setPrinter(posStore.getPrinterSettings());
    };
    load();
    const unsub = subscribeToStore(load);
    return () => unsub();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    await posStore.saveSettings(settings);
    await posStore.savePrinterSettings(printer);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestPrint = async () => {
    setTestPrintFeedback('Sending test print job...');
    const dummyBill = {
      id: 'test-bill',
      bill_number: `${settings.bill_prefix || 'SH-'}TEST01`,
      subtotal: 300,
      discount: 20,
      gst: 14,
      gst_percent: settings.default_gst_percent || 5,
      total: 294,
      payment_method: 'UPI' as const,
      status: 'PAID' as const,
      items: [
        {
          id: 't-1',
          product_id: 'p-1',
          product_name_snapshot: 'Special Chicken Biryani (Test)',
          quantity: 1,
          unit_price: 180,
          gst_percent: 5,
          total: 180,
        },
        {
          id: 't-2',
          product_id: 'p-2',
          product_name_snapshot: 'Crispy Chicken 65 (Test)',
          quantity: 1,
          unit_price: 120,
          gst_percent: 5,
          total: 120,
        },
      ],
      created_at: new Date().toISOString(),
    };

    const res = await printThermalReceipt({
      bill: dummyBill,
      settings,
      printerSettings: printer,
      paperWidth: printer.paper_width,
    });

    setTestPrintFeedback(res.message);
    setTimeout(() => setTestPrintFeedback(null), 4000);
  };

  const handleResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset All Data to Default?',
      message: 'Are you sure you want to reset menu and settings back to original Sushi Hotel seed data? This will clear local bills.',
      type: 'danger',
      onConfirm: () => {
        posStore.resetToSeedData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setAlertModal({
          isOpen: true,
          title: 'Data Reset Successfully',
          message: 'The menu, categories, and settings have been restored to default Sushi Hotel values.',
          type: 'success',
        });
      },
    });
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAlertModal({
        isOpen: true,
        title: 'File Too Large',
        message: 'QR Image file must be under 5MB. Please choose a smaller image file.',
        type: 'warning',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({ ...prev, upi_qr_image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrImage = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Custom Scanner QR?',
      message: 'Are you sure you want to remove the custom shop scanner QR image and revert to the auto-generated UPI QR code?',
      type: 'warning',
      onConfirm: () => {
        setSettings((prev) => ({ ...prev, upi_qr_image: '' }));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const isCloudActive = isSupabaseConfigured();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with BackButton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Configuration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              POS & Hardware Settings
            </h1>
            <p className="text-xs text-slate-400">
              Customize restaurant bill header, thermal printer, tax, and cloud database
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-700">
                <CheckCircle size={15} />
                Settings Saved!
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* 1. RESTAURANT IDENTITY */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Store className="text-amber-400" size={20} />
              <div>
                <h3 className="font-bold text-sm text-white">Restaurant Information</h3>
                <p className="text-xs text-slate-400">Printed on the top of customer receipts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.restaurant_name}
                  onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Address Line (Printed on Receipt) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  UPI ID (For Instant QR Code)
                </label>
                <input
                  type="text"
                  value={settings.upi_id}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  placeholder="e.g. sushihotel@upi"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  GSTIN (Tax Number)
                </label>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  FSSAI Food License No
                </label>
                <input
                  type="text"
                  value={settings.fssai || ''}
                  onChange={(e) => setSettings({ ...settings, fssai: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 1.5. SHOP SCANNER UPI QR IMAGE (UPLOADABLE) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <QrCode className="text-amber-400" size={20} />
              <div>
                <h3 className="font-bold text-sm text-white">Shop Counter Payment Scanner QR</h3>
                <p className="text-xs text-slate-400">
                  Upload your actual shop counter scanner QR photo (GPay / PhonePe / Paytm / Bank Stand)
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
              {/* QR Preview Box */}
              <div className="w-40 h-40 rounded-2xl bg-white p-2 border-2 border-amber-400/80 shadow-xl flex items-center justify-center shrink-0 overflow-hidden">
                {settings.upi_qr_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.upi_qr_image}
                    alt="Uploaded Shop Scanner QR"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                    <QrCode size={40} className="text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">No Image Uploaded</span>
                    <span className="text-[8px] text-slate-500">Auto QR will be used</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {settings.upi_qr_image
                      ? 'Shop Scanner QR Active ✓'
                      : 'Upload Custom Shop Scanner QR'}
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {settings.upi_qr_image
                      ? 'This custom scanner image will be shown on the payment screen when customer selects UPI.'
                      : 'You can upload an image of your hotel counter QR stand (JPG, PNG, WebP up to 5MB).'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer transition-all active:scale-95">
                    <Upload size={15} />
                    <span>{settings.upi_qr_image ? 'Change Scanner Image' : 'Upload Scanner Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrImageUpload}
                      className="hidden"
                    />
                  </label>

                  {settings.upi_qr_image && (
                    <button
                      type="button"
                      onClick={handleRemoveQrImage}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      Remove Custom QR
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-500">
                  Tip: Take a clear photo of your counter stand QR code with your phone and upload it here.
                </div>
              </div>
            </div>
          </div>

          {/* 2. PRINTER SETTINGS */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Printer className="text-amber-400" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-white">Thermal Receipt Printer Configuration</h3>
                  <p className="text-xs text-slate-400">Configure 80mm / 58mm POS thermal printers</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestPrint}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all active:scale-95"
              >
                Test Print Receipt
              </button>
            </div>

            {testPrintFeedback && (
              <div className="p-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 text-center font-mono">
                {testPrintFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Printer Driver / Connection Type
                </label>
                <select
                  value={printer.printer_type}
                  onChange={(e) =>
                    setPrinter({ ...printer, printer_type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  <option value="BROWSER">Browser System Print Dialog (Standard)</option>
                  <option value="NETWORK">Wi-Fi / LAN Network Thermal Printer (ESC/POS)</option>
                  <option value="LOCAL_BRIDGE">Local USB / Bluetooth Print Bridge</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Paper Roll Width
                </label>
                <select
                  value={printer.paper_width}
                  onChange={(e) => {
                    const width = e.target.value as '80mm' | '58mm';
                    setPrinter({ ...printer, paper_width: width });
                    setSettings({ ...settings, receipt_width: width });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  <option value="80mm">80mm (Standard Restaurant Thermal)</option>
                  <option value="58mm">58mm (Compact Mobile Thermal)</option>
                </select>
              </div>

              {printer.printer_type === 'NETWORK' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Printer IP Address
                    </label>
                    <input
                      type="text"
                      value={printer.ip_address}
                      onChange={(e) => setPrinter({ ...printer, ip_address: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Port (Default: 9100)
                    </label>
                    <input
                      type="number"
                      value={printer.port}
                      onChange={(e) =>
                        setPrinter({ ...printer, port: Number(e.target.value) || 9100 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </>
              )}

              {printer.printer_type === 'LOCAL_BRIDGE' && (
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Local Print Service URL (for USB / Bluetooth bridge)
                  </label>
                  <input
                    type="text"
                    value={printer.local_bridge_url}
                    onChange={(e) =>
                      setPrinter({ ...printer, local_bridge_url: e.target.value })
                    }
                    placeholder="http://localhost:9100/print"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              )}

              <div className="sm:col-span-2 flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printer.auto_print_on_save}
                    onChange={(e) =>
                      setPrinter({ ...printer, auto_print_on_save: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-slate-300 font-medium">
                    Automatically trigger print receipt when bill is saved
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. BILL NUMBERING & TAX */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Hash className="text-amber-400" size={20} />
              <div>
                <h3 className="font-bold text-sm text-white">Bill Numbering & Tax Rules</h3>
                <p className="text-xs text-slate-400">Sequential bill counter format and GST rate</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bill Number Prefix
                </label>
                <input
                  type="text"
                  value={settings.bill_prefix}
                  onChange={(e) => setSettings({ ...settings, bill_prefix: e.target.value })}
                  placeholder="SH-"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Next Bill Sequence Number
                </label>
                <input
                  type="number"
                  value={settings.next_bill_number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      next_bill_number: Number(e.target.value) || 101,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Default GST Rate (%)
                </label>
                <input
                  type="number"
                  value={settings.default_gst_percent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_gst_percent: Number(e.target.value) || 5,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_gst}
                  onChange={(e) => setSettings({ ...settings, enable_gst: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-300 font-medium">
                  Enable GST calculation on billing screen
                </span>
              </label>
            </div>
          </div>

          {/* 4. SUPABASE CLOUD & SEED DATA */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Database className="text-amber-400" size={20} />
              <div>
                <h3 className="font-bold text-sm text-white">Database & System Maintenance</h3>
                <p className="text-xs text-slate-400">Cloud synchronization and seed management</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isCloudActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  <h4 className="font-bold text-xs text-white">
                    {isCloudActive
                      ? 'Supabase PostgreSQL Cloud Active'
                      : 'Local Resilient Storage Active (Supabase Optional)'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                  {isCloudActive
                    ? 'Bills, categories, and products are synced with PostgreSQL cloud database in real time.'
                    : 'The POS operates fully offline with automatic local storage and queued sync ready when environment variables are added.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 active:scale-95 transition-all"
              >
                <RotateCcw size={14} />
                Reset Seed Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Save size={18} />
              Save All Settings
            </button>
          </div>
        </form>
      </div>

      {/* Custom In-Screen Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Custom In-Screen Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
