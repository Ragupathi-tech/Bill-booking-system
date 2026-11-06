'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RestaurantSettings, DailyReportDay } from '@/types/pos';

export interface PdfReportData {
  settings: RestaurantSettings;
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  summary: {
    totalRevenue: number;
    billCount: number;
    avgBillValue: number;
    operationalDays: number;
    leaveDays: number;
    totalDays: number;
    cash: number;
    upi: number;
    card: number;
  };
  dailyBreakdown: DailyReportDay[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

export function generateAndDownloadPdfReport(data: PdfReportData) {
  const { settings, periodLabel, summary, dailyBreakdown, topProducts } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- 1. Top Decorative Brand Bar ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text((settings.restaurant_name || 'SUSHI HOTEL').toUpperCase(), margin, 12);

  // Tagline & Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(settings.tagline || 'Authentic Quality & Taste', margin, 18);
  doc.text(
    `${settings.address || 'Padalur – Oottathur Road, Perambalur Dist, Tamil Nadu'} | Ph: ${
      settings.phone || '+91 98765 43210'
    }`,
    margin,
    23
  );

  // Report Badge Right aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // amber
  doc.text('SALES & AUDIT REPORT', pageWidth - margin, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Period: ${periodLabel}`, pageWidth - margin, 18, { align: 'right' });
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
    pageWidth - margin,
    23,
    { align: 'right' }
  );

  // --- 2. Tax & Legal Meta Row ---
  let cursorY = 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500

  const taxDetails = [];
  if (settings.gstin) taxDetails.push(`GSTIN: ${settings.gstin}`);
  if (settings.fssai) taxDetails.push(`FSSAI: ${settings.fssai}`);
  taxDetails.push(`Currency: INR (Rs.)`);
  taxDetails.push(`POS Terminal: Main Counter (Padalur)`);

  doc.text(taxDetails.join('  |  '), margin, cursorY);

  // --- 3. Executive KPI Summary Cards ---
  cursorY += 5;
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 20;

  // Card 1: Total Revenue
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL REVENUE', margin + 3, cursorY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${summary.totalRevenue.toLocaleString('en-IN')}`, margin + 3, cursorY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Across ${summary.billCount} bills`, margin + 3, cursorY + 17);

  // Card 2: Operational vs Hotel Leave Days (Crucial highlight)
  const c2X = margin + cardWidth + 3;
  // If there are leaves, light red border/accent
  if (summary.leaveDays > 0) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(252, 165, 165); // red-300
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
  }
  doc.roundedRect(c2X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text('HOTEL DAYS STATUS', c2X + 3, cursorY + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (summary.leaveDays > 0) {
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`${summary.leaveDays} Leaves`, c2X + 3, cursorY + 12);
  } else {
    doc.setTextColor(22, 101, 52);
    doc.text(`0 Leaves`, c2X + 3, cursorY + 12);
  }
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${summary.operationalDays} Open / ${summary.totalDays} Total Days`, c2X + 3, cursorY + 17);

  // Card 3: Avg Daily Sales & Ticket Size
  const c3X = margin + (cardWidth + 3) * 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c3X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('AVG BILL VALUE', c3X + 3, cursorY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${summary.avgBillValue.toLocaleString('en-IN')}`, c3X + 3, cursorY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Avg/Day: Rs. ${
      summary.operationalDays > 0
        ? Math.round(summary.totalRevenue / summary.operationalDays).toLocaleString('en-IN')
        : 0
    }`,
    c3X + 3,
    cursorY + 17
  );

  // Card 4: Payment Split (UPI vs Cash)
  const c4X = margin + (cardWidth + 3) * 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c4X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT SPLIT', c4X + 3, cursorY + 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`UPI: Rs. ${summary.upi.toLocaleString('en-IN')}`, c4X + 3, cursorY + 11);
  doc.setTextColor(22, 101, 52); // green-700
  doc.text(`Cash: Rs. ${summary.cash.toLocaleString('en-IN')}`, c4X + 3, cursorY + 17);

  cursorY += cardHeight + 8;

  // --- 4. Section Title: Date-Wise Breakdown ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Date-Wise Sales & Hotel Leave Log', margin, cursorY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '*Days marked as Hotel Leave (Closed / No Sales) are highlighted in RED below.',
    margin + 75,
    cursorY
  );

  cursorY += 3;

  // Build Table Data for Date-wise Log
  const tableRows = dailyBreakdown.map((day) => {
    if (day.isLeave) {
      // HOTEL LEAVE DAY: Show prominent RED row
      const leaveText = day.leaveReason
        ? `HOTEL LEAVE (${day.leaveReason})`
        : 'HOTEL LEAVE / CLOSED';

      return [
        {
          content: `${day.formattedDate}\n(${day.dayName})`,
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold' },
        },
        {
          content: `[!] ${leaveText}`,
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold' },
        },
        {
          content: '0',
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], halign: 'center' },
        },
        {
          content: 'Rs. 0',
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], halign: 'right' },
        },
        {
          content: 'Rs. 0',
          styles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], halign: 'right' },
        },
        {
          content: 'Rs. 0',
          styles: {
            fillColor: [254, 226, 226],
            textColor: [185, 28, 28],
            fontStyle: 'bold',
            halign: 'right',
          },
        },
      ];
    }

    // Normal Operational Day
    return [
      {
        content: `${day.formattedDate}\n(${day.dayName})`,
        styles: { textColor: [15, 23, 42], fontStyle: 'bold' },
      },
      {
        content: 'OPEN (Operational)',
        styles: { textColor: [22, 101, 52], fontStyle: 'bold' },
      },
      {
        content: String(day.billsCount),
        styles: { textColor: [15, 23, 42], halign: 'center' },
      },
      {
        content: `Rs. ${day.cashSales.toLocaleString('en-IN')}`,
        styles: { textColor: [15, 23, 42], halign: 'right' },
      },
      {
        content: `Rs. ${day.upiSales.toLocaleString('en-IN')}`,
        styles: { textColor: [15, 23, 42], halign: 'right' },
      },
      {
        content: `Rs. ${day.grossSales.toLocaleString('en-IN')}`,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold', halign: 'right' }, // amber-700
      },
    ];
  });

  // Footer summary row
  const tableFooter = [
    [
      {
        content: `TOTAL (${summary.totalDays} Days: ${summary.operationalDays} Open, ${summary.leaveDays} Leaves)`,
        colSpan: 2,
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      },
      {
        content: String(summary.billCount),
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
      },
      {
        content: `Rs. ${summary.cash.toLocaleString('en-IN')}`,
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right',
        },
      },
      {
        content: `Rs. ${summary.upi.toLocaleString('en-IN')}`,
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right',
        },
      },
      {
        content: `Rs. ${summary.totalRevenue.toLocaleString('en-IN')}`,
        styles: {
          fillColor: [15, 23, 42],
          textColor: [251, 191, 36], // amber-400
          fontStyle: 'bold',
          halign: 'right',
        },
      },
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        'Date & Day',
        'Hotel Status',
        'Bills Count',
        'Cash Collection',
        'UPI Collection',
        'Total Revenue',
      ],
    ],
    body: tableRows as any,
    foot: tableFooter as any,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 48 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Next cursor after first table
  let finalY = (doc as any).lastAutoTable?.finalY || 160;

  // --- 5. Dish-Wise Top Sales Breakdown Table ---
  // If not enough room on current page, add new page
  if (finalY > pageHeight - 60) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Dish-Wise Sales & Volume Breakdown', margin, finalY);
  finalY += 3;

  const dishRows = topProducts.slice(0, 15).map((p, idx) => {
    const share =
      summary.totalRevenue > 0
        ? `${Math.round((p.revenue / summary.totalRevenue) * 100)}%`
        : '0%';
    return [
      `#${idx + 1}`,
      p.name,
      String(p.qty),
      `Rs. ${p.revenue.toLocaleString('en-IN')}`,
      share,
    ];
  });

  autoTable(doc, {
    startY: finalY,
    head: [['Rank', 'Dish / Menu Item', 'Quantity Sold', 'Total Revenue', 'Revenue Share']],
    body: dishRows,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  finalY = (doc as any).lastAutoTable?.finalY || 220;

  // --- 6. Verification & Signatures ---
  if (finalY > pageHeight - 40) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 12;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This is an official system-generated audit report generated from Sushi Hotel Smart POS. All figures include GST where applicable.',
    margin,
    finalY
  );

  finalY += 14;
  const sigWidth = 60;

  // Cashier / Manager Signature
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, finalY, margin + sigWidth, finalY);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared by: Cashier / Duty Manager', margin, finalY + 4);

  // Owner / Auditor Signature
  const ownerX = pageWidth - margin - sigWidth;
  doc.line(ownerX, finalY, ownerX + sigWidth, finalY);
  doc.text('Approved by: Hotel Owner / Auditor', ownerX, finalY + 4);

  // --- 7. Page numbering on all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sushi Hotel POS • Padalur | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // --- 8. Trigger Save / Download ---
  const cleanFilename = `sushi_hotel_report_${data.startDateStr}_to_${data.endDateStr}.pdf`;
  doc.save(cleanFilename);
}
