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

  const isLunas = payment?.status === "lunas";
  const statusBand = isLunas
    ? "bg-c57-available-text text-c57-on-primary"
    : "bg-c57-primary-container text-c57-on-primary";
  const statusInk = isLunas ? "text-c57-available-text" : "text-c57-primary-container";

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
          <p className="font-label-sm text-label-sm text-c57-on-scrim/40 uppercase mb-1">Kwitansi</p>
          <p className="font-display text-headline-md text-c57-on-scrim">{kwitansiNo}</p>
        </div>
      </div>

      {/* Title Bar */}
      <div className="bg-c57-surface-container px-8 py-6 flex items-center justify-between">
        <div>
          <p className="font-label-sm text-label-sm text-c57-primary uppercase tracking-[0.25em] mb-1">
            Bukti Pembayaran Resmi
          </p>
          <h2 className="font-display text-headline-md text-c57-on-surface">
            KWITANSI PEMBAYARAN
          </h2>
        </div>
        <div className={`px-6 py-2 rounded-c57-sm font-label-md text-label-md uppercase ${statusBand}`}>
          {statusLabel}
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Company Identity */}
        <div className="border border-c57-surface-variant rounded-c57-md p-6 mb-8">
          <p className="font-label-sm text-label-sm text-c57-primary uppercase tracking-[0.2em] mb-3">
            Identitas Cakra 57
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
            <div>
              <p className="font-semibold text-c57-on-surface">Cakra Lima Tujuh</p>
              <p className="font-label-sm text-label-sm text-c57-on-surface-variant mt-1">
                Premium Travel &amp; Tour Experience
              </p>
            </div>
            <div className="space-y-1 font-label-sm text-label-sm text-c57-on-surface-variant">
              <p>Lembah Harapan Blok AA-57, Lidah Wetan</p>
              <p>Kec. Lakarsantri, Surabaya</p>
              <p>+62 878-5966-0053 &#8226; cakralimatujuh@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-c57-surface border border-c57-surface-variant rounded-c57-md p-6 mb-8">
          <p className="font-label-sm text-label-sm text-c57-primary uppercase tracking-[0.2em] mb-4">
            Detail Pembayaran
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[
                { label: "Nama Customer",       value: payment?.namaCustomer || "-" },
                { label: "Nomor Kwitansi",      value: kwitansiNo },
                { label: "Tanggal Pembayaran",  value: formatDate(payment?.tanggalPembayaran || payment?.createdAt || new Date()) },
              ].map((row) => (
                <div key={row.label}>
                  <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-0.5">
                    {row.label}
                  </p>
                  <p className="font-semibold text-body-sm text-c57-on-surface">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                { label: "Keterangan",         value: payment?.keterangan || payment?.jenisLayanan || "-" },
                { label: "Metode Pembayaran",  value: payment?.metodePembayaran || "-" },
                { label: "Status",             value: statusLabel, ink: statusInk },
              ].map((row) => (
                <div key={row.label}>
                  <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-0.5">
                    {row.label}
                  </p>
                  <p
                    className={`font-semibold text-body-sm ${
                      row.ink || "text-c57-on-surface"
                    }`}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-6 border-t border-c57-surface-variant pt-6 flex items-end justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-1">Terbilang</p>
              <p className="font-display italic text-body-md text-c57-on-surface-variant max-w-xs">
                Terima kasih atas pembayaran Anda sebesar
              </p>
            </div>
            <div className="text-right">
              <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-1">
                Nominal Pembayaran
              </p>
              <p className="font-display text-headline-md text-c57-primary-container">
                {formatIDR(payment?.nominal)}
              </p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end">
          <div className="text-center w-56">
            <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-1">
              {formatDate(payment?.tanggalPembayaran || payment?.createdAt || new Date())}
            </p>
            <p className="font-label-sm text-label-sm text-c57-outline uppercase mb-10">
              Hormat Kami,
            </p>
            <div className="w-40 border-b border-c57-on-surface/30 mx-auto mb-2" />
            <p className="font-semibold text-body-sm text-c57-on-surface">Manager Operasional</p>
            <p className="font-label-sm text-label-sm text-c57-outline uppercase">Cakra Lima Tujuh</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-c57-scrim text-c57-on-scrim/40 text-center font-label-sm text-label-sm py-3 uppercase">
        Kwitansi ini merupakan bukti pembayaran resmi Cakra Lima Tujuh
      </div>
    </div>
  );
}
