'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bill, RestaurantSettings, PrinterSettings } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { ThermalReceiptModal } from '@/components/receipt/ThermalReceiptModal';
import { BackButton } from '@/components/ui/BackButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  History,
  Search,
  Printer,
  Calendar,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function BillHistoryPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(posStore.getPrinterSettings());
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // In-Screen Confirm Dialog state
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
      // 1. Search Filter (by Bill No)
      const matchSearch =
        search.trim() === '' ||
        b.bill_number.toLowerCase().includes(search.toLowerCase());

      // 2. Date Filter
      let matchDate = true;
      if (dateFilter === 'TODAY') {
        matchDate = b.created_at.startsWith(todayStr);
      } else if (dateFilter === 'YESTERDAY') {
        matchDate = b.created_at.startsWith(yesterdayStr);
      } else if (dateFilter === 'WEEK') {
        matchDate = new Date(b.created_at) >= weekAgo;
      } else if (dateFilter === 'MONTH') {
        matchDate = new Date(b.created_at) >= monthAgo;
      }

      return matchSearch && matchDate;
    });
  }, [bills, search, dateFilter]);

  const summary = useMemo(() => {
    const totalAmount = filteredBills.reduce((acc, b) => acc + b.total, 0);
    return {
      count: filteredBills.length,
      totalAmount,
    };
  }, [filteredBills]);

  // Delete Individual Bill
  const handleDeleteBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Bill #${bill.bill_number}?`,
      message: `Are you sure you want to delete Bill #${bill.bill_number} (₹${bill.total})? This will permanently remove it from history and reports.`,
      type: 'danger',
      onConfirm: async () => {
        await posStore.deleteBill(bill.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Delete All Filtered Bills
  const handleClearFiltered = () => {
    if (filteredBills.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${filteredBills.length} Filtered Bills?`,
      message: `WARNING: Are you sure you want to delete ALL ${filteredBills.length} filtered bills? This cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        for (const b of filteredBills) {
          await posStore.deleteBill(b.id);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Audit & Records
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Bill History
            </h1>
            <p className="text-xs text-slate-400">
              Review completed orders, reprint thermal receipts, or delete records
            </p>
          </div>

          <div className="flex items-center gap-3">
            {filteredBills.length > 0 && (
              <button
                type="button"
                onClick={handleClearFiltered}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/80 transition-all active:scale-95"
                title="Delete all currently filtered bills"
              >
                <Trash2 size={14} />
                Delete Filtered ({filteredBills.length})
              </button>
            )}

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">
                  Total Bills
                </span>
                <strong className="text-base text-white">{summary.count}</strong>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">
                  Total Amount
                </span>
                <strong className="text-base text-amber-400">
                  {formatCurrency(summary.totalAmount)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill number (e.g. SH-000101)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'WEEK', label: 'Last 7 Days' },
              { id: 'MONTH', label: 'This Month' },
              { id: 'ALL', label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  dateFilter === tab.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bills Table with Delete Actions */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Items Summary</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No bills match your current filter.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    const dateObj = new Date(b.created_at);
                    const formattedDate = dateObj.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {b.bill_number}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <div>{formattedDate}</div>
                          <div className="text-[10px] text-slate-500">{formattedTime}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          <span className="font-semibold text-white">
                            {b.items.reduce((acc, i) => acc + i.quantity, 0)} items:
                          </span>{' '}
                          {b.items.map((i) => `${i.product_name_snapshot} (${i.quantity})`).join(', ')}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.payment_method === 'UPI'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : b.payment_method === 'CASH'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {b.payment_method}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                          {formatCurrency(b.total)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <CheckCircle size={11} />
                            PAID
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedBill(b)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                              title="Reprint / View Thermal Receipt"
                            >
                              <Printer size={13} />
                              Receipt
                            </button>

                            {/* Delete Bill Action Button */}
                            <button
                              onClick={() => handleDeleteBill(b)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-700/80 transition-colors"
                              title={`Delete Bill #${b.bill_number}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* Thermal Receipt Modal */}
      {selectedBill && (
        <ThermalReceiptModal
          bill={selectedBill}
          settings={settings}
          printerSettings={printerSettings}
          onClose={() => setSelectedBill(null)}
        />
      )}

      {/* In-Screen Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
