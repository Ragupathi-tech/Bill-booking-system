'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bill,
  RestaurantSettings,
  PrinterSettings,
} from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { ThermalReceiptModal } from '@/components/receipt/ThermalReceiptModal';
import { BackButton } from '@/components/ui/BackButton';
import {
  TrendingUp,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Utensils,
  Eye,
  Printer,
  Calendar,
  Clock,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(posStore.getPrinterSettings());
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<Bill | null>(null);

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

  // Today's metrics calculations
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayBills = useMemo(() => {
    return bills.filter((b) => b.created_at.startsWith(todayDateStr));
  }, [bills, todayDateStr]);

  const metrics = useMemo(() => {
    let todaySales = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    for (const b of todayBills) {
      todaySales += b.total;
      if (b.payment_method === 'CASH') cashTotal += b.total;
      else if (b.payment_method === 'UPI') upiTotal += b.total;
      else if (b.payment_method === 'CARD') cardTotal += b.total;
      else if (b.payment_method === 'SPLIT' && b.split_details) {
        cashTotal += b.split_details.cash || 0;
        upiTotal += b.split_details.upi || 0;
        cardTotal += b.split_details.card || 0;
      }
    }

    // Lifetime sales
    const lifetimeSales = bills.reduce((acc, curr) => acc + curr.total, 0);

    return {
      todaySales,
      todayBillsCount: todayBills.length,
      cashTotal,
      upiTotal,
      cardTotal,
      lifetimeSales,
      lifetimeBillsCount: bills.length,
    };
  }, [todayBills, bills]);

  // Hourly sales chart data for today
  const hourlyChartData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let i = 8; i <= 23; i++) {
      hoursMap[i] = 0;
    }

    for (const b of todayBills) {
      const h = new Date(b.created_at).getHours();
      if (hoursMap[h] !== undefined) {
        hoursMap[h] += b.total;
      }
    }

    return Object.entries(hoursMap).map(([h, sales]) => {
      const hourNum = parseInt(h);
      const label =
        hourNum === 12
          ? '12 PM'
          : hourNum > 12
          ? `${hourNum - 12} PM`
          : `${hourNum} AM`;
      return {
        hour: label,
        sales,
      };
    });
  }, [todayBills]);

  // Payment Breakdown for Pie Chart
  const paymentBreakdownData = useMemo(() => {
    return [
      { name: 'UPI', value: metrics.upiTotal, color: '#3b82f6' },
      { name: 'Cash', value: metrics.cashTotal, color: '#10b981' },
      { name: 'Card', value: metrics.cardTotal, color: '#a855f7' },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // Top Selling Dishes
  const topDishes = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const b of bills) {
      for (const item of b.items) {
        const id = item.product_name_snapshot;
        if (!map[id]) {
          map[id] = { name: id, qty: 0, revenue: 0 };
        }
        map[id].qty += item.quantity;
        map[id].revenue += item.total;
      }
    }

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [bills]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Welcome & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Overview & Analytics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Restaurant Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live sales performance and counter metrics for Sushi Hotel
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <PlusCircle size={16} />
              Open POS Billing
            </Link>
          </div>
        </div>

        {/* 5 Key Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Today's Sales */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today&apos;s Sales</span>
              <TrendingUp size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatCurrency(metrics.todaySales)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              From {metrics.todayBillsCount} bills today
            </p>
          </div>

          {/* Today's Bills */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today&apos;s Bills</span>
              <Receipt size={18} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {metrics.todayBillsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total lifetime: {metrics.lifetimeBillsCount}
            </p>
          </div>

          {/* Cash Collection */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
              <Banknote size={18} />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(metrics.cashTotal)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Direct cash in drawer</p>
          </div>

          {/* UPI Collection */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">UPI / QR</span>
              <QrCode size={18} />
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {formatCurrency(metrics.upiTotal)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">GPay, PhonePe, Paytm</p>
          </div>

          {/* Card Collection */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Card</span>
              <CreditCard size={18} />
            </div>
            <div className="text-2xl font-black font-mono text-purple-400">
              {formatCurrency(metrics.cardTotal)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">POS machine swipes</p>
          </div>
        </div>

        {/* Charts Section: Sales Hourly Trend + Payment Method Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Trend */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Today&apos;s Hourly Sales Trend</h3>
                <p className="text-xs text-slate-400">Revenue per hour across counter shifts</p>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                Live Today
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData}>
                  <XAxis
                    dataKey="hour"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`₹${val}`, 'Sales']}
                  />
                  <Bar dataKey="sales" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Method Share */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Payment Method Share</h3>
              <p className="text-xs text-slate-400 mb-4">Breakdown of today&apos;s collection</p>

              {paymentBreakdownData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                  No bills collected today yet.
                </div>
              ) : (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {paymentBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '11px',
                        }}
                        formatter={(val: any) => [`₹${val}`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Legend & Summary */}
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  UPI
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(metrics.upiTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Cash
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(metrics.cashTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Card
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(metrics.cardTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Bottom Tables: Recent Bills & Top Selling Dishes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bills */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Recent Bills</h3>
                <p className="text-xs text-slate-400">Latest completed receipts</p>
              </div>
              <Link
                href="/bills"
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                View All <ArrowUpRight size={14} />
              </Link>
            </div>

            {bills.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No bills created yet. Create a bill from POS.
              </div>
            ) : (
              <div className="space-y-2">
                {bills.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {b.bill_number}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            b.payment_method === 'UPI'
                              ? 'bg-blue-500/20 text-blue-300'
                              : b.payment_method === 'CASH'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {b.payment_method}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(b.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} • {b.items.length} items
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-amber-400">
                        {formatCurrency(b.total)}
                      </span>
                      <button
                        onClick={() => setSelectedBillForReceipt(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="View Thermal Receipt"
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Dishes */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Top Selling Dishes</h3>
                <p className="text-xs text-slate-400">Most ordered items by customers</p>
              </div>
              <Utensils size={16} className="text-amber-400" />
            </div>

            {topDishes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Top dishes will appear as bills are generated.
              </div>
            ) : (
              <div className="space-y-3">
                {topDishes.map((dish, i) => (
                  <div
                    key={dish.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">{dish.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {dish.qty} orders served
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-amber-400">
                        {formatCurrency(dish.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {selectedBillForReceipt && (
        <ThermalReceiptModal
          bill={selectedBillForReceipt}
          settings={settings}
          printerSettings={printerSettings}
          onClose={() => setSelectedBillForReceipt(null)}
        />
      )}
    </div>
  );
}
