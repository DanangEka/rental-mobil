import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

import { ToastProvider } from "../components/Toast";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...a) => ({ __collection: a })),
  query: jest.fn((...a) => ({ __query: a })),
  where: jest.fn((...a) => ({ __where: a })),
  onSnapshot: jest.fn(),
  doc: jest.fn((...a) => ({ __doc: a })),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date("2026-01-01T00:00:00Z") })),
    fromDate: jest.fn((d) => ({ toDate: () => d })),
  },
}));

jest.mock("../services/firebase", () => ({
  auth: {
    currentUser: null,
  },
  db: { __db: true },
}));

jest.mock("../services/bookingService", () => ({
  createUnitBooking: jest.fn(),
  subscribeUnitBookings: jest.fn(),
  getNextAvailableDate: jest.fn(),
}));

jest.mock("../components/InvoiceGenerator", () => ({
  __esModule: true,
  default: { generateDPInvoice: jest.fn() },
}));

// react-scripts jest config cannot resolve the installed react-router-dom 7
// package, so the module is supplied as a virtual mock.
const mockNavigate = jest.fn();
const mockLocationRef = { search: "" };
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: mockLocationRef.search }),
  }),
  { virtual: true }
);

const firestore = require("firebase/firestore");
const { collection, query, where, doc, updateDoc, addDoc, getDoc } = firestore;
const mockOnSnapshot = firestore.onSnapshot;
const mockCreateUnitBooking = require("../services/bookingService").createUnitBooking;
const mockSubscribeUnitBookings = require("../services/bookingService").subscribeUnitBookings;
const mockGetNextAvailableDate = require("../services/bookingService").getNextAvailableDate;
const mockGenerateDPInvoice = require("../components/InvoiceGenerator").default.generateDPInvoice;
const { auth } = require("../services/firebase");

const ListMobil = require("../pages/ListMobil").default;

const UNITS = [
  {
    id: "m1",
    nama: "All New Sigra Manual",
    merek: "Daihatsu",
    tahun: 2025,
    harga: 275000,
    seats: 6,
    chargingPort: true,
    status: "tersedia",
    tersedia: true,
    gambar: "https://img/sigra.png",
    platNomor: "L 1829 CD",
    withDriver: false,
  },
  {
    id: "m2",
    nama: "All New Terios Manual DLX",
    merek: "Daihatsu",
    tahun: 2024,
    harga: 350000,
    seats: 7,
    chargingPort: true,
    status: "tersedia",
    tersedia: true,
    gambar: "https://img/terios.png",
    withDriver: true,
  },
  {
    id: "m3",
    nama: "Hiace Premio",
    merek: "Toyota",
    tahun: 2023,
    harga: 1500000,
    seats: 14,
    chargingPort: true,
    status: "servis",
    tersedia: false,
    gambar: "https://img/hiace.png",
    withDriver: true,
  },
];

const snapshots = { mobil: null, orders: null };

function emitFleet(units = UNITS) {
  act(() =>
    snapshots.mobil({
      docs: units.map((u) => ({ id: u.id, data: () => ({ ...u }) })),
    })
  );
}

function emitOrders(orders = []) {
  act(() =>
    snapshots.orders({
      docs: orders.map((o) => ({ id: o.id, data: () => ({ ...o }) })),
    })
  );
}

function renderFleet() {
  return render(
    <ToastProvider>
      <ListMobil />
    </ToastProvider>
  );
}

// react-scripts 5 sets `resetMocks: true`, so every implementation must be
// re-established per test rather than baked into the module factory.
beforeEach(() => {
  jest.clearAllMocks();
  mockLocationRef.search = "";
  firestore.collection.mockImplementation((...a) => ({ __collection: a }));
  firestore.query.mockImplementation((...a) => ({ __query: a }));
  firestore.where.mockImplementation((...a) => ({ __where: a }));
  firestore.doc.mockImplementation((...a) => ({ __doc: a }));

  auth.currentUser = {
    uid: "u1",
    email: "siti@mail.com",
    displayName: "Siti",
    phoneNumber: null,
    getIdTokenResult: jest.fn().mockResolvedValue({ claims: { admin: false } }),
  };

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ nama: "Siti Aminah", nomorTelepon: "081234567890", verificationStatus: "verified" }),
  });

  updateDoc.mockResolvedValue(undefined);
  addDoc.mockResolvedValue({ id: "guest1" });
  mockCreateUnitBooking.mockResolvedValue("booking1");
  mockSubscribeUnitBookings.mockImplementation((_id, cb) => {
    cb([]);
    return jest.fn();
  });
  mockGetNextAvailableDate.mockReturnValue(null);

  mockOnSnapshot.mockImplementation((q, onNext) => {
    if (q && q.__collection && q.__collection[1] === "mobil") {
      snapshots.mobil = onNext;
    } else {
      snapshots.orders = onNext;
    }
    return jest.fn();
  });
});

const loadFleet = () => {
  const utils = renderFleet();
  emitFleet();
  emitOrders();
  return utils;
};

const setDateRange = (mulai, selesai) => {
  fireEvent.change(screen.getByLabelText("Mulai sewa"), { target: { value: mulai } });
  fireEvent.change(screen.getByLabelText("Selesai sewa"), { target: { value: selesai } });
};

test("renders the hero headline, trust badges and every available unit", async () => {
  mockLocationRef.search = "";
  loadFleet();
  expect(screen.getByText("Rental Mobil Surabaya")).toBeInTheDocument();
  expect(await screen.findByText("All New Sigra Manual")).toBeInTheDocument();
  expect(screen.getByText("All New Terios Manual DLX")).toBeInTheDocument();
  expect(screen.getByText("Unit Prima")).toBeInTheDocument();
  expect(screen.getByText(/Rp 275[.,]000/)).toBeInTheDocument();
});

test("keyboard search filters by nama / merek / tahun", async () => {
  loadFleet();
  await screen.findByText("All New Sigra Manual");

  fireEvent.change(screen.getByLabelText("Pencarian armada"), { target: { value: "terios" } });
  expect(screen.queryByText("All New Sigra Manual")).not.toBeInTheDocument();
  expect(screen.getByText("All New Terios Manual DLX")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Pencarian armada"), { target: { value: "2023" } });
  expect(screen.queryByText("All New Terios Manual DLX")).not.toBeInTheDocument();
  expect(screen.getByText("Hiace Premio")).toBeInTheDocument();
});

test("default availability filter narrows to ready units only", async () => {
  loadFleet();
  await screen.findByText("All New Sigra Manual");

  fireEvent.change(screen.getByLabelText("Ketersediaan armada"), { target: { value: "tersedia" } });
  expect(screen.getByText("All New Sigra Manual")).toBeInTheDocument();
  expect(screen.queryByText("Hiace Premio")).not.toBeInTheDocument();
});

test("empty state appears when no unit matches", async () => {
  loadFleet();
  await screen.findByText("All New Sigra Manual");

  fireEvent.change(screen.getByLabelText("Pencarian armada"), { target: { value: "zzzz" } });
  expect(await screen.findByText("Armada Tidak Ditemukan")).toBeInTheDocument();
});

test("service type from ?type= filters to driver units and retitles the hero", async () => {
  mockLocationRef.search = "?type=driver";
  const utils = renderFleet();
  emitFleet([UNITS[0], UNITS[1]]);
  emitOrders();

  expect(screen.getByText("Sewa Dengan Driver")).toBeInTheDocument();
  expect(await screen.findByText("All New Terios Manual DLX")).toBeInTheDocument();
  expect(screen.queryByText("All New Sigra Manual")).not.toBeInTheDocument();
});

test("maintenance units show Under Maintenance and keep their price badge", async () => {
  loadFleet();
  expect(await screen.findByText("Hiace Premio")).toBeInTheDocument();
  expect(screen.getAllByText("Under Maintenance").length).toBeGreaterThan(0);
});

test("active order for a unit shows the processing state instead of the rent button", async () => {
  const utils = renderFleet();
  emitFleet([UNITS[0]]);
  emitOrders([
    { id: "o1", mobilId: "m1", status: "diproses", namaMobil: "All New Sigra Manual" },
  ]);

  expect(await screen.findByText("Processing... Please Wait")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /rent this unit/i })).not.toBeInTheDocument();
});

test("driver service adds the 250k driver fee to the displayed and written estimate", async () => {
  mockLocationRef.search = "?type=driver";
  const utils = renderFleet();
  emitFleet([UNITS[1]]);
  emitOrders();

  fireEvent.click(await screen.findByRole("button", { name: /rent with driver/i }));
  setDateRange("2026-12-01T08:00", "2026-12-03T08:00");

  // 2 days x 350.000 + 250.000 driver fee = 950.000
  expect(screen.getByText(/950[.,]000/)).toBeInTheDocument();
  expect(screen.getByText("+ Biaya Layanan Driver")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Lokasi penyerahan"), { target: { value: "Rumah" } });
  fireEvent.change(screen.getByLabelText("Alamat pengiriman"), {
    target: { value: "Jl. Test No. 1" },
  });

  fireEvent.click(screen.getByRole("button", { name: /proses pesanan sekarang/i }));

  await waitFor(() => {
    expect(mockCreateUnitBooking).toHaveBeenCalledWith(
      "m2",
      expect.any(Date),
      expect.any(Date),
      "online"
    );
  });

  const pemesananCalls = addDoc.mock.calls.filter(
    (c) => c[0] && c[0].__collection && c[0].__collection[1] === "pemesanan"
  );
  expect(pemesananCalls.length).toBe(1);
  const payload = pemesananCalls[0][1];
  expect(payload).toMatchObject({
    uid: "u1",
    mobilId: "m2",
    bookingId: "booking1",
    rentalType: "Driver",
    status: "diproses",
    paymentStatus: "pending",
    perkiraanHarga: 950000,
    dpAmount: 475000,
    lokasiPenyerahan: "Rumah",
    deliveryAddress: "Jl. Test No. 1",
    namaClient: "Siti Aminah",
    telepon: "081234567890",
  });

  const notifCalls = addDoc.mock.calls.filter(
    (c) => c[0] && c[0].__collection && c[0].__collection[1] === "notifications"
  );
  expect(notifCalls.map((c) => c[1].userId).sort()).toEqual(["admin", "u1"]);
  expect(await screen.findByText("Pemesanan Berhasil!")).toBeInTheDocument();
});

test("unverified user is blocked at booking with a toast", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ nama: "Siti", nomorTelepon: "081234", verificationStatus: "unverified" }),
  });
  const utils = renderFleet();
  emitFleet([UNITS[0]]);
  emitOrders();

  fireEvent.click(await screen.findByRole("button", { name: /rent this unit/i }));
  setDateRange("2026-12-01T08:00", "2026-12-02T08:00");
  fireEvent.change(screen.getByLabelText("Lokasi penyerahan"), { target: { value: "Kantor" } });
  fireEvent.click(screen.getByRole("button", { name: /proses pesanan sekarang/i }));

  expect(await screen.findByText("Akun Anda belum diverifikasi.")).toBeInTheDocument();
  expect(mockCreateUnitBooking).not.toHaveBeenCalled();
});

test("verification alert offers Update Profil and fixes navigation to /profil", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ nama: "Siti", verificationStatus: "pending" }),
  });
  const utils = renderFleet();
  emitFleet();
  emitOrders();

  expect(await screen.findByText("Status Verifikasi Account")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /update profil/i }));
  expect(mockNavigate).toHaveBeenCalledWith("/profil");
});

test("admin manual/offline order books the unit, creates a guest, and invoices", async () => {
  auth.currentUser.getIdTokenResult = jest
    .fn()
    .mockResolvedValue({ claims: { admin: true } });

  const utils = renderFleet();
  emitFleet([UNITS[0]]);
  emitOrders();

  fireEvent.click(await screen.findByRole("button", { name: /manual order \(cashier\)/i }));

  fireEvent.change(screen.getByLabelText("Nama lengkap customer"), { target: { value: "Budi Santoso" } });
  fireEvent.change(screen.getByLabelText("Nomor telepon"), { target: { value: "081298765432" } });
  fireEvent.change(screen.getByLabelText("Tanggal mulai sewa"), { target: { value: "2026-12-01T08:00" } });
  fireEvent.change(screen.getByLabelText("Tanggal selesai sewa"), { target: { value: "2026-12-02T08:00" } });
  fireEvent.change(screen.getByLabelText("Nominal DP"), { target: { value: "200000" } });

  fireEvent.click(screen.getByRole("button", { name: /simpan & terbitkan pesanan kasir/i }));

  await waitFor(() => {
    expect(mockCreateUnitBooking).toHaveBeenCalledWith(
      "m1",
      expect.any(Date),
      expect.any(Date),
      "manual_offline"
    );
  });

  const usersCalls = addDoc.mock.calls.filter(
    (c) => c[0] && c[0].__collection && c[0].__collection[1] === "users"
  );
  expect(usersCalls.length).toBe(1);
  expect(usersCalls[0][1]).toMatchObject({
    nama: "Budi Santoso",
    role: "client",
    verificationStatus: "verified",
    isGuest: true,
  });

  const pemesananCalls = addDoc.mock.calls.filter(
    (c) => c[0] && c[0].__collection && c[0].__collection[1] === "pemesanan"
  );
  expect(pemesananCalls.length).toBe(1);
  expect(pemesananCalls[0][1]).toMatchObject({
    uid: "guest1",
    mobilId: "m1",
    rentalType: "Lepas Kunci",
    status: "tugas aktif",
    paymentStatus: "paid_cash",
    paymentMethod: "Cash",
    isManualSewa: true,
    dpAmount: 200000,
    lokasiPenyerahan: "Di Tempat",
  });

  expect(mockGenerateDPInvoice).toHaveBeenCalled();
  expect(updateDoc).toHaveBeenCalledWith(
    expect.objectContaining({ __doc: expect.anything() }),
    { status: "disewa", tersedia: false }
  );
  expect(await screen.findByText("Sewa Manual Berhasil")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});