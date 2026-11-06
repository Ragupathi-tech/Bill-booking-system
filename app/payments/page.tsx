'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bill, RestaurantSettings, PrinterSettings, PaymentMethod } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { ThermalReceiptModal } from '@/components/receipt/ThermalReceiptModal';
import { BackButton } from '@/components/ui/BackButton';
import {
  CreditCard,
  Banknote,
  QrCode,
  Download,
  Calendar,
  Filter,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

export default function PaymentsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(posStore.getPrinterSettings());
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    const load = () => {
      setBills(posStore.getBills());
      setSettings(posStore.getSettings());
      setPrinterSettings(posStore.getPrinterSettings());
    };
    load();
    const unsub = subscribeToStore(load);
    return () => unsub();
  }, []);

  const filteredBills = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    return bills.filter((b) => {
      // Date Filter
      let matchDate = true;
      if (dateFilter === 'TODAY') matchDate = b.created_at.startsWith(todayStr);
      else if (dateFilter === 'YESTERDAY') matchDate = b.created_at.startsWith(yesterdayStr);
      else if (dateFilter === 'WEEK') matchDate = new Date(b.created_at) >= weekAgo;
      else if (dateFilter === 'MONTH') matchDate = new Date(b.created_at) >= monthAgo;

      // Method Filter
      let matchMethod = true;
      if (methodFilter !== 'ALL') {
        matchMethod = b.payment_method === methodFilter;
      }

      return matchDate && matchMethod;
    });
  }, [bills, dateFilter, methodFilter]);

  const aggregates = useMemo(() => {
    let total = 0;
    let cash = 0;
    let upi = 0;
    let card = 0;

    for (const b of filteredBills) {
      total += b.total;
      if (b.payment_method === 'CASH') cash += b.total;
      else if (b.payment_method === 'UPI') upi += b.total;
      else if (b.payment_method === 'CARD') card += b.total;
      else if (b.payment_method === 'SPLIT' && b.split_details) {
        cash += b.split_details.cash || 0;
        upi += b.split_details.upi || 0;
        card += b.split_details.card || 0;
      }
    }

    return { total, cash, upi, card, count: filteredBills.length };
  }, [filteredBills]);

  // Export filtered payment records to CSV
  const handleExportCsv = () => {
    if (filteredBills.length === 0) {
      alert('No payment records to export.');
      return;
    }

    const headers = ['Bill Number', 'Date', 'Time', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment Method'];
    const rows = filteredBills.map((b) => {
      const d = new Date(b.created_at);
      return [
        b.bill_number,
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN'),
        b.subtotal,
        b.discount,
        b.gst,
        b.total,
        b.payment_method,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sushi_hotel_payments_${dateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Collections & Reconciliation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Payment Records
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditable settlement totals across Cash, UPI QR, and Card
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            Export to CSV
          </button>
        </div>

        {/* 4 Financial Aggregate Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
              Total Collection
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatCurrency(aggregates.total)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{aggregates.count} settled bills</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Cash Total</span>
              <Banknote size={16} />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(aggregates.cash)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Physical drawer currency</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">UPI / QR</span>
              <QrCode size={16} />
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {formatCurrency(aggregates.upi)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Direct bank settlements</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-purple-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Card Total</span>
              <CreditCard size={16} />
            </div>
            <div className="text-2xl font-black font-mono text-purple-400">
              {formatCurrency(aggregates.card)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">POS machine charges</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          {/* Date tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'WEEK', label: 'This Week' },
              { id: 'MONTH', label: 'This Month' },
              { id: 'ALL', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilter === tab.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment method selector */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Methods' },
              { id: 'CASH', label: 'Cash' },
              { id: 'UPI', label: 'UPI' },
              { id: 'CARD', label: 'Card' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodFilter(m.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  methodFilter === m.id
                    ? 'bg-slate-700 text-white border border-slate-500'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Records Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Subtotal</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">GST</th>
                  <th className="py-3.5 px-4">Final Paid</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No payment records found for selected period.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    const dateObj = new Date(b.created_at);
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {b.bill_number}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {dateObj.toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {dateObj.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.payment_method === 'UPI'
                                ? 'bg-blue-500/20 text-blue-300'
                                : b.payment_method === 'CASH'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {b.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          ₹{b.subtotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {b.discount > 0 ? `-₹${b.discount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {b.gst > 0 ? `₹${b.gst.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-amber-400 text-sm">
                          {formatCurrency(b.total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedBill(b)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="View Receipt"
                          >
                            <Printer size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBill && (
        <ThermalReceiptModal
          bill={selectedBill}
          settings={settings}
          printerSettings={printerSettings}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
