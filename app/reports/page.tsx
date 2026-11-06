'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bill, Product, Category, RestaurantSettings, DailyReportDay } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { BackButton } from '@/components/ui/BackButton';
import { generateAndDownloadPdfReport } from '@/lib/reporting/pdfReportGenerator';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Download,
  Calendar,
  Layers,
  Utensils,
  DollarSign,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Building,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

type TimeframePreset = '7DAYS' | '14DAYS' | '30DAYS' | 'MONTH' | 'CUSTOM';

export default function ReportsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(posStore.getSettings());
  const [leaves, setLeaves] = useState<Record<string, string>>({});

  const [timeframe, setTimeframe] = useState<TimeframePreset>('7DAYS');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setBills(posStore.getBills());
      setCategories(posStore.getCategories());
      setProducts(posStore.getProducts());
      setSettings(posStore.getSettings());
      setLeaves(posStore.getHotelLeaves());
    };
    load();
    const unsub = subscribeToStore(load);
    return () => unsub();
  }, []);

  // Compute Active Date Range [startDateObj, endDateObj]
  const dateRange = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (timeframe === 'CUSTOM') {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T23:59:59');
      return { start, end };
    }

    if (timeframe === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { start, end: now };
    }

    const days = timeframe === '7DAYS' ? 7 : timeframe === '14DAYS' ? 14 : 30;
    const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }, [timeframe, customStartDate, customEndDate]);

  // Filter bills within selected date range
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const d = new Date(b.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [bills, dateRange]);

  // Date-Wise Daily Analysis (Every single calendar day in the interval)
  const dailyBreakdown: DailyReportDay[] = useMemo(() => {
    const list: DailyReportDay[] = [];
    const cur = new Date(dateRange.start);
    cur.setHours(0, 0, 0, 0);

    const endBoundary = new Date(dateRange.end);
    endBoundary.setHours(23, 59, 59, 999);

    const dayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'long' });
    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    while (cur <= endBoundary) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayBills = filteredBills.filter((b) => b.created_at.startsWith(dateStr));

      let grossSales = 0;
      let cashSales = 0;
      let upiSales = 0;
      let cardSales = 0;

      for (const b of dayBills) {
        grossSales += b.total;
        if (b.payment_method === 'CASH') cashSales += b.total;
        else if (b.payment_method === 'UPI') upiSales += b.total;
        else if (b.payment_method === 'CARD') cardSales += b.total;
        else if (b.payment_method === 'SPLIT' && b.split_details) {
          cashSales += b.split_details.cash || 0;
          upiSales += b.split_details.upi || 0;
          cardSales += b.split_details.card || 0;
        }
      }

      const explicitLeaveReason = leaves[dateStr];
      // Hotel is on leave if: explicitly marked in leaves OR 0 bills / 0 revenue on that day
      const isLeave = Boolean(explicitLeaveReason) || dayBills.length === 0;

      list.push({
        date: dateStr,
        formattedDate: dateFormatter.format(cur),
        dayName: dayFormatter.format(cur),
        billsCount: dayBills.length,
        grossSales,
        cashSales,
        upiSales,
        cardSales,
        isLeave,
        leaveReason: explicitLeaveReason || (dayBills.length === 0 ? 'No Sales / Off-Day' : undefined),
      });

      // Move to next day
      cur.setDate(cur.getDate() + 1);
    }

    return list;
  }, [dateRange, filteredBills, leaves]);

  // High-Level Aggregate Summary
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let cash = 0;
    let upi = 0;
    let card = 0;

    for (const b of filteredBills) {
      totalRevenue += b.total;
      if (b.payment_method === 'CASH') cash += b.total;
      else if (b.payment_method === 'UPI') upi += b.total;
      else if (b.payment_method === 'CARD') card += b.total;
      else if (b.payment_method === 'SPLIT' && b.split_details) {
        cash += b.split_details.cash || 0;
        upi += b.split_details.upi || 0;
        card += b.split_details.card || 0;
      }
    }

    const billCount = filteredBills.length;
    const totalDays = dailyBreakdown.length;
    const leaveDays = dailyBreakdown.filter((d) => d.isLeave).length;
    const operationalDays = totalDays - leaveDays;
    const avgBillValue = billCount > 0 ? Math.round(totalRevenue / billCount) : 0;
    const avgDailySales = operationalDays > 0 ? Math.round(totalRevenue / operationalDays) : 0;

    return {
      totalRevenue,
      billCount,
      avgBillValue,
      avgDailySales,
      totalDays,
      leaveDays,
      operationalDays,
      cash,
      upi,
      card,
    };
  }, [filteredBills, dailyBreakdown]);

  // Product-wise Performance
  const productPerformance = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const b of filteredBills) {
      for (const item of b.items) {
        const name = item.product_name_snapshot;
        if (!map[name]) {
          map[name] = { name, qty: 0, revenue: 0 };
        }
        map[name].qty += item.quantity;
        map[name].revenue += item.total;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBills]);

  // Chart Data for Daily Sales Trend
  const chartData = useMemo(() => {
    return dailyBreakdown.map((d) => ({
      name: d.formattedDate.slice(0, 6),
      sales: d.grossSales,
      isLeave: d.isLeave,
    }));
  }, [dailyBreakdown]);

  const periodLabel = useMemo(() => {
    const startStr = dateRange.start.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const endStr = dateRange.end.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${startStr} to ${endStr}`;
  }, [dateRange]);

  // Handle PDF Download
  const handleDownloadPdf = () => {
    try {
      setIsPdfGenerating(true);
      generateAndDownloadPdfReport({
        settings,
        periodLabel,
        startDateStr: dateRange.start.toISOString().split('T')[0],
        endDateStr: dateRange.end.toISOString().split('T')[0],
        summary,
        dailyBreakdown,
        topProducts: productPerformance,
      });
      setFeedbackMessage('PDF report downloaded successfully!');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Handle Native Browser Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Export Full Report CSV
  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Day',
      'Hotel Status',
      'Bills Count',
      'Cash Sales',
      'UPI Sales',
      'Total Sales',
    ];
    const rows = dailyBreakdown.map((d) => [
      d.date,
      d.dayName,
      d.isLeave ? `HOTEL LEAVE (${d.leaveReason || 'Closed'})` : 'OPEN',
      d.billsCount,
      d.cashSales,
      d.upiSales,
      d.grossSales,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sushi_hotel_sales_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Leave Status for a specific date
  const handleToggleLeave = (dateStr: string) => {
    posStore.toggleHotelLeave(dateStr, 'Hotel Leave / Weekly Off');
  };

  // Seed sample data for testing
  const handleSeedDemoData = () => {
    posStore.seedSampleWeekWithLeave();
    setFeedbackMessage('Loaded 7-day realistic sales demo with Tuesday Hotel Leave!');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-24">
      {/* Print-Only Header (Visible only when saving/printing to PDF) */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-slate-800 text-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950">
              {settings.restaurant_name || 'SUSHI HOTEL'}
            </h1>
            <p className="text-xs text-slate-600">{settings.tagline || 'Authentic Quality & Taste'}</p>
            <p className="text-xs text-slate-600">{settings.address} | Ph: {settings.phone}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              GSTIN: {settings.gstin || '33AAAAA0000A1Z5'} • FSSAI: {settings.fssai || '12423000000000'}
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded">
              Official Sales & Operational Report
            </span>
            <p className="text-xs font-bold text-slate-800 mt-2">Period: {periodLabel}</p>
            <p className="text-[10px] text-slate-500">
              Printed: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="no-print p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Control Header */}
        <div className="no-print flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Building size={13} />
                Hotel Business Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Sales & Operational Reports
            </h1>
            <p className="text-xs text-slate-400">
              Date-wise sales log, hotel leave highlights, payment breakdown, and high-quality PDF export
            </p>
          </div>

          {/* Action Buttons: PDF, Print & CSV */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              title="Download beautifully styled PDF report to your device"
            >
              <Download size={16} />
              <span>{isPdfGenerating ? 'Preparing PDF...' : 'Download Report PDF'}</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Print directly or save via browser print dialog"
            >
              <Printer size={15} className="text-slate-300" />
              <span>Print / Save PDF</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 active:scale-95"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Demo Sample Generator */}
            <button
              type="button"
              onClick={handleSeedDemoData}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 active:scale-95"
              title="Populate a sample 7-day week with an official Hotel Leave day to view the red highlight"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span className="hidden md:inline">Demo Week (with Leave)</span>
            </button>
          </div>
        </div>

        {/* Timeframe Filter Bar */}
        <div className="no-print p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Calendar size={14} className="text-amber-400" />
              Timeframe:
            </span>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setTimeframe('7DAYS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '7DAYS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeframe('14DAYS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '14DAYS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => setTimeframe('30DAYS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '30DAYS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeframe('MONTH')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === 'MONTH'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeframe('CUSTOM')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === 'CUSTOM'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timeframe === 'CUSTOM' ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="text-slate-400 text-[11px]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white font-mono focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="text-slate-400 text-[11px]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white font-mono focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">
              Active Range: <span className="text-white font-bold">{periodLabel}</span>
            </div>
          )}
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 shadow-md">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
              Total Revenue
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across {summary.billCount} bills issued</p>
          </div>

          {/* Card 2: Hotel Operational vs Leave Days (HIGHLIGHTED IN RED IF LEAVES PRESENT) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              summary.leaveDays > 0
                ? 'bg-rose-950/25 border-rose-500/40 shadow-lg shadow-rose-950/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  summary.leaveDays > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                Hotel Days Status
              </span>
              {summary.leaveDays > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {summary.leaveDays} LEAVE
                </span>
              )}
            </div>

            <div className="text-2xl sm:text-3xl font-black font-mono flex items-baseline gap-2">
              <span className="text-emerald-400">{summary.operationalDays} Open</span>
              {summary.leaveDays > 0 && (
                <span className="text-sm font-bold text-rose-400">/ {summary.leaveDays} Leaves</span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-1">
              {summary.totalDays} total days in reporting period
            </p>
          </div>

          {/* Card 3: Average Daily Sales / Ticket */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Daily Avg Sales
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {formatCurrency(summary.avgDailySales)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Avg Bill Value: {formatCurrency(summary.avgBillValue)}
            </p>
          </div>

          {/* Card 4: Payment Collections */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Collections Breakdown
            </span>
            <div className="space-y-1 my-auto">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-blue-400 font-semibold">UPI:</span>
                <span className="font-bold text-white">{formatCurrency(summary.upi)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold">Cash:</span>
                <span className="font-bold text-white">{formatCurrency(summary.cash)}</span>
              </div>
              {summary.card > 0 && (
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-400 font-semibold">Card:</span>
                  <span className="font-bold text-white">{formatCurrency(summary.card)}</span>
                </div>
              )}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 flex">
              <div
                style={{
                  width: `${summary.totalRevenue > 0 ? (summary.upi / summary.totalRevenue) * 100 : 0}%`,
                }}
                className="bg-blue-500 h-full"
                title="UPI share"
              />
              <div
                style={{
                  width: `${summary.totalRevenue > 0 ? (summary.cash / summary.totalRevenue) * 100 : 0}%`,
                }}
                className="bg-emerald-500 h-full"
                title="Cash share"
              />
            </div>
          </div>
        </div>

        {/* PRIMARY CORE SECTION: DATE-WISE SALES & HOTEL LEAVE LOG TABLE */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white">
                  Date-Wise Operational & Sales Log
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Leaves Highlighted in Red
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological ledger for every day. If the hotel is on leave / closed, the row is distinctly highlighted in red.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Open ({summary.operationalDays})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="font-bold text-rose-400">Hotel Leave ({summary.leaveDays})</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Day</th>
                  <th className="py-3.5 px-4">Hotel Status</th>
                  <th className="py-3.5 px-4 text-center">Bills</th>
                  <th className="py-3.5 px-4 text-right">Cash</th>
                  <th className="py-3.5 px-4 text-right">UPI</th>
                  <th className="py-3.5 px-4 text-right">Total Revenue</th>
                  <th className="no-print py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80 font-medium">
                {dailyBreakdown.map((day) => {
                  if (day.isLeave) {
                    // HOTEL LEAVE DAY: SHOW AS PROMINENT RED ROW
                    return (
                      <tr
                        key={day.date}
                        className="bg-rose-950/40 hover:bg-rose-950/60 border-l-4 border-l-rose-500 text-rose-200 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-100">
                          {day.formattedDate}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-rose-200">
                          {day.dayName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-600/30 text-rose-200 border border-rose-500/50 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            🔴 HOTEL LEAVE / CLOSED
                            {day.leaveReason && day.leaveReason !== 'No Sales / Off-Day' && (
                              <span className="text-[10px] text-rose-300 font-normal ml-1">
                                ({day.leaveReason})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-300 font-bold">
                          0
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-300">
                          ₹0
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-300">
                          ₹0
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-rose-400 text-sm">
                          ₹0
                        </td>
                        <td className="no-print py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleLeave(day.date)}
                            className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-[10px] text-rose-100 font-bold border border-rose-700 active:scale-95 transition-all cursor-pointer"
                            title="Toggle leave status for this day"
                          >
                            Mark Open
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // NORMAL OPERATIONAL DAY
                  return (
                    <tr
                      key={day.date}
                      className="hover:bg-slate-800/40 transition-colors border-l-4 border-l-emerald-500/50"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {day.formattedDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {day.dayName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          🟢 OPEN (Active)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-200 font-bold">
                        {day.billsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {formatCurrency(day.cashSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-400">
                        {formatCurrency(day.upiSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(day.grossSales)}
                      </td>
                      <td className="no-print py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleLeave(day.date)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white font-medium border border-slate-700 active:scale-95 transition-all cursor-pointer"
                          title="Mark this day as Hotel Leave / Holiday"
                        >
                          Set Leave
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Summary Footer */}
              <tfoot className="bg-slate-950 font-bold text-xs border-t-2 border-slate-700">
                <tr>
                  <td colSpan={2} className="py-4 px-4 text-white">
                    TOTALS ({summary.totalDays} Days: {summary.operationalDays} Open,{' '}
                    <span className="text-rose-400">{summary.leaveDays} Leaves</span>)
                  </td>
                  <td className="py-4 px-4 text-slate-400">
                    Net Performance
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-white text-sm">
                    {summary.billCount}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-400">
                    {formatCurrency(summary.cash)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-blue-400">
                    {formatCurrency(summary.upi)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-black text-amber-400 text-base">
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                  <td className="no-print py-4 px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Revenue Timeline Chart */}
        <div className="no-print p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Revenue Timeline Chart</h3>
              <p className="text-xs text-slate-400">
                Daily sales trend. Days with zero sales indicate hotel leave or off-days.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total: {formatCurrency(summary.totalRevenue)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
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
                  formatter={(val: any, name: any, item: any) => [
                    item.payload.isLeave ? 'HOTEL LEAVE (₹0)' : `₹${val}`,
                    'Revenue',
                  ]}
                />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isLeave ? '#ef4444' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dish-Level Sales Breakdown Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Dish-Level Sales Breakdown</h3>
              <p className="text-xs text-slate-400">
                Individual menu item popularity, volume, and total revenue contribution
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {productPerformance.length} distinct dishes sold
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Dish Name</th>
                  <th className="py-3 px-4 text-center">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Revenue Share</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {productPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No sales data available for the selected timeframe.
                    </td>
                  </tr>
                ) : (
                  productPerformance.map((p, idx) => {
                    const share =
                      summary.totalRevenue > 0
                        ? Math.round((p.revenue / summary.totalRevenue) * 100)
                        : 0;
                    return (
                      <tr key={p.name} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white text-xs sm:text-sm">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-center text-slate-200">
                          {p.qty}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-xs">
                          {share}%
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-right text-amber-400 text-sm">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification & Auditor Sign-off (Visible on screen and printed PDF) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="space-y-1 text-center sm:text-left">
            <span className="font-bold text-slate-300 block">System Verification Note:</span>
            <p className="text-[11px]">
              Report generated from Sushi Hotel Smart POS. All daily records, payment splits, and hotel leave entries have been audited.
            </p>
          </div>

          <div className="flex items-center gap-8 text-center">
            <div className="border-t border-slate-700 pt-2 w-36">
              <span className="text-[10px] text-slate-400 font-medium">Duty Manager / Cashier</span>
            </div>
            <div className="border-t border-slate-700 pt-2 w-36">
              <span className="text-[10px] text-slate-400 font-medium">Hotel Owner / Auditor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
