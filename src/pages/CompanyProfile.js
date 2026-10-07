import logo from "../assets/logo.png";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import SectionHeading from "../components/ui/SectionHeading";

const VALUES = [
  "Standar keamanan dan kenyamanan di setiap perjalanan",
  "Itinerary yang dirancang dengan teliti dan personal",
  "Tim profesional yang ramah dan berpengalaman",
  "Kepuasan dan kepercayaan sebagai prioritas utama",
  "Pengalaman travel yang melampaui ekspektasi",
];

const SERVICES = [
  { icon: "map", title: "Private Trip", desc: "Perjalanan eksklusif yang dirancang khusus untuk Anda dan rombongan." },
  { icon: "groups", title: "Open Trip", desc: "Gabung bersama traveler lain dan nikmati harga terjangkau." },
  { icon: "edit_note", title: "Custom Trip", desc: "Rancang perjalanan impian sesuai keinginan Anda sepenuhnya." },
  { icon: "apartment", title: "Corporate Trip", desc: "Solusi perjalanan bisnis, gathering, dan corporate event." },
  { icon: "explore", title: "Tour Guide", desc: "Pemandu wisata berpengalaman di seluruh destinasi." },
  { icon: "star", title: "Luxury Experience", desc: "Perjalanan premium dengan layanan first-class." },
];

const DESTINATIONS = [
  { label: "Jawa", desc: "Bromo, Yogyakarta, Dieng" },
  { label: "Bali", desc: "Ubud, Nusa Penida, Lombok" },
  { label: "Indonesia", desc: "Labuan Bajo, Raja Ampat" },
  { label: "ASEAN", desc: "Singapore, Malaysia, Thailand" },
];

const STANDARDS = [
  "Konsultasi perjalanan personal sebelum booking",
  "Itinerary detail dan transparan",
  "Driver & guide profesional yang terlatih",
  "Kendaraan bersih, nyaman, dan terawat",
  "Dukungan 24/7 selama perjalanan berlangsung",
];

const CONTACTS = [
  { icon: "chat", label: "WhatsApp", value: "+62 878-5966-0053", href: "https://wa.me/6287859660053" },
  { icon: "photo_camera", label: "Instagram", value: "@cakralimatujuhtrans", href: "https://instagram.com/cakralimatujuhtrans" },
  { icon: "location_on", label: "Office Location", value: "Lidah Wetan, Lakarsantri, Surabaya", href: "https://www.google.com/maps/search/?api=1&query=Lidah+Wetan+Lakarsantri+Surabaya" },
];

const CREDENTIALS = [
  { icon: "explore", label: "Travel Expert", sub: "Pengalaman Bertahun-Tahun" },
  { icon: "verified_user", label: "Aman & Nyaman", sub: "Standar Premium" },
  { icon: "star", label: "Review Bintang 5", sub: "Kepuasan Pelanggan" },
];

export default function CompanyProfile() {
  return (
    <div className="min-h-screen bg-c57-surface pt-32 pb-space-xl">
      <div className="mx-auto w-full max-w-6xl space-y-24 px-gutter-mobile sm:px-gutter">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center animate-fadeInUp">
          <img
            src={logo}
            alt="Logo Cakra Lima Tujuh"
            className="mb-space-lg h-28 w-28 rounded-full border-4 border-c57-surface-container-lowest object-cover shadow-c57-card-hover md:h-36 md:w-36"
          />
          <h1 className="font-headline-lg text-headline-lg-mobile text-c57-on-surface md:text-headline-lg">
            Cakra Lima Tujuh
          </h1>
          <p className="mt-space-sm flex items-center gap-space-md font-label-sm uppercase tracking-[0.28em] text-c57-primary">
            <span className="accent-line" aria-hidden="true" />
            Premium Travel Agen
            <span className="accent-line" aria-hidden="true" />
          </p>
          <p className="mt-space-md max-w-2xl text-body-lg text-c57-on-surface-variant font-light leading-relaxed">
            Mewujudkan perjalanan impian Anda bersama travel agen terpercaya — layanan premium,
            personal, dan penuh pengalaman berharga.
          </p>
        </header>

        {/* ── Mission + About ──────────────────────────────────── */}
        <section className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-2">
          <Card variant="scrim" className="relative overflow-hidden p-10 md:p-14">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-c57-primary-container/15 blur-[60px]"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="flex items-center gap-space-sm font-label-sm uppercase tracking-[0.28em] text-c57-accent-line">
                <span className="accent-line" aria-hidden="true" />
                Cita-Cita Kami
              </p>
              <p className="mt-space-lg font-headline-sm text-headline-sm text-c57-on-scrim leading-snug">
                Menjadi partner perjalanan terpercaya yang menghadirkan pengalaman travel
                personal, premium, dan penuh makna.
              </p>

              <div className="mt-space-xl border-t border-white/10 pt-space-lg">
                <p className="font-label-sm uppercase tracking-[0.28em] text-c57-on-scrim/40">
                  Yang Kami Jaga
                </p>
                <ul className="mt-space-md space-y-space-sm">
                  {VALUES.map((value) => (
                    <li key={value} className="flex items-start gap-space-sm">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-c57-sm bg-c57-accent-line/10 text-c57-accent-line"
                        aria-hidden="true"
                      >
                        <Icon name="check_circle" size="xs" />
                      </span>
                      <span className="text-body-md text-c57-on-scrim/70">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <div>
            <p className="font-label-sm uppercase tracking-[0.28em] text-c57-primary">
              Tentang Kami
            </p>
            <h2 className="mt-3 font-headline-lg text-headline-lg-mobile text-c57-on-surface leading-tight md:text-headline-lg">
              Lebih Dari Sekadar{" "}
              <em className="font-normal italic text-c57-primary-container">Perjalanan</em>
            </h2>
            <p className="mt-space-md text-body-lg text-c57-on-surface-variant font-light leading-relaxed">
              Cakra Lima Tujuh hadir sebagai travel agen Surabaya untuk Anda yang menginginkan
              pengalaman perjalanan yang istimewa. Kami tidak hanya menjual tiket atau paket wisata —
              kami merancang momen berharga yang akan Anda kenang seumur hidup.
            </p>
            <p className="mt-space-md text-body-md text-c57-on-surface-variant leading-relaxed">
              Dari open trip yang seru, private trip yang eksklusif, hingga custom trip yang
              dirancang khusus sesuai impian Anda. Didukung tim profesional, armada terawat, dan
              jaringan partner terpercaya di seluruh destinasi Indonesia dan ASEAN.
            </p>

            <div className="mt-space-lg grid grid-cols-1 gap-space-md sm:grid-cols-3">
              {CREDENTIALS.map((item) => (
                <div
                  key={item.label}
                  className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-5 shadow-c57-card"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-c57-md bg-c57-surface-container text-c57-primary"
                    aria-hidden="true"
                  >
                    <Icon name={item.icon} size="md" />
                  </span>
                  <p className="mt-space-sm font-label-md uppercase tracking-wider text-c57-on-surface">
                    {item.label}
                  </p>
                  <p className="mt-1 text-body-sm text-c57-outline">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ────────────────────────────────────────── */}
        <section>
          <SectionHeading
            align="center"
            eyebrow="Yang Kami Tawarkan"
            title="Layanan "
            italic="Kami"
            description="Solusi perjalanan lengkap untuk setiap kebutuhan — dari petualangan personal hingga perjalanan korporat."
          />

          <div className="mt-space-xl grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((item, i) => (
              /* Static service summary: none of these six has a detail page, and
                 SERVICES carries no `path`. The card used to wear `interactive`
                 (a cursor-pointer plus a hover lift) and reveal a "Selengkapnya"
                 line on hover, so it promised a destination that does not exist.
                 Keep `group` so the icon and title still tint, drop the pointer
                 and the dead teaser. */
              <Card
                key={item.title}
                variant="flat"
                className="group animate-fadeInUp overflow-hidden p-7 transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-c57-md bg-c57-scrim text-c57-on-scrim transition-colors duration-300 group-hover:bg-c57-primary-container"
                  aria-hidden="true"
                >
                  <Icon name={item.icon} size="lg" />
                </span>
                <h3 className="mt-space-md font-headline-sm text-body-lg text-c57-on-surface transition-colors duration-300 group-hover:text-c57-primary-container">
                  {item.title}
                </h3>
                <p className="mt-space-sm text-body-sm text-c57-on-surface-variant leading-relaxed">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Destinations + commitment ───────────────────────── */}
        <section className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-2">
          <div>
            <p className="font-label-sm uppercase tracking-[0.28em] text-c57-primary">
              Destinasi Populer
            </p>
            <h2 className="mt-3 font-headline-lg text-headline-lg-mobile text-c57-on-surface md:text-headline-lg">
              Jelajahi{" "}
              <em className="font-normal italic text-c57-primary-container">Indonesia</em>
            </h2>
            <p className="mt-space-md text-body-md text-c57-on-surface-variant leading-relaxed">
              Dari keindahan Jawa yang kaya budaya, pesona Bali yang memesona, hingga eksotisme
              destinasi timur Indonesia dan ASEAN — kami hadir di mana pun petualangan Anda berada.
            </p>
            <div className="mt-space-lg grid grid-cols-2 gap-space-md">
              {DESTINATIONS.map((dest) => (
                <div
                  key={dest.label}
                  className="group rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-5 shadow-c57-card transition-colors duration-300 hover:border-c57-outline-variant"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-c57-sm bg-c57-surface-container text-c57-primary transition-colors duration-300 group-hover:bg-c57-primary-container group-hover:text-c57-on-primary"
                    aria-hidden="true"
                  >
                    <Icon name="location_on" size="sm" />
                  </span>
                  <p className="mt-space-sm font-label-md uppercase tracking-wider text-c57-on-surface">
                    {dest.label}
                  </p>
                  <p className="mt-1 text-body-sm text-c57-on-surface-variant">{dest.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Card variant="scrim" className="relative flex min-h-[400px] flex-col justify-between overflow-hidden p-10 md:p-14">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-15"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-c57-scrim/80 via-c57-scrim/60 to-c57-scrim/40"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="flex items-center gap-space-sm font-label-sm uppercase tracking-[0.28em] text-c57-accent-line">
                <Icon name="explore" size="md" />
                Komitmen Kami
              </p>
              <p className="mt-space-md font-headline-md text-headline-md text-c57-on-scrim leading-snug">
                Perjalanan Anda,{" "}
                <em className="font-normal italic text-c57-accent-line">Prioritas Kami</em>
              </p>
              <p className="mt-space-md text-body-md text-c57-on-scrim/60 font-light leading-relaxed">
                Setiap detail perjalanan dirancang dengan penuh perhatian. Dari konsultasi awal
                hingga Anda kembali dengan senyum puas.
              </p>
            </div>

            <dl className="relative z-10 mt-space-xl grid grid-cols-3 gap-space-md border-t border-white/10 pt-space-lg">
              {[
                { num: "500+", label: "Pelanggan" },
                { num: "20+", label: "Destinasi" },
                { num: "4.9", label: "Rating" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-headline-sm text-headline-sm text-c57-on-scrim">{stat.num}</dd>
                  <p className="mt-1 font-label-sm uppercase tracking-widest text-c57-on-scrim/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {/* ── Experience & trust ───────────────────────────────── */}
        <Card variant="flat" className="overflow-hidden">
          <div className="relative overflow-hidden px-10 py-14 md:px-16 md:py-20">
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-10"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-c57-scrim/80 to-c57-scrim/40"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="font-label-sm uppercase tracking-[0.28em] text-c57-accent-line">
                Pengalaman &amp; Kepercayaan
              </p>
              <h2 className="mt-space-md font-headline-lg text-headline-lg-mobile text-c57-on-scrim leading-tight md:text-headline-lg">
                Momen Berharga
                <br />
                <em className="font-normal italic text-c57-accent-line">Bermula dari Sini</em>
              </h2>
            </div>
          </div>

          <div className="space-y-space-lg p-10 md:p-16">
            <p className="text-body-lg text-c57-on-surface-variant font-light leading-relaxed">
              Kami memahami bahwa perjalanan bukan sekadar berpindah tempat — ini tentang
              menciptakan kenangan, menjalin hubungan, dan menemukan sesuatu yang baru. Setiap trip
              yang kami rancang adalah cerita yang menunggu untuk diceritakan.
            </p>
            <p className="text-body-md text-c57-on-surface-variant leading-relaxed">
              Dengan pengalaman menangani berbagai jenis perjalanan — mulai dari backpacker hingga
              luxury travel, keluarga hingga corporate team building — kami terus belajar dan
              berkembang untuk memberikan yang terbaik. Armada terawat, driver berpengalaman,
              jaringan hotel terpercaya, dan tim operasional yang responsif adalah fondasi
              layanan kami.
            </p>

            <blockquote className="rounded-c57-lg border border-c57-accent-line/20 bg-c57-surface-container p-8">
              <Icon name="format_quote" size="md" className="text-c57-accent-line" />
              <p className="mt-3 font-display text-body-lg italic text-c57-on-surface leading-relaxed">
                &ldquo;Kami percaya bahwa perjalanan terbaik adalah yang dirancang dengan hati.
                Itulah mengapa kami tidak hanya menjual paket — kami mendengarkan, memahami, dan
                mewujudkan perjalanan impian Anda.&rdquo;
              </p>
            </blockquote>
          </div>
        </Card>

        {/* ── Service standards ────────────────────────────────── */}
        <section className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-2">
          <div>
            <p className="font-label-sm uppercase tracking-[0.28em] text-c57-primary">
              Standar Kami
            </p>
            <h2 className="mt-3 font-headline-lg text-headline-lg-mobile text-c57-on-surface md:text-headline-lg">
              Komitmen{" "}
              <em className="font-normal italic text-c57-primary-container">Pelayanan</em>
            </h2>
            <p className="mt-space-md inline-block rounded-c57-md bg-c57-scrim px-6 py-4 font-label-md uppercase tracking-wider text-c57-on-scrim">
              Setiap perjalanan kami standarkan dengan penuh tanggung jawab:
            </p>
            <ol className="mt-space-lg space-y-space-md">
              {STANDARDS.map((item, i) => (
                <li key={item} className="flex items-center gap-space-md">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-c57-sm bg-c57-scrim font-label-sm text-c57-accent-line"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-body-md text-c57-on-surface-variant">{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <Card variant="flat" className="overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-c57-scrim">
              <img
                src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80"
                alt="Standar Perjalanan"
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-c57-scrim/60 to-transparent"
                aria-hidden="true"
              />
              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-c57-on-scrim">
                <Icon name="explore" size="xl" className="mb-3 opacity-60" />
                <p className="font-label-sm uppercase tracking-[0.28em] opacity-50">
                  Standar Perjalanan
                </p>
              </div>
            </div>
            <div className="space-y-space-sm p-8">
              <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">
                Kualitas yang Kami Jaga
              </h3>
              <p className="text-body-sm text-c57-on-surface-variant leading-relaxed">
                Setiap perjalanan yang kami layani mendapat perhatian penuh dari tim kami.
                Kepuasan dan keamanan Anda adalah ukuran keberhasilan kami.
              </p>
              <div className="flex items-center gap-space-sm pt-space-sm">
                <span className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-transparent via-c57-accent-line to-transparent" aria-hidden="true" />
                <Icon name="verified_user" size="sm" className="text-c57-accent-line" />
                <span className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-transparent via-c57-accent-line to-transparent" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between font-label-sm uppercase tracking-widest text-c57-outline">
                <span>Terpercaya</span>
                <span>Berkualitas</span>
                <span>Premium</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Contact ─────────────────────────────────────────── */}
        <section>
          <SectionHeading
            align="center"
            eyebrow="Hubungi Kami"
            title="Terhubung "
            italic="Dengan Kami"
          />
          <div className="mt-space-xl grid grid-cols-1 gap-space-lg md:grid-cols-3">
            {CONTACTS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-8 shadow-c57-card transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-c57-md bg-c57-surface-container text-c57-primary transition-colors duration-300 group-hover:bg-c57-primary-container group-hover:text-c57-on-primary"
                  aria-hidden="true"
                >
                  <Icon name={c.icon} size="lg" />
                </span>
                <p className="mt-space-md font-label-sm uppercase tracking-[0.28em] text-c57-outline">
                  {c.label}
                </p>
                <p className="mt-1 font-headline-sm text-body-lg text-c57-on-surface">{c.value}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
