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

  /* A document, not a screen: every colour is a token and the print rules
     below strip the card chrome so the sheet is ink-efficient. */
  const isDP = type === "dp";
  const statusBand = isDP
    ? "bg-c57-primary-container text-c57-on-primary"
    : "bg-c57-available-text text-c57-on-primary";
  const statusInk = isDP ? "text-c57-primary-container" : "text-c57-available-text";

  return (
    <div className="bg-c57-surface-container-lowest max-w-[800px] mx-auto shadow-c57-overlay rounded-c57-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
      {/* Header */}
      <div className="bg-c57-scrim text-c57-on-scrim px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="Cakra Lima Tujuh"
            className="h-14 w-14 rounded-c57-md object-cover bg-c57-surface-container-lowest p-1"
          />
          <div>
            <h1 className="font-display text-headline-sm tracking-wide">CAKRA LIMA TUJUH</h1>
            <p className="font-label-sm text-label-sm text-c57-on-scrim/50 uppercase">
              Premium Travel &amp; Tour Experience
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-label-sm text-label-sm text-c57-on-scrim/40 uppercase mb-1">Invoice</p>
          <p className="font-display text-headline-md text-c57-on-scrim">{invNo}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`px-8 py-3 font-label-md text-label-md uppercase text-center ${statusBand}`}
      >
        {statusLabel}
      </div>

      <div className="px-8 py-8">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="font-label-sm text-label-sm text-c57-on-surface-variant uppercase tracking-[0.2em] mb-3">
              Ditagihkan Kepada
            </p>
            <div className="space-y-1">
              <p className="font-semibold text-body-md text-c57-on-surface">
                {user?.nama || order?.namaClient || "-"}
              </p>
              <p className="text-body-sm text-c57-on-surface-variant">
                {user?.email || order?.email || "-"}
              </p>
              <p className="text-body-sm text-c57-on-surface-variant">
                {user?.nomorTelepon || order?.telepon || "-"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-label-sm text-label-sm text-c57-on-surface-variant uppercase tracking-[0.2em] mb-3">
              Informasi Invoice
            </p>
            <div className="space-y-1 text-body-sm">
              <div className="flex justify-between">
                <span className="text-c57-outline">No. Invoice</span>
                <span className="font-semibold text-c57-on-surface">{invNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-c57-outline">Tanggal</span>
                <span className="text-c57-on-surface">{formatDate(new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-c57-outline">Status</span>
                <span className={`font-semibold ${statusInk}`}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="border border-c57-surface-variant rounded-c57-md overflow-hidden mb-8">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-c57-scrim text-c57-on-scrim">
                <th className="text-left px-6 py-3 font-label-sm text-label-sm uppercase">Deskripsi</th>
                <th className="text-left px-6 py-3 font-label-sm text-label-sm uppercase">Detail</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Layanan",          order?.jenisLayanan || "Rental Kendaraan"],
                ["Kendaraan",        order?.namaMobil || "-"],
                ["Plat Nomor",       order?.platNomor || "-"],
                ["Durasi Sewa",      `${order?.durasiHari || 1} Hari`],
                ["Tanggal Mulai",    formatDate(order?.tanggalMulai)],
                ["Tanggal Selesai",  formatDate(order?.tanggalSelesai)],
                ["Metode Pembayaran", order?.metodePembayaran || "-"],
              ].map(([label, value], i, rows) => (
                <tr
                  key={label}
                  className={[
                    i < rows.length - 1 ? "border-b border-c57-surface-variant" : "",
                    i % 2 === 1 ? "bg-c57-surface" : "",
                  ].join(" ")}
                >
                  <td className="px-6 py-3 font-semibold text-c57-on-surface">{label}</td>
                  <td className="px-6 py-3 text-c57-on-surface-variant">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-72 border border-c57-surface-variant rounded-c57-md overflow-hidden">
            <div className="bg-c57-error-container/50 px-6 py-3">
              <p className="font-label-sm text-label-sm text-c57-primary uppercase">
                Rincian Pembayaran
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex justify-between text-body-sm">
                <span className="text-c57-outline">Total Biaya Sewa</span>
                <span className="text-c57-on-surface">{formatIDR(order?.perkiraanHarga)}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-c57-outline">Down Payment (50%)</span>
                <span className="text-c57-primary-container">{formatIDR(dpAmount)}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-c57-outline">Sisa Pembayaran</span>
                <span className="text-c57-on-surface">{formatIDR(remainingAmount)}</span>
              </div>
              <div className="border-t border-c57-surface-variant pt-3 flex justify-between">
                <span className="font-label-md text-label-md text-c57-on-surface uppercase">
                  Total Terbayar
                </span>
                <span className="font-display text-headline-sm text-c57-primary-container">
                  {formatIDR(dpAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Signature */}
        <div className="grid grid-cols-2 gap-8 border-t border-c57-surface-variant pt-8">
          <div>
            <p className="font-label-sm text-label-sm text-c57-on-surface-variant uppercase tracking-[0.2em] mb-3">
              Syarat &amp; Ketentuan
            </p>
            <ul className="text-body-sm text-c57-outline space-y-1.5">
              <li>&#8226; Simpan invoice ini sebagai bukti reservasi yang sah.</li>
              <li>&#8226; Pengambilan unit wajib menunjukkan KTP/SIM.</li>
              <li>&#8226; Pembatalan &lt; 24 jam dikenakan biaya administrasi.</li>
            </ul>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-label-sm text-c57-on-surface-variant uppercase tracking-[0.2em] mb-3">
              Hormat Kami,
            </p>
            <div className="inline-block text-left mt-8">
              <div className="w-32 border-b border-c57-on-surface/30 mb-2" />
              <p className="font-semibold text-body-sm text-c57-on-surface">Manager Operasional</p>
              <p className="font-label-sm text-label-sm text-c57-outline uppercase">Cakra Lima Tujuh</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-c57-scrim text-c57-on-scrim/40 text-center font-label-sm text-label-sm py-3 uppercase">
        Terima kasih telah memilih Cakra Lima Tujuh
      </div>
    </div>
  );
}
