import { Link, useNavigate } from "react-router-dom";
import { ElfsightWidget } from "react-elfsight-widget";
import { auth } from "../services/firebase";
import OpenTripTestimonials from "../components/OpenTripTestimonials";
import { Button, Card, Icon, SectionHeading } from "../components/ui";

export default function LandingPage() {
  const navigate = useNavigate();

  /* Gate a destination behind auth: signed-in users go where they wanted to go,
     everyone else is sent to log in first. */
  const go = (path) => navigate(auth.currentUser ? path : "/login");

  const services = [
    { icon: "map",        label: "Private Trip",     desc: "Perjalanan eksklusif hanya untuk Anda dan rombongan",        path: "/tour-packages" },
    { icon: "group",      label: "Open Trip",        desc: "Gabung bersama traveler lain dengan harga terjangkau",      path: "/open-trip" },
    { icon: "edit",       label: "Custom Trip",      desc: "Rancang perjalanan impian sesuai keinginan Anda",             path: "/tour-packages" },
    { icon: "apartment",  label: "Corporate Trip",   desc: "Solusi perjalanan bisnis dan corporate gathering",           path: "/tour-packages" },
    { icon: "directions_car", label: "Rental Kendaraan", desc: "Sewa kendaraan lepas kunci atau dengan driver",           path: "/home" },
    { icon: "hotel",      label: "Hotel & Tiket",    desc: "Reservasi hotel dan tiket perjalanan terbaik",               path: "/tour-packages" },
    { icon: "explore",    label: "Tour Guide",       desc: "Pemandu wisata berpengalaman di seluruh destinasi",           path: "/tour-packages" },
    { icon: "design_services", label: "Travel Planning", desc: "Perencanaan perjalanan lengkap dari awal hingga akhir",   path: "/tour-packages" },
  ];

  const tripByDest = [
    { label: "Jawa",      slug: "jawa",      count: "12+ Destinasi", image: "https://images.unsplash.com/photo-1566559532224-6d65e9fc0f37?w=900&auto=format&fit=crop&q=80" },
    { label: "Bali",      slug: "bali",      count: "8+ Destinasi",  image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&auto=format&fit=crop&q=80" },
    { label: "Indonesia", slug: "indonesia", count: "20+ Destinasi", image: "https://images.unsplash.com/photo-1745917784557-a93bf209232c?w=900&auto=format&fit=crop&q=80" },
    { label: "ASEAN",     slug: "asean",     count: "6+ Destinasi",  image: "https://images.unsplash.com/photo-1770848125591-2e97455bf21d?w=900&auto=format&fit=crop&q=80" },
  ];

  const tripByType = [
    { label: "Open Trip",         icon: "group" },
    { label: "Private Trip",      icon: "map" },
    { label: "Custom Trip",       icon: "edit" },
    { label: "Family Trip",       icon: "family_restroom" },
    { label: "Corporate Trip",    icon: "apartment" },
    { label: "Luxury Experience", icon: "stars" },
  ];

  const advantages = [
    { icon: "verified_user", title: "Travel Agen Terpercaya", desc: "Setiap perjalanan dirancang dengan standar keamanan tinggi dan didukung tim profesional berpengalaman." },
    { icon: "workspace_premium", title: "Pengalaman Premium", desc: "Dari akomodasi hingga itinerary, kami pastikan setiap detail memberikan kenyamanan dan kepuasan maksimal." },
    { icon: "support_agent", title: "Layanan 24/7", desc: "Tim kami selalu siap membantu Anda kapan saja, dari konsultasi perjalanan hingga dukungan saat di destinasi." },
  ];

  return (
    <div className="min-h-screen bg-c57-surface pt-30 text-c57-on-surface">

      {/* ===== HERO ===== */}
      <section className="relative min-h-[75vh] sm:h-[75vh] sm:min-h-[560px] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop&q=80"
          alt="Gunung Bromo saat sunrise"
          className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
        />

        {/* Editorial scrim stack: keeps the headline AA over any photo. */}
        <div className="absolute inset-0 bg-gradient-to-br from-c57-scrim/80 via-c57-scrim/60 to-c57-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/50 via-transparent to-c57-scrim/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none bg-[radial-gradient(ellipse_at_bottom,rgba(153,0,0,0.15)_0%,transparent_70%)]" />

        <div className="relative z-10 text-center px-gutter-mobile w-full max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-c57-surface-bright/10 border border-c57-surface-bright/20 text-c57-surface-bright font-label-md text-label-md mb-6 sm:mb-10 animate-fadeInUp backdrop-blur-md whitespace-nowrap uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-c57-primary-fixed animate-pulse shrink-0" />
            Premium Travel &amp; Tour Experience
          </div>

          <h1 className="font-display text-headline-lg text-c57-surface-bright tracking-tight leading-[1.1] animate-fadeInUp delay-100">
            Rencanakan Perjalananmu
            <br className="hidden md:block" />
            <span className="italic text-headline-md block mt-2 sm:mt-3 text-c57-on-scrim">
              bersama Cakra Lima Tujuh
            </span>
          </h1>

          <p className="text-c57-on-scrim/70 mt-4 sm:mt-5 text-body-lg animate-fadeInUp delay-200 max-w-xl mx-auto leading-relaxed">
            Travel Agen Surabaya untuk Perjalanan yang Dirancang Khusus — menghadirkan open trip, private trip, dan custom travel premium dengan layanan personal, itinerary eksklusif, dan pengalaman perjalanan yang lebih berkelas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-10 sm:mt-12 animate-fadeInUp delay-300 w-full">
            <Button
              size="lg"
              icon="chevron_right"
              iconPosition="right"
              onClick={() => go("/open-trip")}
              className="w-full sm:w-auto"
            >
              Lihat Open Trip
            </Button>
            <Button
              as={Link}
              to="/company-profile"
              size="lg"
              variant="glass"
              className="w-full sm:w-auto"
            >
              Tentang Kami
            </Button>
          </div>
        </div>
      </section>

      {/* ===== SERVICE CATALOG ===== */}
      <div className="relative z-20 -mt-20 px-gutter-mobile md:px-gutter max-w-7xl mx-auto w-full">
        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-c57-primary via-c57-accent-line to-c57-primary" />

          <div className="p-5 sm:p-8 md:p-10 lg:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 sm:mb-14 gap-4">
              <div className="text-center md:text-left">
                <p className="font-label-md text-label-md text-c57-accent-line uppercase tracking-[0.35em] mb-3">
                  Layanan Kami
                </p>
                <h2 className="font-display text-headline-md text-c57-on-surface tracking-tight leading-tight">
                  Perjalanan Impian Anda<span className="text-c57-primary">.</span>
                </h2>
                <p className="text-body-md text-c57-on-surface-variant mt-2 max-w-lg hidden md:block">
                  Setiap layanan dirancang untuk memberikan pengalaman perjalanan yang tak terlupakan.
                </p>
              </div>
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-c57-outline uppercase shrink-0">
                <div className="w-8 h-px bg-c57-outline-variant" />
                8 Layanan
                <div className="w-8 h-px bg-c57-outline-variant" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {services.map((svc) => (
                <button
                  key={svc.label}
                  type="button"
                  onClick={() => go(svc.path)}
                  className="group/item relative flex flex-col items-center p-6 sm:p-7 md:p-8 rounded-c57-lg border border-transparent bg-c57-surface-container-low hover:border-c57-outline-variant transition-all duration-500 ease-editorial hover:shadow-c57-card-hover hover:-translate-y-1.5 cursor-pointer"
                >
                  <div className="relative z-10 w-14 h-14 sm:w-[3.75rem] sm:h-[3.75rem] rounded-c57-md flex items-center justify-center mb-4 sm:mb-5 bg-c57-primary-container text-c57-on-primary transition-transform duration-500 group-hover/item:scale-110">
                    <Icon name={svc.icon} size="2xl" />
                  </div>

                  <div className="relative z-10 text-center w-full">
                    <span className="block font-display text-headline-sm text-c57-on-surface group-hover/item:text-c57-primary transition-colors duration-300 mb-1.5 sm:mb-2 tracking-tight leading-snug">
                      {svc.label}
                    </span>
                    <span className="hidden sm:block font-body-sm text-body-sm text-c57-on-surface-variant group-hover/item:text-c57-on-surface transition-colors duration-300 leading-relaxed">
                      {svc.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-c57-surface-variant flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="font-label-sm text-label-sm text-c57-outline uppercase">
                Semua layanan termasuk konsultasi gratis &amp; support 24/7
              </p>
              <Link
                to="/tour-packages"
                className="inline-flex items-center gap-2 font-label-md text-label-md text-c57-primary uppercase hover:gap-3 transition-all duration-300"
              >
                Lihat Semua Layanan
                <Icon name="chevron_right" size="sm" />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== TRIP CLASSIFICATION ===== */}
      <div className="section-luxury bg-c57-surface">
        <div className="max-w-7xl mx-auto px-gutter">
          <SectionHeading
            align="center"
            eyebrow="Kategori Perjalanan"
            title="Temukan Trip yang Tepat"
            description="Pilih perjalanan berdasarkan destinasi favorit atau jenis pengalaman yang Anda inginkan."
          />

          <div className="mb-16">
            <p className="font-label-md text-label-md text-c57-outline uppercase tracking-[0.25em] mb-6 text-center">
              Berdasarkan Destinasi
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {tripByDest.map((dest, i) => (
                <Link
                  key={dest.slug}
                  to={`/destinasi/${dest.slug}`}
                  className="relative aspect-[3/4] rounded-c57-lg overflow-hidden group cursor-pointer text-left block shadow-c57-card hover:shadow-c57-overlay hover:-translate-y-1 transition-all duration-500 animate-fadeInUp"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <img
                    src={dest.image}
                    alt={dest.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-c57-scrim/15 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-c57-primary/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-c57-primary-container/90 text-c57-on-primary font-label-sm text-label-sm uppercase backdrop-blur-sm group-hover:bg-c57-primary-container transition-colors duration-300">
                      <span className="w-1 h-1 rounded-full bg-c57-on-primary/60" />
                      Destinasi
                    </span>
                  </div>

                  <div className="absolute bottom-0 p-4 md:p-5 w-full">
                    <h3 className="font-display text-headline-sm text-c57-surface-bright tracking-tight group-hover:text-c57-on-scrim transition-colors duration-300">
                      {dest.label}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-label-sm text-label-sm text-c57-on-scrim/70 uppercase">
                        {dest.count}
                      </p>
                      <span className="text-transparent group-hover:text-c57-surface-bright/70 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
                        <Icon name="chevron_right" size="lg" />
                      </span>
                    </div>
                    <div className="w-0 group-hover:w-8 h-0.5 rounded-full bg-c57-accent-line/60 mt-2 transition-all duration-700" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-label-md text-label-md text-c57-outline uppercase tracking-[0.25em] mb-6 text-center">
              Berdasarkan Jenis Perjalanan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {tripByType.map((trip, i) => (
                <button
                  key={trip.label}
                  type="button"
                  onClick={() => go("/open-trip")}
                  className="group flex items-center gap-4 bg-c57-surface-container-lowest rounded-c57-md px-5 py-4 border border-c57-surface-variant hover:border-c57-primary/15 hover:shadow-c57-card transition-all duration-500 ease-editorial cursor-pointer hover:-translate-y-0.5 animate-fadeInUp text-left w-full"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-10 h-10 bg-c57-error-container text-c57-primary rounded-c57-sm flex items-center justify-center shrink-0 group-hover:bg-c57-primary-container group-hover:text-c57-on-primary transition-all duration-500">
                    <Icon name={trip.icon} size="lg" />
                  </div>
                  <span className="font-display text-headline-sm text-c57-on-surface group-hover:text-c57-primary transition-colors duration-300 leading-snug">
                    {trip.label}
                  </span>
                  <Icon
                    name="chevron_right"
                    size="lg"
                    className="ml-auto text-c57-outline-variant group-hover:text-c57-primary/50 transition-all duration-300 shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== WHY CHOOSE US ===== */}
      <div className="section-luxury bg-c57-surface-container-lowest relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-c57-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-gutter relative z-10">
          <SectionHeading
            align="center"
            eyebrow="Keunggulan Kami"
            title="Mengapa Cakra Lima Tujuh?"
            description="Kami tidak hanya menyediakan perjalanan — kami menciptakan pengalaman berharga yang akan Anda kenang."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {advantages.map((feat, i) => (
              /* This card is pure copy — no link, no button. `interactive` was
                 handing it a cursor-pointer and a hover lift that led nowhere,
                 while the `group-hover:` tint on the icon and title below had
                 no `.group` ancestor anywhere up the chain, so that hover never
                 fired either. Declaring `group` and keeping only the shadow
                 transition makes the tint actually work and stops the card
                 pretending to be pressable. */
              <Card
                key={feat.title}
                className="group p-7 md:p-8 bg-c57-surface-container-low animate-fadeInUp transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-c57-error-container rounded-c57-md flex items-center justify-center mb-5 text-c57-primary group-hover:bg-c57-primary-container group-hover:text-c57-on-primary transition-all duration-500">
                  <Icon name={feat.icon} size="2xl" />
                </div>
                <h3 className="font-display text-headline-sm text-c57-on-surface mb-2 group-hover:text-c57-primary transition-colors duration-300 tracking-tight">
                  {feat.title}
                </h3>
                <p className="text-body-sm text-body-sm text-c57-on-surface-variant leading-relaxed">
                  {feat.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TESTIMONI OPEN TRIP ===== */}
      <OpenTripTestimonials />

      {/* ===== ULASAN GOOGLE (Elfsight) ===== */}
      <div className="section-luxury bg-c57-scrim relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-c57-primary/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-c57-accent-line/5 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-gutter">
          <div className="text-center mb-14">
            <p className="font-label-md text-label-md uppercase tracking-[0.3em] text-c57-on-scrim/40 mb-3">
              Rating &amp; Ulasan
            </p>
            <h2 className="font-display text-headline-lg text-c57-surface-bright tracking-tight">
              Ulasan Google
            </h2>
            <div className="w-12 h-px bg-c57-primary-container mx-auto mt-5" />
          </div>

          <ElfsightWidget
            widgetId="9e1ea109-b04f-462c-9b6f-a2d202491384"
            lazy="in-viewport"
            className="mt-2"
          />
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className="section-luxury bg-c57-surface relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-gutter text-center relative z-10">
          <p className="font-label-md text-label-md text-c57-primary uppercase tracking-[0.3em] mb-4">
            Siap Berpetualang?
          </p>
          <h2 className="font-display text-headline-lg text-c57-on-surface mb-6 tracking-tight">
            Wujudkan Perjalanan Impian Anda
          </h2>
          <div className="w-12 h-px bg-c57-primary/30 mx-auto mt-5 mb-8" />
          <p className="text-body-lg text-c57-on-surface-variant mb-12 max-w-2xl mx-auto leading-relaxed">
            Konsultasikan rencana perjalanan Anda bersama kami. Tim Cakra Lima Tujuh akan merancang
            itinerary terbaik sesuai keinginan Anda.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" icon="chevron_right" iconPosition="right" onClick={() => go("/tour-packages")}>
              Mulai Rencanakan
            </Button>
            <Button
              as="a"
              href="https://wa.me/6287859660053"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="secondary"
              icon="call"
            >
              Hubungi Kami
            </Button>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="bg-c57-scrim text-c57-on-scrim border-t border-c57-on-scrim/10">
        <div className="max-w-7xl mx-auto px-gutter py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-c57-primary-container rounded-full flex items-center justify-center text-c57-on-primary">
                  <Icon name="explore" size="lg" />
                </div>
                <span className="font-display text-headline-sm text-c57-surface-bright tracking-wide">
                  Cakra Lima Tujuh
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-c57-on-scrim/60 leading-relaxed max-w-sm mb-6">
                Premium travel agen Surabaya terpercaya. Melayani private trip, open trip, corporate trip,
                rental mobil, dan perencanaan perjalanan.
              </p>
              <div className="flex items-center gap-2.5 font-label-sm text-label-sm text-c57-on-scrim/40">
                <Icon name="verified_user" size="sm" className="text-c57-primary-fixed" />
                <span>Terdaftar &amp; Terpercaya</span>
              </div>
            </div>

            <div>
              <h4 className="font-label-md text-label-md uppercase tracking-[0.2em] mb-5 text-c57-on-scrim/40">
                Navigasi
              </h4>
              <ul className="space-y-3 font-body-sm text-body-sm text-c57-on-scrim/60">
                <li><Link to="/open-trip" className="hover:text-c57-surface-bright transition-colors duration-300">Open Trip</Link></li>
                <li><Link to="/tour-packages" className="hover:text-c57-surface-bright transition-colors duration-300">Paket Wisata</Link></li>
                <li><Link to="/home" className="hover:text-c57-surface-bright transition-colors duration-300">Rental Kendaraan</Link></li>
                <li><Link to="/company-profile" className="hover:text-c57-surface-bright transition-colors duration-300">Tentang Kami</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-label-md text-label-md uppercase tracking-[0.2em] mb-5 text-c57-on-scrim/40">
                Kontak
              </h4>
              <ul className="space-y-3.5 font-body-sm text-body-sm text-c57-on-scrim/60">
                <li className="flex items-start gap-2.5">
                  <Icon name="place" size="sm" className="text-c57-primary-fixed/60 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">Lembah Harapan Blok AA-57, Lidah Wetan, Lakarsantri, Surabaya</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="call" size="sm" className="text-c57-primary-fixed/60 shrink-0" />
                  <span>+62 878-5966-0053</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="mail" size="sm" className="text-c57-primary-fixed/60 shrink-0" />
                  <span>cakralimatujuh@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-c57-on-scrim/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between font-label-sm text-label-sm text-c57-on-scrim/40 gap-4 uppercase">
            <p>&copy; {new Date().getFullYear()} Cakra Lima Tujuh. All rights reserved.</p>
            <p>Premium Travel &amp; Tour Experience</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
