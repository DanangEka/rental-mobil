import React from "react";
import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

export default function Footer() {
  return (
    <footer className="bg-c57-scrim text-c57-on-scrim border-t border-c57-on-scrim/10">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin py-16">
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
              <li><Link to="/testimoni" className="hover:text-c57-surface-bright transition-colors duration-300">Testimoni</Link></li>
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
  );
}
