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

export default function KwitansiTemplate({ payment }) {
  const kwitansiNo = payment?.noKwitansi || `KW-${String(payment?.id || "").slice(-8).toUpperCase()}`;
  const statusLabel = payment?.status === "lunas" ? "LUNAS" : payment?.status?.toUpperCase() || "-";
  const statusColor = payment?.status === "lunas" ? "#16a34a" : "#810100";

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
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Kwitansi</p>
          <p className="text-2xl font-black text-[#EDEBDD]">{kwitansiNo}</p>
        </div>
      </div>

      {/* Title Bar */}
      <div className="bg-[#EDEBDD]/60 px-8 py-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.25em] mb-1">Bukti Pembayaran Resmi</p>
          <h2 className="text-2xl font-black text-[#1B1717]">KWITANSI PEMBAYARAN</h2>
        </div>
        <div
          className="px-6 py-2 rounded-lg text-white text-sm font-black uppercase tracking-widest"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Company Identity */}
        <div className="border border-[#EDEBDD]/60 rounded-xl p-6 mb-8">
          <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.2em] mb-3">Identitas Cakra 57</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-[#1B1717]">Cakra Lima Tujuh</p>
              <p className="text-[#3D3636]/70 text-xs mt-1">Premium Travel &amp; Tour Experience</p>
            </div>
            <div className="space-y-1 text-xs text-[#3D3636]/70">
              <p>Lembah Harapan Blok AA-57, Lidah Wetan</p>
              <p>Kec. Lakarsantri, Surabaya</p>
              <p>+62 878-5966-0053 &#8226; cakralimatujuh@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-[#FAFAF6] border border-[#EDEBDD]/60 rounded-xl p-6 mb-8">
          <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.2em] mb-4">Detail Pembayaran</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[
                { label: "Nama Customer", value: payment?.namaCustomer || "-" },
                { label: "Nomor Kwitansi", value: kwitansiNo },
                { label: "Tanggal Pembayaran", value: formatDate(payment?.tanggalPembayaran || payment?.createdAt || new Date()) },
              ].map((row, i) => (
                <div key={i}>
                  <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest mb-0.5">{row.label}</p>
                  <p className="font-bold text-[#1B1717] text-sm">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                { label: "Keterangan", value: payment?.keterangan || payment?.jenisLayanan || "-" },
                { label: "Metode Pembayaran", value: payment?.metodePembayaran || "-" },
                { label: "Status", value: statusLabel },
              ].map((row, i) => (
                <div key={i}>
                  <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest mb-0.5">{row.label}</p>
                  <p className="font-bold text-[#1B1717] text-sm" style={row.label === "Status" ? { color: statusColor } : undefined}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-6 border-t border-[#EDEBDD]/60 pt-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest mb-1">Terbilang</p>
              <p className="text-[#3D3636]/80 italic text-sm max-w-xs">
                Terima kasih atas pembayaran Anda sebesar
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest mb-1">Nominal Pembayaran</p>
              <p className="font-black text-[#810100] text-2xl">{formatIDR(payment?.nominal)}</p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end">
          <div className="text-center w-56">
            <p className="text-[10px] text-[#3D3636]/60 uppercase tracking-widest mb-1">
              {formatDate(payment?.tanggalPembayaran || payment?.createdAt || new Date())}
            </p>
            <p className="text-[10px] text-[#3D3636]/60 uppercase tracking-widest mb-10">Hormat Kami,</p>
            <div className="w-40 border-b border-[#1B1717]/30 mx-auto mb-2" />
            <p className="font-bold text-[#1B1717] text-sm">Manager Operasional</p>
            <p className="text-[10px] text-[#3D3636]/50 uppercase tracking-widest">Cakra Lima Tujuh</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#1B1717] text-white/40 text-center text-[10px] py-3 uppercase tracking-widest">
        Kwitansi ini merupakan bukti pembayaran resmi Cakra Lima Tujuh
      </div>
    </div>
  );
}
