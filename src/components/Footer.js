import React from "react";
import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

export default function Footer() {
  return (
    <footer className="bg-c57-scrim text-c57-on-scrim">
      <div className="editorial-shell py-16 sm:py-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="font-display text-[1.9rem] leading-none tracking-[-0.02em]">
              Cakra Lima Tujuh
            </p>
            <p className="mt-2 font-label-sm text-label-sm uppercase tracking-[0.26em] text-c57-accent-line">
              Premium Travel &amp; Tour Experience
            </p>
            <p className="mt-6 max-w-sm text-body-sm leading-relaxed text-c57-on-scrim/60">
              Travel agen Surabaya untuk perjalanan yang dirancang khusus —
              open trip, private trip, corporate trip, rental mobil, dan
              perencanaan perjalanan di seluruh Indonesia.
            </p>
            <div className="mt-6 flex items-center gap-2.5 font-label-sm text-label-sm text-c57-on-scrim/40">
              <Icon name="verified_user" size="sm" className="text-c57-accent-line" />
              <span>Terdaftar &amp; Terpercaya</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="font-label-sm text-label-sm uppercase tracking-[0.24em] text-c57-on-scrim/40">
              Navigasi
            </p>
            <ul className="mt-5 space-y-3 text-body-sm">
              <li><Link to="/open-trip" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Open Trip</Link></li>
              <li><Link to="/tour-packages" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Paket Wisata</Link></li>
              <li><Link to="/testimoni" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Testimoni</Link></li>
              <li><Link to="/trip-planner" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Rancang Custom Trip</Link></li>
              <li><Link to="/home" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Rental Kendaraan</Link></li>
              <li><Link to="/company-profile" className="text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">Tentang Kami</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="font-label-sm text-label-sm uppercase tracking-[0.24em] text-c57-on-scrim/40">
              Kontak
            </p>
            <ul className="mt-5 space-y-3.5 font-body-sm text-body-sm text-c57-on-scrim/60">
              <li className="flex items-start gap-2.5">
                <Icon name="place" size="sm" className="mt-0.5 shrink-0 text-c57-accent-line/70" />
                <span className="leading-relaxed">Lembah Harapan Blok AA-57, Lidah Wetan, Lakarsantri, Surabaya</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="call" size="sm" className="shrink-0 text-c57-accent-line/70" />
                <span>+62 878-5966-0053</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="mail" size="sm" className="shrink-0 text-c57-accent-line/70" />
                <span>cakralimatujuh@gmail.com</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="font-label-sm text-label-sm uppercase tracking-[0.24em] text-c57-on-scrim/40">
              Terhubung
            </p>
            <ul className="mt-5 space-y-3 font-body-sm text-body-sm">
              <li>
                <a href="https://instagram.com/cakralimatujuhtrans" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">
                  <Icon name="photo_camera" size="xs" /> Instagram
                </a>
              </li>
              <li>
                <a href="https://wa.me/6287859660053" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">
                  <Icon name="chat" size="xs" /> WhatsApp
                </a>
              </li>
              <li>
                <a href="tel:+6287859660053" className="inline-flex items-center gap-2 text-c57-on-scrim/60 transition-colors hover:text-c57-surface-bright">
                  <Icon name="call" size="xs" /> Hotline
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-on-scrim/35 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Cakra Lima Tujuh. All rights reserved.</p>
          <p>Premium Travel &amp; Tour Experience</p>
        </div>
      </div>
    </footer>
  );
}
