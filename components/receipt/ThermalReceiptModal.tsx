'use client';

import React, { useState } from 'react';
import { Bill, RestaurantSettings, PrinterSettings } from '@/types/pos';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { printThermalReceipt } from '@/lib/printing/printerService';
import { Printer, Download, CheckCircle, X, Sparkles, RefreshCcw } from 'lucide-react';

interface ThermalReceiptModalProps {
  bill: Bill | null;
  settings: RestaurantSettings;
  printerSettings?: PrinterSettings;
  onClose: () => void;
  onNewBill?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  bill,
  settings,
  printerSettings,
  onClose,
  onNewBill,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(
    settings.receipt_width || '80mm'
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!bill) return null;

  const dateObj = new Date(bill.created_at);
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);
    try {
      const res = await printThermalReceipt({
        bill,
        settings,
        printerSettings,
        paperWidth,
      });
      setPrintFeedback(res.message);
    } catch (err: any) {
      setPrintFeedback('Print triggered.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const is58 = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Bill Generated Successfully
                <Sparkles size={16} className="text-amber-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400">
                Bill #{bill.bill_number} • {bill.payment_method}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Paper Width Selector */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 no-print">
          <span className="font-semibold text-slate-400">Receipt Format:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                paperWidth === '80mm'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm (Standard)
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                paperWidth === '58mm'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              58mm (Compact)
            </button>
          </div>
        </div>

        {/* Thermal Receipt Preview Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/70 flex justify-center items-start">
          {/* Real Physical Receipt Paper Container */}
          <div
            id="thermal-receipt"
            className={`bg-white text-black font-mono shadow-2xl border border-slate-200 select-none shrink-0 ${
              is58 ? 'px-3 py-4' : 'px-5 py-5'
            }`}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              width: is58 ? '58mm' : '80mm',
              maxWidth: '100%',
              minHeight: 'fit-content',
              height: 'fit-content',
              fontSize: is58 ? '11px' : '12px',
              lineHeight: '1.3',
              boxSizing: 'border-box',
            }}
          >
            {/* Receipt Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              {/* Receipt SVG Monochrome Logo */}
              <div className="flex justify-center mb-1.5">
                <svg width="46" height="46" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="46" stroke="#000000" strokeWidth="4" />
                  <path
                    d="M32 62h36c2 0 3-1 3-3 0-8-5-14-11-16 2-3 2-7 0-10-3-4-8-5-10-5-2 0-7 1-10 5-2 3-2 7 0 10-6 2-11 8-11 16 0 2 1 3 3 3z"
                    fill="#000000"
                  />
                  <path d="M30 68h40v4H30z" fill="#000000" />
                </svg>
              </div>

              <h1 className="text-base sm:text-lg font-black tracking-wider leading-none uppercase text-black text-center">
                {settings.restaurant_name}
              </h1>
              <p className="text-[10px] font-bold mt-1 tracking-wider uppercase text-black text-center">
                {settings.tagline || 'PADALUR • OOTTATHUR ROAD'}
              </p>

              {/* Centered Address with Tamil Nadu Symmetrically Aligned */}
              <div className="text-[9px] mt-1 text-black font-medium leading-tight text-center flex flex-col items-center">
                <span className="block text-center w-full">Padalur – Oottathur Road</span>
                <span className="block text-center w-full">Perambalur Dist</span>
                <span className="block text-center w-full font-bold">Tamil Nadu</span>
              </div>

              {settings.phone && (
                <p className="text-[9px] font-bold mt-1 text-black text-center">Ph: {settings.phone}</p>
              )}
              {settings.gstin && (
                <p className="text-[9px] font-bold text-black text-center">GSTIN: {settings.gstin}</p>
              )}
              {settings.fssai && (
                <p className="text-[9px] text-black text-center">FSSAI: {settings.fssai}</p>
              )}
            </div>

            {/* Bill Meta */}
            <div className="py-2 text-[10px] sm:text-[11px] border-b border-dashed border-black space-y-0.5 text-black">
              <div className="flex justify-between">
                <span>Bill No: <strong className="font-bold text-black">{bill.bill_number}</strong></span>
                <span>Date: {formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Pay: <strong className="text-black">{bill.payment_method}</strong></span>
                <span>Time: {formattedTime}</span>
              </div>
            </div>

            {/* Item Table Header */}
            <div className="py-1 border-b border-dashed border-black font-bold flex justify-between text-[10px] sm:text-[11px] text-black">
              <span className="w-1/2">ITEM</span>
              <span className="w-10 text-center">QTY</span>
              <span className="w-12 text-right">RATE</span>
              <span className="w-14 text-right">TOTAL</span>
            </div>

            {/* Bill Items */}
            <div className="py-2 border-b border-dashed border-black space-y-1.5 text-black">
              {bill.items.map((item, idx) => (
                <div key={idx} className="flex flex-col text-[10px] sm:text-[11px] leading-tight">
                  <span className="font-bold text-black">{item.product_name_snapshot}</span>
                  <div className="flex justify-between text-black pl-2">
                    <span className="w-1/2"></span>
                    <span className="w-10 text-center font-mono">{item.quantity}</span>
                    <span className="w-12 text-right font-mono">₹{item.unit_price}</span>
                    <span className="w-14 text-right font-mono font-bold text-black">
                      ₹{item.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2 space-y-1 text-[10px] sm:text-[11px] border-b border-dashed border-black text-black">
              <div className="flex justify-between text-black">
                <span>Subtotal:</span>
                <span className="font-mono text-black">₹{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.discount > 0 && (
                <div className="flex justify-between text-black">
                  <span>Discount:</span>
                  <span className="font-mono text-black">-₹{bill.discount.toFixed(2)}</span>
                </div>
              )}

              {bill.gst > 0 && (
                <div className="flex justify-between text-black">
                  <span>GST ({bill.gst_percent}%):</span>
                  <span className="font-mono text-black">₹{bill.gst.toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t-2 border-black flex justify-between font-black text-sm text-black">
                <span>TOTAL:</span>
                <span className="font-mono text-base text-black">₹{bill.total.toFixed(0)}</span>
              </div>

              {bill.tendered_amount && bill.tendered_amount > 0 && (
                <div className="pt-1.5 text-[9px] sm:text-[10px] space-y-0.5 border-t border-dotted border-black text-black">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>₹{bill.tendered_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change Return:</span>
                    <span>₹{(bill.change_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Message */}
            <div className="pt-3 text-center space-y-1 text-black">
              <p className="font-black text-[10px] sm:text-[11px] tracking-widest uppercase text-black">
                {settings.footer_message || 'THANK YOU! VISIT AGAIN'}
              </p>
              <p className="text-[9px] text-zinc-600">
                Software by Sushi Hotel Smart POS
              </p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {printFeedback && (
          <div className="px-4 py-1.5 bg-emerald-950/80 text-emerald-300 text-xs text-center border-t border-emerald-800">
            {printFeedback}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-800/95 border-t border-slate-700 flex flex-wrap gap-2.5 items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50"
            >
              <Printer size={18} />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-all"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Save PDF</span>
            </button>
          </div>

          {onNewBill && (
            <button
              onClick={() => {
                onClose();
                onNewBill();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all active:scale-95 ml-auto"
            >
              <RefreshCcw size={16} />
              Next Bill
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
