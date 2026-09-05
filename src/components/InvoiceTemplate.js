import logo from "../assets/logo.png";

const formatIDR = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (date) => {
  if (!date) return "-";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function InvoiceTemplate({ order, user, type = "dp" }) {
  const invNo =
    type === "dp"
      ? `INV-DP-${order?.id?.slice(-8).toUpperCase()}`
      : `INV-FULL-${order?.id?.slice(-8).toUpperCase()}`;

  const dpAmount = order?.dpAmount || Math.ceil((order?.perkiraanHarga || 0) * 0.5);
  const remainingAmount = (order?.perkiraanHarga || 0) - dpAmount;
  const statusLabel = type === "dp" ? "DOWN PAYMENT (50%)" : "PELUNASAN";
  const statusColor = type === "dp" ? "#810100" : "#16a34a";

  return (
    <div className="bg-white max-w-[800px] mx-auto shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
      {/* Header */}
      <div className="bg-[#1B1717] text-white px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Cakra Lima Tujuh" className="h-14 w-14 rounded-xl object-cover bg-white p-1" />
          <div>
            <h1 className="text-xl font-black tracking-wide">CAKRA LIMA TUJUH</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Premium Travel &amp; Tour Experience</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Invoice</p>
          <p className="text-2xl font-black text-[#EDEBDD]">{invNo}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className="px-8 py-3 text-white text-xs font-black uppercase tracking-widest text-center"
        style={{ backgroundColor: statusColor }}
      >
        {statusLabel}
      </div>

      <div className="px-8 py-8">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Customer Info */}
          <div>
            <p className="text-[10px] font-black text-[#3D3636] uppercase tracking-[0.2em] mb-3">Ditagihkan Kepada</p>
            <div className="space-y-1">
              <p className="font-bold text-[#1B1717]">{user?.nama || order?.namaClient || "-"}</p>
              <p className="text-sm text-[#3D3636]">{user?.email || order?.email || "-"}</p>
              <p className="text-sm text-[#3D3636]">{user?.nomorTelepon || order?.telepon || "-"}</p>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="text-right">
            <p className="text-[10px] font-black text-[#3D3636] uppercase tracking-[0.2em] mb-3">Informasi Invoice</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#3D3636]/60">No. Invoice</span>
                <span className="font-bold text-[#1B1717]">{invNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3D3636]/60">Tanggal</span>
                <span className="text-[#1B1717]">{formatDate(new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3D3636]/60">Status</span>
                <span className="font-bold" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="border border-[#EDEBDD]/60 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B1717] text-white">
                <th className="text-left px-6 py-3 font-black uppercase tracking-wider text-[10px]">Deskripsi</th>
                <th className="text-left px-6 py-3 font-black uppercase tracking-wider text-[10px]">Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#EDEBDD]/40">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Layanan</td>
                <td className="px-6 py-3 text-[#3D3636]">{order?.jenisLayanan || "Rental Kendaraan"}</td>
              </tr>
              <tr className="border-b border-[#EDEBDD]/40 bg-[#FAFAF6]">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Kendaraan</td>
                <td className="px-6 py-3 text-[#3D3636]">{order?.namaMobil || "-"}</td>
              </tr>
              <tr className="border-b border-[#EDEBDD]/40">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Plat Nomor</td>
                <td className="px-6 py-3 text-[#3D3636]">{order?.platNomor || "-"}</td>
              </tr>
              <tr className="border-b border-[#EDEBDD]/40 bg-[#FAFAF6]">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Durasi Sewa</td>
                <td className="px-6 py-3 text-[#3D3636]">{order?.durasiHari || 1} Hari</td>
              </tr>
              <tr className="border-b border-[#EDEBDD]/40">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Tanggal Mulai</td>
                <td className="px-6 py-3 text-[#3D3636]">{formatDate(order?.tanggalMulai)}</td>
              </tr>
              <tr className="border-b border-[#EDEBDD]/40 bg-[#FAFAF6]">
                <td className="px-6 py-3 font-bold text-[#1B1717]">Tanggal Selesai</td>
                <td className="px-6 py-3 text-[#3D3636]">{formatDate(order?.tanggalSelesai)}</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-bold text-[#1B1717]">Metode Pembayaran</td>
                <td className="px-6 py-3 text-[#3D3636]">{order?.metodePembayaran || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-72 border border-[#EDEBDD]/60 rounded-xl overflow-hidden">
            <div className="bg-[#F5E6E6]/50 px-6 py-3">
              <p className="text-[10px] font-black text-[#810100] uppercase tracking-widest">Rincian Pembayaran</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#3D3636]/60">Total Biaya Sewa</span>
                <span className="text-[#1B1717]">{formatIDR(order?.perkiraanHarga)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#3D3636]/60">Down Payment (50%)</span>
                <span className="text-[#810100]">{formatIDR(dpAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#3D3636]/60">Sisa Pembayaran</span>
                <span className="text-[#1B1717]">{formatIDR(remainingAmount)}</span>
              </div>
              <div className="border-t border-[#EDEBDD]/60 pt-3 flex justify-between">
                <span className="font-black text-[#1B1717]">TOTAL TERBAYAR</span>
                <span className="font-black text-[#810100] text-lg">{formatIDR(dpAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Signature */}
        <div className="grid grid-cols-2 gap-8 border-t border-[#EDEBDD]/60 pt-8">
          <div>
            <p className="text-[10px] font-black text-[#3D3636] uppercase tracking-[0.2em] mb-3">Syarat &amp; Ketentuan</p>
            <ul className="text-xs text-[#3D3636]/60 space-y-1.5">
              <li>&#8226; Simpan invoice ini sebagai bukti reservasi yang sah.</li>
              <li>&#8226; Pengambilan unit wajib menunjukkan KTP/SIM.</li>
              <li>&#8226; Pembatalan &lt; 24 jam dikenakan biaya administrasi.</li>
            </ul>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#3D3636] uppercase tracking-[0.2em] mb-3">Hormat Kami,</p>
            <div className="inline-block text-left mt-8">
              <div className="w-32 border-b border-[#1B1717]/30 mb-2" />
              <p className="font-bold text-[#1B1717] text-sm">Manager Operasional</p>
              <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest">Cakra Lima Tujuh</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#1B1717] text-white/40 text-center text-[10px] py-3 uppercase tracking-widest">
        Terima kasih telah memilih Cakra Lima Tujuh
      </div>
    </div>
  );
}
