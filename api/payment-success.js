import axios from "axios";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const order = req.body; // data pesanan

  try {
    // === Validasi ===
    if (!order.email) {
      return res.status(400).json({ error: "Email client wajib diisi" });
    }

    // === 1. Kirim data ke Google Sheet ===
    await axios.post(process.env.SHEET_WEBHOOK_URL, order);

    // === 2. Format Rupiah helper ===
    const formatRupiah = (num) =>
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(num);

    // === 3. Generate Invoice PDF ===
    const generateInvoice = (order) => {
      return new Promise((resolve) => {
        const doc = new PDFDocument();
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        doc.fontSize(18).text("INVOICE RENTAL MOBIL", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Nama Client   : ${order.namaClient}`);
        doc.text(`Nomor Telepon : ${order.telepon}`);
        doc.text(`Mobil         : ${order.namaMobil}`);
        doc.text(`Tipe Sewa     : ${order.tipeSewa}`);
        doc.text(`Tanggal Mulai : ${order.tanggalMulai}`);
        doc.text(`Tanggal Selesai: ${order.tanggalSelesai}`);
        doc.moveDown();
        doc.text(`Harga per Hari : ${formatRupiah(order.hargaPerHari)}`);
        doc.text(`Durasi         : ${order.durasiHari || 1} hari`);
        doc.text(`Total Biaya    : ${formatRupiah(order.perkiraanHarga)}`);
        doc.text(`DP 50%         : ${formatRupiah(order.dpAmount)}`);
        doc.text(`Status         : ${order.status}`);
        doc.end();
      });
    };

    const pdfBuffer = await generateInvoice(order);

    // === 4. Kirim Invoice via Email ===
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Rental Mobil" <${process.env.EMAIL_USER}>`,
      to: order.email,
      subject: "Invoice Rental Mobil",
      text: "Berikut invoice pemesanan rental mobil Anda.",
      attachments: [
        { filename: `invoice-${order.namaClient}-${Date.now()}.pdf`, content: pdfBuffer },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
