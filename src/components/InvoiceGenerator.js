import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';

// Design System Constants
const COLORS = {
  PRIMARY: [220, 38, 38],   // Red (Corporate)
  SUCCESS: [34, 197, 94],   // Green
  INFO: [59, 130, 246],      // Blue
  DARK: [31, 41, 55],       // Gray 800
  LIGHT_GRAY: [243, 244, 246],
  BORDER: [209, 213, 219],
  TEXT_DARK: [17, 24, 39],
  TEXT_GRAY: [107, 114, 128]
};

const COMPANY_INFO = {
  name: "CAKRA LIMA TUJUH",
  tagline: "Rental Mobil Surabaya - Profesional & Terpercaya",
  address: "Lembah Harapan, Blok AA-57, Lidah Wetan",
  city: "Kec. Lakarsantri, Surabaya",
  email: "limatujuhcakra@gmail.com",
  phone: "0812-xxxx-xxxx" // Adjusted to placeholder if not known
};

// Helper to Format Currency
const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

// Helper: Add Business Header
const addHeader = (doc, title, color = COLORS.PRIMARY) => {
  // Brand Header Background (Subtle line)
  doc.setDrawColor(...color);
  doc.setLineWidth(1.5);
  doc.line(15, 45, 195, 45);

  // Logo
  try {
    doc.addImage(logo, 'PNG', 15, 12, 30, 30);
  } catch (e) {
    console.error("Logo error:", e);
  }

  // Company Info (Right Aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(COMPANY_INFO.name, 195, 20, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.TEXT_GRAY);
  doc.text(COMPANY_INFO.address, 195, 26, { align: "right" });
  doc.text(COMPANY_INFO.city, 195, 31, { align: "right" });
  doc.text(`Email: ${COMPANY_INFO.email}`, 195, 36, { align: "right" });

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.text(title, 15, 55);
};

// Helper: Add Info Grid
const addInfoGrid = (doc, order, user, invoiceNo, statusText, y) => {
  // Client Details
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.text("DITAGIHKAN KEPADA:", 15, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.DARK);
  doc.text(user?.nama || order.namaClient || "-", 15, y + 7);
  doc.text(user?.email || order.email || "-", 15, y + 12);
  doc.text(user?.nomorTelepon || order.telepon || "-", 15, y + 17);

  // Invoice Details (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Invoice:", 140, y);
  
  doc.setFont("helvetica", "normal");
  doc.text(`No. Invoice:`, 140, y + 7);
  doc.text(invoiceNo, 195, y + 7, { align: "right" });
  
  doc.text(`Tanggal:`, 140, y + 12);
  doc.text(new Date().toLocaleDateString('id-ID'), 195, y + 12, { align: "right" });
  
  doc.text(`Status:`, 140, y + 17);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 195, y + 17, { align: "right" });

  return y + 30;
};

// Helper: Add Items Table
const addItemsTable = (doc, order, y) => {
  const tableData = [
    ["Merek Mobil", order.namaMobil || "-"],
    ["Plat Nomor", order.platNomor || "-"],
    ["Durasi Sewa", `${order.durasiHari || 1} Hari`],
    ["Tgl Mulai", order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID') : "-"],
    ["Tgl Selesai", order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString('id-ID') : "-"]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Deskripsi', 'Detail']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 100 }
    },
    margin: { left: 15, right: 15 }
  });

  return doc.lastAutoTable.finalY + 10;
};

// Helper: Add Payment Summary
const addPaymentSummary = (doc, order, dpAmount, remainingAmount, y, statusColor) => {
  const summaryX = 130;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.TEXT_GRAY);
  
  let currentY = y;
  
  const drawRow = (label, value, isTotal = false) => {
    if (isTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...statusColor);
      doc.setFillColor(...COLORS.LIGHT_GRAY);
      doc.rect(summaryX - 5, currentY - 5, 75, 10, 'F');
    } else {
      doc.setTextColor(...COLORS.TEXT_GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    
    doc.text(label, summaryX, currentY);
    doc.text(value, 195, currentY, { align: "right" });
    currentY += 8;
  };

  drawRow("Total Biaya Sewa:", formatIDR(order.perkiraanHarga));
  drawRow("Down Payment (50%):", formatIDR(dpAmount));
  drawRow("Sisa Pembayaran:", formatIDR(remainingAmount));
  currentY += 4;
  drawRow("TOTAL TERBAYAR:", formatIDR(dpAmount), true);

  return currentY + 15;
};

// Helper: Add Footer
const addFooter = (doc) => {
  const pageHeight = doc.internal.pageSize.height;
  
  // Signature Area
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text("Hormat Kami,", 15, pageHeight - 50);
  doc.text("Manager Operasional", 15, pageHeight - 45);
  
  doc.setDrawColor(...COLORS.BORDER);
  doc.line(15, pageHeight - 25, 60, pageHeight - 25);
  doc.text("CAKRA LIMA TUJUH", 15, pageHeight - 20);

  // Terms and Note
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_GRAY);
  doc.text("Syarat & Ketentuan:", 100, pageHeight - 50);
  doc.text("• Harap simpan invoice ini sebagai bukti reservasi yang sah.", 100, pageHeight - 45);
  doc.text("• Pengambilan unit wajib menunjukkan kartu identitas (KTP/SIM).", 100, pageHeight - 41);
  doc.text("• Pembatalan < 24 jam dikenakan biaya administrasi.", 100, pageHeight - 37);

  // Footer Blue Bar
  doc.setFillColor(...COLORS.DARK);
  doc.rect(0, pageHeight - 10, 210, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Terima kasih telah memilih layanan kami. Selamat berkendara dengan aman!", 105, pageHeight - 4, { align: "center" });
};

// Helper: PDF Output Handler
const openPdfInNewTab = (doc, filename) => {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    // Fallback if popup is blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      doc.save(filename);
    }
  } catch (error) {
    console.error("Error generating/opening PDF:", error);
    doc.save(filename); // Last resort fallback
  }
};

const InvoiceGenerator = {
  // Generate DP Invoice (50% payment)
  generateDPInvoice: (order, user) => {
    const doc = new jsPDF();
    const dpAmount = order.dpAmount || Math.ceil(order.perkiraanHarga * 0.5);
    const remainingAmount = order.perkiraanHarga - dpAmount;
    const invNo = `INV-DP-${order.id.slice(-8).toUpperCase()}`;

    addHeader(doc, "INVOICE DOWN PAYMENT");
    let y = addInfoGrid(doc, order, user, invNo, "PENDING DP (50%)", 70);
    y = addItemsTable(doc, order, y);
    addPaymentSummary(doc, order, dpAmount, remainingAmount, y, COLORS.PRIMARY);
    addFooter(doc);

    openPdfInNewTab(doc, `${invNo}.pdf`);
  },

  // Generate Full Payment Invoice
  generateFullInvoice: (order, user, penaltyAmount = 0, overtimeHours = 0) => {
    const doc = new jsPDF();
    const invNo = `INV-FULL-${order.id.slice(-8).toUpperCase()}`;
    const totalWithPenalty = (order.perkiraanHarga || 0) + penaltyAmount;

    addHeader(doc, "INVOICE PELUNASAN", COLORS.SUCCESS);
    let statusText = "LUNAS / FULLY PAID";
    if (penaltyAmount > 0) {
      statusText = "LUNAS (INC. PENALTY)";
    }
    
    let y = addInfoGrid(doc, order, user, invNo, statusText, 70);
    y = addItemsTable(doc, order, y);
    
    // Summary for Full Payment
    const summaryX = 130;
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.TEXT_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("Rincian Pembayaran:", summaryX, y);
    
    const dpAmount = order.dpAmount || Math.ceil(order.perkiraanHarga * 0.5);
    const totalSewa = order.perkiraanHarga || 0;
    const sisaBayar = totalSewa + penaltyAmount - dpAmount;

    doc.text("Total Biaya Sewa:", summaryX, y + 7);
    doc.text(formatIDR(totalSewa), 195, y + 7, { align: "right" });
    
    let currentY = y + 7;
    
    currentY += 7;
    doc.setTextColor(...COLORS.SUCCESS);
    doc.text("DP Terbayar:", summaryX, currentY);
    doc.text(`- ${formatIDR(dpAmount)}`, 195, currentY, { align: "right" });

    if (penaltyAmount > 0) {
      currentY += 7;
      doc.setTextColor(...COLORS.PRIMARY);
      doc.text(`Denda Keterlambatan (${overtimeHours}j):`, summaryX, currentY);
      doc.text(formatIDR(penaltyAmount), 195, currentY, { align: "right" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.PRIMARY);
    doc.setFillColor(...COLORS.LIGHT_GRAY);
    doc.rect(summaryX - 5, currentY + 5, 75, 12, 'F');
    doc.text("TOTAL AKHIR:", summaryX, currentY + 13);
    doc.text(formatIDR(sisaBayar), 195, currentY + 13, { align: "right" });

    // Paid Stamp Effect
    doc.setDrawColor(...COLORS.SUCCESS);
    doc.setLineWidth(1);
    doc.rect(140, currentY + 25, 40, 15);
    doc.setFontSize(14);
    doc.text("LUNAS", 160, currentY + 35, { align: "center" });

    addFooter(doc);
    openPdfInNewTab(doc, `${invNo}.pdf`);
  },

  // Generate Driver Invoice
  generateDriverInvoice: (order, user) => {
    const doc = new jsPDF();
    const invNo = `DRV-DP-${order.id.slice(-8).toUpperCase()}`;

    addHeader(doc, "ORDER FORM - DRIVER COPY", COLORS.INFO);
    let y = addInfoGrid(doc, order, user, invNo, "DP TERKONFIRMASI", 70);
    y = addItemsTable(doc, order, y);

    // Driver Specific Note
    doc.setFillColor(...COLORS.LIGHT_GRAY);
    doc.rect(15, y, 180, 25, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.INFO);
    doc.text("CATATAN DRIVER:", 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.DARK);
    doc.setFontSize(9);
    doc.text("• Pastikan dokumen SIM client valid & kendaraan telah dicek.", 20, y + 13);
    doc.text("• Hubungi client minimal 1 jam sebelum waktu penyerahan unit.", 20, y + 18);

    addFooter(doc);
    openPdfInNewTab(doc, `${invNo}.pdf`);
  }
};

export default InvoiceGenerator;
