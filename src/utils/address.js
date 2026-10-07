/**
 * Resolves the human-readable address for a `pemesanan` order.
 *
 * This was copy-pasted into DriverOrders and DriverDashboard as two identical
 * 35-line `getFullAddress(order)` closures that each captured `users` and
 * `companyProfile` from their component scope. It is a pure function of its
 * arguments, so it does not need that scope — lifting it here means the venue
 * rules live in one place and can be tested without Firestore.
 *
 * The rule the copies encoded, and which is not obvious: a `deliveryAddress`
 * the client typed at booking time always beats the structured profile fields,
 * because the profile is where incomplete legacy records tend to stop short.
 */

const EMPTY = {
  Rumah: "Alamat client tidak tersedia",
  Kantor: "Alamat perusahaan tidak tersedia",
  "Titik Temu": "Alamat titik temu tidak tersedia",
};

/** Joins whatever profile address parts exist, plus RT/RW when both are set. */
function profileAddress(client) {
  const parts = [
    client.alamat,
    client.kelurahan,
    client.kecamatan,
    client.kabupaten,
    client.provinsi,
  ].filter((part) => part && part.trim() !== "");

  const rtRw = [];
  if (client.rt) rtRw.push(`RT ${client.rt}`);
  if (client.rw) rtRw.push(`RW ${client.rw}`);
  if (rtRw.length > 0) parts.push(rtRw.join("/"));

  return parts.length > 0 ? parts.join(", ") : "Alamat client tidak lengkap";
}

export function resolveOrderAddress(order, { users = [], companyProfile = null } = {}) {
  if (!order) return "Lokasi tidak ditentukan";

  const venue = order.lokasiPenyerahan;

  if (venue === "Kantor") {
    return companyProfile?.alamat || EMPTY.Kantor;
  }

  if (venue === "Rumah") {
    if (order.deliveryAddress) return order.deliveryAddress;

    const client = users.find((u) => u.id === order.uid);
    return client ? profileAddress(client) : EMPTY.Rumah;
  }

  if (venue === "Titik Temu") {
    return order.deliveryAddress || order.titikTemuAddress || EMPTY["Titik Temu"];
  }

  return "Lokasi tidak ditentukan";
}

export default resolveOrderAddress;
