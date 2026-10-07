/**
 * bookingService.js
 * Mengelola subcollection: units/{unitId}/bookings
 * Field: start (Timestamp), end (Timestamp), source, status, pemesananId
 *
 * Digunakan oleh:
 *  - ListMobil.js (client booking + admin manual order)
 *  - Mini-calendar untuk render tanggal yang sudah terbooked
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Kembalikan mobil ke pool tersedia setelah sebuah pesanan selesai.
 *
 * Kenapa tidak `updateDoc(doc(db, "mobil", id), {tersedia, status})` langsung?
 * Aturan Firestore tidak bisa melakukan query, jadi rules tidak dapat
 * menjawab pertanyaan "apakah pemanggil ini punya pesanan untuk mobil ini?".
 * Kontrol sebelumnya karena itu hanya `signedIn()`, yang membuat akun mana pun
 * able menulis field apa pun pada dokumen mobil mana pun.
 *
 * Sebagai gantinya, pemanggil memegang "tanda" di
 * `mobil/{mobilId}/renters/{uid}`. Rules memverifikasi tanda itu dengan `get()`
 * ke dokumen pemesanan yang disebut di dalamnya, sehingga akun acak tetap
 * tidak bisa mendapat hak mengubah mobil. Tanda dibuat tepat di sini, jadi
 * alur pemesanan tidak perlu diubah.
 *
 * @param {string} mobilId
 * @param {string} pemesananId pesanan yang dipunyai /tepat oleh pemanggil
 * @returns {Promise<boolean>} true bila mobil berhasil dikembalikan
 */
export async function releaseVehicle(mobilId, pemesananId) {
  if (!mobilId) return false;

  const vehicleRef = doc(db, "mobil", mobilId);
  const markerRef = doc(db, "mobil", mobilId, "renters", auth.currentUser.uid);

  try {
    await setDoc(markerRef, {
      pemesananId,
      uid: auth.currentUser.uid,
      at: Timestamp.now(),
    });

    await updateDoc(vehicleRef, {
      tersedia: true,
      status: "normal",
      updatedAt: Timestamp.now(),
    });

    return true;
  } finally {
    // Tanda hanya berlaku untuk satu pembaruan. Buang agar tidak menjadi
    // tombol permanen untuk mobil ini.
    await deleteDoc(markerRef).catch(() => {});
  }
}

/**
 * Ambil semua rentang booking untuk satu unit.
 * @param {string} unitId
 * @returns {Promise<Array<{start: Date, end: Date, id: string}>>}
 */
export async function fetchUnitBookings(unitId) {
  const ref = collection(db, "mobil", unitId, "bookings");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({
    id: d.id,
    start: d.data().start?.toDate(),
    end: d.data().end?.toDate(),
    source: d.data().source,
    status: d.data().status,
  }));
}

/**
 * Subscribe realtime ke bookings sebuah unit.
 * @param {string} unitId
 * @param {(bookings: Array) => void} callback
 * @returns unsubscribe function
 */
export function subscribeUnitBookings(unitId, callback) {
  const ref = collection(db, "mobil", unitId, "bookings");
  return onSnapshot(
    ref,
    (snap) => {
      const bookings = snap.docs.map((d) => ({
        id: d.id,
        start: d.data().start?.toDate(),
        end: d.data().end?.toDate(),
        source: d.data().source,
        status: d.data().status,
      }));
      callback(bookings);
    },
    (error) => {
      console.warn(`Firestore bookings read warning for unit ${unitId}:`, error);
      callback([]);
    }
  );
}

/**
 * Cek apakah rentang [newStart, newEnd] overlap dengan booking yang ada.
 * Overlap terjadi jika newStart < existingEnd && newEnd > existingStart
 *
 * @param {string} unitId
 * @param {Date} newStart
 * @param {Date} newEnd
 * @returns {Promise<boolean>} true jika ada overlap
 */
export async function checkBookingOverlap(unitId, newStart, newEnd) {
  const bookings = await fetchUnitBookings(unitId);
  return bookings.some((b) => {
    if (!b.start || !b.end) return false;
    return newStart < b.end && newEnd > b.start;
  });
}

/**
 * Buat dokumen booking baru di subcollection setelah validasi overlap.
 * Throws jika ada overlap.
 *
 * @param {string} unitId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {"online"|"manual_offline"} source
 * @param {string} pemesananId - referensi ke dokumen pemesanan
 * @returns {Promise<string>} booking document id
 */
export async function createUnitBooking(
  unitId,
  startDate,
  endDate,
  source = "online",
  pemesananId = ""
) {
  // Validasi overlap
  const hasOverlap = await checkBookingOverlap(unitId, startDate, endDate);
  if (hasOverlap) {
    throw new Error(
      "Tanggal yang Anda pilih sudah terbooked. Silakan pilih rentang tanggal lain."
    );
  }

  const bookingRef = await addDoc(
    collection(db, "mobil", unitId, "bookings"),
    {
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      source,
      status: "confirmed",
      pemesananId,
      createdAt: Timestamp.now(),
    }
  );

  return bookingRef.id;
}

/**
 * Hitung tanggal pertama yang tersedia setelah semua booking yang ada.
 * @param {Array<{start: Date, end: Date}>} bookings
 * @returns {Date|null} null jika tidak ada booking aktif
 */
export function getNextAvailableDate(bookings) {
  if (!bookings || bookings.length === 0) return null;

  const now = new Date();
  // Filter hanya booking yang end-nya di masa depan
  const activeBookings = bookings
    .filter((b) => b.end && b.end > now)
    .sort((a, b) => a.end - b.end);

  if (activeBookings.length === 0) return null;

  // Cari ujung cluster paling akhir (untuk booking berurutan)
  let latestEnd = activeBookings[0].end;
  for (const b of activeBookings) {
    if (b.start <= latestEnd && b.end > latestEnd) {
      latestEnd = b.end;
    }
  }

  // Tambah 1 hari dari akhir booking terakhir
  const nextDate = new Date(latestEnd);
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

/**
 * Cek apakah sebuah tanggal (Date) jatuh dalam salah satu rentang booking.
 * @param {Date} date
 * @param {Array<{start: Date, end: Date}>} bookings
 * @returns {boolean}
 */
export function isDateBooked(date, bookings) {
  return bookings.some((b) => {
    if (!b.start || !b.end) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(b.start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(b.end);
    e.setHours(0, 0, 0, 0);
    return d >= s && d < e;
  });
}
