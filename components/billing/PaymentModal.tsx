'use client';

import React, { useState } from 'react';
import { PaymentMethod, SplitPaymentDetail } from '@/types/pos';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import {
  Banknote,
  QrCode,
  CreditCard,
  Split,
  CheckCircle2,
  X,
  ArrowRight,
  Printer,
} from 'lucide-react';

interface PaymentModalProps {
  totalAmount: number;
  upiId?: string;
  customQrImage?: string;
  autoPrintEnabled?: boolean;
  onConfirm: (paymentData: {
    method: PaymentMethod;
    tenderedAmount?: number;
    changeAmount?: number;
    splitDetails?: SplitPaymentDetail;
    autoPrint: boolean;
  }) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalAmount,
  upiId = 'sushihotel@upi',
  customQrImage,
  autoPrintEnabled = true,
  onConfirm,
  onClose,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(totalAmount);
  const [autoPrint, setAutoPrint] = useState<boolean>(autoPrintEnabled);

  // Split details state
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totalAmount / 2));
  const [splitUpi, setSplitUpi] = useState<number>(totalAmount - Math.floor(totalAmount / 2));
  const [splitCard, setSplitCard] = useState<number>(0);

  const changeAmount = Math.max(0, cashTendered - totalAmount);

  // Tender quick buttons
  const quickTenderOptions = [
    { label: 'Exact', amount: totalAmount },
    { label: '₹100', amount: 100 },
    { label: '₹200', amount: 200 },
    { label: '₹500', amount: 500 },
    { label: '₹1,000', amount: 1000 },
    { label: '₹2,000', amount: 2000 },
  ].filter((opt) => opt.label === 'Exact' || opt.amount >= totalAmount);

  const splitTotal = Number(splitCash || 0) + Number(splitUpi || 0) + Number(splitCard || 0);
  const splitDifference = totalAmount - splitTotal;

  // Real UPI deep link QR string (standard NPCI format)
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent('SUSHI HOTEL')}&am=${totalAmount}&cu=INR&tn=SushiHotelBill`;

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiDeepLink
  )}&color=0f172a&bgcolor=ffffff&qzone=1`;

  const handleComplete = () => {
    if (selectedMethod === 'SPLIT' && splitDifference !== 0) {
      alert(`Split payment must equal total amount. Remaining: ₹${splitDifference}`);
      return;
    }

    onConfirm({
      method: selectedMethod,
      tenderedAmount: selectedMethod === 'CASH' ? cashTendered : undefined,
      changeAmount: selectedMethod === 'CASH' ? changeAmount : undefined,
      splitDetails:
        selectedMethod === 'SPLIT'
          ? { cash: splitCash, upi: splitUpi, card: splitCard }
          : undefined,
      autoPrint,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Select Payment Method</h2>
            <p className="text-xs text-slate-400">Total payable amount</p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 ml-3 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-slate-950/40 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedMethod('CASH')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold transition-all ${
              selectedMethod === 'CASH'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Banknote size={22} className="mb-1" />
            CASH
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('UPI')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold transition-all ${
              selectedMethod === 'UPI'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <QrCode size={22} className="mb-1" />
            UPI QR
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('CARD')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold transition-all ${
              selectedMethod === 'CARD'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CreditCard size={22} className="mb-1" />
            CARD
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('SPLIT')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold transition-all ${
              selectedMethod === 'SPLIT'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Split size={22} className="mb-1" />
            SPLIT
          </button>
        </div>

        {/* Content Area Based on Method */}
        <div className="p-5 flex-1 space-y-4">
          {/* CASH MODE */}
          {selectedMethod === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Cash Received from Counter (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xl font-bold focus:outline-none focus:border-amber-500"
                    placeholder="Enter cash received"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Tender Options */}
              <div className="flex flex-wrap gap-2">
                {quickTenderOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCashTendered(opt.amount)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Change Calculation Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Change to Return</span>
                  <p className="text-xs text-slate-500">Tendered - Bill Total</p>
                </div>
                <span
                  className={`text-xl font-black font-mono ${
                    changeAmount > 0 ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* UPI MODE */}
          {selectedMethod === 'UPI' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-amber-400/80 flex items-center justify-center">
                {customQrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customQrImage}
                    alt="Shop Counter Payment Scanner QR"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={upiQrUrl}
                    alt="Sushi Hotel UPI QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                )}
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold mb-1">
                  {customQrImage ? 'Official Counter Stand QR' : 'Instant Dynamic QR'}
                </div>
                <p className="text-sm font-bold text-white">Scan with GPay / PhonePe / Paytm</p>
                <p className="text-xs font-mono text-amber-400">{upiId}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bill Amount: <strong>{formatCurrency(totalAmount)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* CARD MODE */}
          {selectedMethod === 'CARD' && (
            <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <CreditCard size={32} />
              </div>
              <h3 className="text-base font-bold text-white">Swipe or Tap Card on POS Machine</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Accept Debit Card, Credit Card, or Contactless NFC for {formatCurrency(totalAmount)}.
              </p>
            </div>
          )}

          {/* SPLIT MODE */}
          {selectedMethod === 'SPLIT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Cash (₹)</label>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">UPI (₹)</label>
                  <input
                    type="number"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Card (₹)</label>
                  <input
                    type="number"
                    value={splitCard}
                    onChange={(e) => setSplitCard(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span>Settled: <strong>{formatCurrency(splitTotal)}</strong></span>
                <span className={splitDifference === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {splitDifference === 0 ? 'Balanced ✓' : `Remaining: ₹${splitDifference}`}
                </span>
              </div>
            </div>
          )}

          {/* Auto Print Receipt Checkbox */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Printer size={14} className="text-amber-400" />
                Auto print thermal receipt after saving
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={selectedMethod === 'SPLIT' && splitDifference !== 0}
            className="flex-[2] py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckCircle2 size={18} />
            Complete & Save Bill
          </button>
        </div>
      </div>
    </div>
  );
};
