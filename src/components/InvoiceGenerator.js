import React from 'react';
import jsPDF from 'jspdf';

const InvoiceGenerator = {
  // Generate DP Invoice (50% payment)
  generateDPInvoice: (order, user) => {
    const doc = new jsPDF();
    const dpAmount = Math.ceil(order.perkiraanHarga * 0.5);
    const remainingAmount = order.perkiraanHarga - dpAmount;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text("INVOICE DOWN PAYMENT (DP)", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Cakra Lima Tujuh", 105, 30, { align: "center" });
    doc.text("Lembah Harapan, Blok AA-57, Lidah Wetan", 105, 37, { align: "center" });
    doc.text("Kec. Lakarsantri, Surabaya", 105, 44, { align: "center" });
    doc.text("Email: limatujuhcakra@gmail.com", 105, 51, { align: "center" });

    // Invoice info
    doc.setFontSize(12);
    doc.text(`Nomor Invoice: INV-DP-${order.id.slice(-8).toUpperCase()}`, 15, 65);
    doc.text(`Tanggal Invoice: ${new Date().toLocaleDateString('id-ID')}`, 15, 72);
    doc.text(`Status: DOWN PAYMENT (50%)`, 15, 79);

    // Client info
    doc.setFontSize(14);
    doc.text("Kepada Yth.,", 15, 95);
    doc.setFontSize(12);
    doc.text(`Nama       : ${user?.nama || order.namaClient || "-"}`, 15, 105);
    doc.text(`Email      : ${user?.email || order.email || "-"}`, 15, 112);
    doc.text(`No. Telepon: ${user?.nomorTelepon || order.telepon || "-"}`, 15, 119);

    // Order details
    doc.setFontSize(14);
    doc.text("Detail Rental Mobil", 15, 135);
    doc.setFontSize(12);

    // Table headers
    doc.setFillColor(220, 220, 220);
    doc.rect(15, 145, 180, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, 151);
    doc.text("Detail", 105, 151);
    doc.text("Jumlah", 170, 151);

    let y = 159;
    const addRow = (desc, detail, amount) => {
      doc.rect(15, y, 90, 8);
      doc.rect(105, y, 45, 8);
      doc.rect(150, y, 45, 8);
      doc.text(desc, 20, y + 5);
      doc.text(detail, 105, y + 5);
      doc.text(amount, 170, y + 5);
      y += 8;
    };

    addRow("Merek Mobil", order.namaMobil || "-", "");
    addRow("Plat Nomor", order.platNomor || "-", "");
    addRow("Tanggal Sewa", order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID') : "-", "");
    addRow("Tanggal Kembali", order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString('id-ID') : "-", "");
    addRow("Lama Sewa", `${order.durasiHari || 1} Hari`, "");
    addRow("Harga Sewa per Hari", `Rp ${order.hargaPerhari?.toLocaleString('id-ID') || "0"}`, "");

    // Payment details
    y += 10;
    doc.setFontSize(14);
    doc.text("Rincian Pembayaran", 15, y);
    doc.setFontSize(12);

    y += 10;
    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 135, 8, "F");
    doc.rect(150, y, 45, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, y + 5);
    doc.text("Jumlah", 155, y + 5);
    y += 8;

    addRow("Total Biaya Sewa", `Rp ${order.perkiraanHarga?.toLocaleString('id-ID')}`, "");
    addRow("Down Payment (50%)", `Rp ${dpAmount.toLocaleString('id-ID')}`, "");
    addRow("Sisa Pembayaran", `Rp ${remainingAmount.toLocaleString('id-ID')}`, "");

    // Total DP
    y += 5;
    doc.setFillColor(255, 193, 7); // Yellow background
    doc.rect(15, y, 135, 12, "F");
    doc.rect(150, y, 45, 12, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Total DP yang Harus Dibayar", 20, y + 8);
    doc.text(`Rp ${dpAmount.toLocaleString('id-ID')}`, 155, y + 8);

    // Notes
    y += 25;
    doc.setFontSize(12);
    doc.text("Catatan:", 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.text("• Down Payment (DP) sebesar 50% dari total biaya sewa.", 20, y);
    y += 5;
    doc.text("• Sisa pembayaran akan dibayarkan setelah rental selesai.", 20, y);
    y += 5;
    doc.text("• DP tidak dapat dikembalikan jika pembatalan dilakukan.", 20, y);
    y += 5;
    doc.text("• Invoice final akan diberikan setelah pembayaran selesai.", 20, y);

    // Footer
    y += 15;
    doc.setFontSize(12);
    doc.text("Hormat kami,", 15, y);
    y += 15;
    doc.text("Cakra Lima Tujuh", 15, y);
    doc.text("Manager Operasional", 15, y + 7);

    // Open in new tab
    const pdfData = doc.output('dataurlnewwindow');
  },

  // Generate Full Payment Invoice
  generateFullInvoice: (order, user) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94); // Green color
    doc.text("INVOICE PEMBAYARAN PENUH", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Cakra Lima Tujuh", 105, 30, { align: "center" });
    doc.text("Lembah Harapan, Blok AA-57, Lidah Wetan", 105, 37, { align: "center" });
    doc.text("Kec. Lakarsantri, Surabaya", 105, 44, { align: "center" });
    doc.text("Email: limatujuhcakra@gmail.com", 105, 51, { align: "center" });

    // Invoice info
    doc.setFontSize(12);
    doc.text(`Nomor Invoice: INV-FULL-${order.id.slice(-8).toUpperCase()}`, 15, 65);
    doc.text(`Tanggal Invoice: ${new Date().toLocaleDateString('id-ID')}`, 15, 72);
    doc.text(`Status: PEMBAYARAN LENGKAP`, 15, 79);

    // Client info
    doc.setFontSize(14);
    doc.text("Kepada Yth.,", 15, 95);
    doc.setFontSize(12);
    doc.text(`Nama       : ${user?.nama || order.namaClient || "-"}`, 15, 105);
    doc.text(`Email      : ${user?.email || order.email || "-"}`, 15, 112);
    doc.text(`No. Telepon: ${user?.nomorTelepon || order.telepon || "-"}`, 15, 119);

    // Order details
    doc.setFontSize(14);
    doc.text("Detail Rental Mobil", 15, 135);
    doc.setFontSize(12);

    // Table headers
    doc.setFillColor(220, 220, 220);
    doc.rect(15, 145, 180, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, 151);
    doc.text("Detail", 105, 151);
    doc.text("Jumlah", 170, 151);

    let y = 159;
    const addRow = (desc, detail, amount) => {
      doc.rect(15, y, 90, 8);
      doc.rect(105, y, 45, 8);
      doc.rect(150, y, 45, 8);
      doc.text(desc, 20, y + 5);
      doc.text(detail, 105, y + 5);
      doc.text(amount, 170, y + 5);
      y += 8;
    };

    addRow("Merek Mobil", order.namaMobil || "-", "");
    addRow("Plat Nomor", order.platNomor || "-", "");
    addRow("Tanggal Sewa", order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID') : "-", "");
    addRow("Tanggal Kembali", order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString('id-ID') : "-", "");
    addRow("Lama Sewa", `${order.durasiHari || 1} Hari`, "");
    addRow("Harga Sewa per Hari", `Rp ${order.hargaPerhari?.toLocaleString('id-ID') || "0"}`, "");

    // Payment details
    y += 10;
    doc.setFontSize(14);
    doc.text("Rincian Pembayaran", 15, y);
    doc.setFontSize(12);

    y += 10;
    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 135, 8, "F");
    doc.rect(150, y, 45, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, y + 5);
    doc.text("Jumlah", 155, y + 5);
    y += 8;

    addRow("Total Biaya Sewa", `Rp ${order.perkiraanHarga?.toLocaleString('id-ID')}`, "");
    addRow("Down Payment (50%)", `Rp ${Math.ceil(order.perkiraanHarga * 0.5).toLocaleString('id-ID')}`, "");
    addRow("Sisa Pembayaran", `Rp ${(order.perkiraanHarga - Math.ceil(order.perkiraanHarga * 0.5)).toLocaleString('id-ID')}`, "");

    // Total payment
    y += 5;
    doc.setFillColor(34, 197, 94); // Green background
    doc.rect(15, y, 135, 12, "F");
    doc.rect(150, y, 45, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Total yang Telah Dibayar", 20, y + 8);
    doc.text(`Rp ${order.perkiraanHarga?.toLocaleString('id-ID')}`, 155, y + 8);

    // Payment status
    y += 20;
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.text("✓ PEMBAYARAN LENGKAP - TERIMA KASIH", 15, y);

    // Notes
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Catatan:", 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.text("• Pembayaran telah lunas dan rental telah selesai.", 20, y);
    y += 5;
    doc.text("• Terima kasih telah menggunakan layanan rental mobil kami.", 20, y);
    y += 5;
    doc.text("• Jangan ragu untuk menghubungi kami jika ada pertanyaan.", 20, y);

    // Footer
    y += 15;
    doc.setFontSize(12);
    doc.text("Hormat kami,", 15, y);
    y += 15;
    doc.text("Cakra Lima Tujuh", 15, y);
    doc.text("Manager Operasional", 15, y + 7);

    // Open in new tab
    const pdfData = doc.output('dataurlnewwindow');
  },

  // Generate Driver Invoice (for drivers to print when payment is confirmed)
  generateDriverInvoice: (order, user) => {
    const doc = new jsPDF();
    const dpAmount = Math.ceil(order.perkiraanHarga * 0.5);

    // Header
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text("INVOICE DRIVER - DOWN PAYMENT", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Cakra Lima Tujuh", 105, 30, { align: "center" });
    doc.text("Lembah Harapan, Blok AA-57, Lidah Wetan", 105, 37, { align: "center" });
    doc.text("Kec. Lakarsantri, Surabaya", 105, 44, { align: "center" });

    // Invoice info
    doc.setFontSize(11);
    doc.text(`Nomor Invoice: DRV-DP-${order.id.slice(-8).toUpperCase()}`, 15, 60);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 15, 67);
    doc.text(`Status: PEMBAYARAN TERKONFIRMASI (50% DP)`, 15, 74);

    // Client info
    doc.setFontSize(13);
    doc.text("Informasi Client:", 15, 90);
    doc.setFontSize(11);
    doc.text(`Nama: ${user?.nama || order.namaClient || "-"}`, 15, 100);
    doc.text(`Email: ${user?.email || order.email || "-"}`, 15, 107);
    doc.text(`Telepon: ${user?.nomorTelepon || order.telepon || "-"}`, 15, 114);

    // Order details
    doc.setFontSize(13);
    doc.text("Detail Rental:", 15, 130);
    doc.setFontSize(11);

    let y = 140;
    const addRow = (label, value) => {
      doc.text(`${label}: ${value}`, 15, y);
      y += 7;
    };

    addRow("Mobil", order.namaMobil || "-");
    addRow("Plat Nomor", order.platNomor || "-");
    addRow("Tanggal Sewa", order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID') : "-");
    addRow("Tanggal Kembali", order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString('id-ID') : "-");
    addRow("Lama Sewa", `${order.durasiHari || 1} Hari`);
    addRow("Tipe Sewa", order.rentalType || "Lepas Kunci");

    // Payment info
    y += 10;
    doc.setFontSize(13);
    doc.text("Informasi Pembayaran:", 15, y);
    doc.setFontSize(11);
    y += 10;

    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 90, 8, "F");
    doc.rect(105, y, 90, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, y + 5);
    doc.text("Jumlah", 150, y + 5);
    y += 8;

    doc.rect(15, y, 90, 8);
    doc.rect(105, y, 90, 8);
    doc.text("Total Biaya", 20, y + 5);
    doc.text(`Rp ${order.perkiraanHarga?.toLocaleString('id-ID')}`, 150, y + 5);
    y += 8;

    doc.rect(15, y, 90, 8);
    doc.rect(105, y, 90, 8);
    doc.text("Down Payment (50%)", 20, y + 5);
    doc.text(`Rp ${dpAmount.toLocaleString('id-ID')}`, 150, y + 5);
    y += 8;

    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(15, y, 90, 10, "F");
    doc.rect(105, y, 90, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("Status Pembayaran", 20, y + 6);
    doc.text("TERKONFIRMASI", 150, y + 6);

    // Notes for driver
    y += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Catatan untuk Driver:", 15, y);
    y += 6;
    doc.text("• DP 50% telah dikonfirmasi oleh admin", 20, y);
    y += 5;
    doc.text("• Client siap untuk melakukan rental", 20, y);
    y += 5;
    doc.text("• Pastikan mobil dalam kondisi baik", 20, y);
    y += 5;
    doc.text("• Hubungi client untuk koordinasi pengambilan", 20, y);

    // Footer
    y += 15;
    doc.setFontSize(11);
    doc.text("Dicetak oleh Driver", 15, y);
    doc.text(`Tanggal: ${new Date().toLocaleString('id-ID')}`, 15, y + 6);

    // Open in new tab
    const pdfData = doc.output('dataurlnewwindow');
  }
};

export default InvoiceGenerator;
