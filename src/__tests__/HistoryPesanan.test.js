import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

import { ToastProvider } from "../components/Toast";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...a) => ({ __collection: a })),
  query: jest.fn((...a) => ({ __query: a })),
  where: jest.fn((...a) => ({ __where: a })),
  orderBy: jest.fn((...a) => ({ __orderBy: a })),
  onSnapshot: jest.fn(),
  doc: jest.fn((...a) => ({ __doc: a })),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  // Dipakai releaseVehicle() di bookingService: menulis marker bukti di
  // mobil/{id}/renters/{uid}, lalu dihapus setelah status mobil diperbarui.
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: jest.fn(() => "__serverTimestamp"),
  Timestamp: { now: jest.fn(() => "__timestamp") },
}));

jest.mock("../services/firebase", () => ({
  auth: {
    currentUser: { uid: "u1", email: "siti@mail.com" },
    onAuthStateChanged: (cb) => {
      cb({ uid: "u1" });
      return jest.fn();
    },
  },
  db: { __db: true },
}));

jest.mock("../components/InvoiceGenerator", () => ({
  __esModule: true,
  default: { generateDPInvoice: jest.fn() },
}));

// The page and this file must observe the *same* mock instances, so the
// assertions read them off the mocked module rather than through local
// delegating wrappers.
const firestore = require("firebase/firestore");
const { collection, query, where, orderBy, doc, updateDoc, addDoc, setDoc, deleteDoc } = firestore;
const mockOnSnapshot = firestore.onSnapshot;
const mockUpdateDoc = updateDoc;
const mockAddDoc = addDoc;
const mockGenerateDPInvoice = require("../components/InvoiceGenerator").default
  .generateDPInvoice;

const HistoryPesanan = require("../pages/HistoryPesanan").default;

const ORDERS = [
  {
    id: "aaaa1111bbbb",
    namaMobil: "ALL NEW SIGRA MANUAL",
    rentalType: "Lepas Kunci",
    status: "menunggu pembayaran",
    perkiraanHarga: 275000,
    tanggal: "2026-08-14T02:20:00.000Z",
    tanggalMulai: "2026-08-14",
    tanggalSelesai: "2026-08-15",
    lokasiPenyerahan: "Kantor Cakra 57",
    deliveryAddress: "Jl. Pahlawan 9",
    paymentMethod: null,
    platNomor: "L 1829 CD",
    mobilId: "m1",
  },
  {
    id: "cccc2222dddd",
    namaMobil: "ALL NEW TERIOS MANUAL DLX",
    rentalType: "Dengan Driver",
    status: "lunas",
    perkiraanHarga: 900000,
    tanggal: "2026-07-09T11:45:00.000Z",
    tanggalMulai: "2026-07-09",
    tanggalSelesai: "2026-07-12",
    lokasiPenyerahan: "Juanda",
    paymentMethod: "Transfer Bank",
    dpAmount: 900000,
    platNomor: "L 9001 AB",
    mobilId: "m2",
  },
  {
    id: "eeee3333ffff",
    namaMobil: "HIACE PREMIO",
    rentalType: "Lepas Kunci",
    status: "diproses",
    perkiraanHarga: 1500000,
    tanggal: "2026-09-01T00:00:00.000Z",
    tanggalMulai: "2026-09-05",
    tanggalSelesai: "2026-09-07",
    lokasiPenyerahan: "Kantor Cakra 57",
    paymentMethod: null,
    platNomor: null,
    mobilId: "m3",
  },
];

let snapshotCallback;
let snapshotErrorCallback;

function emitSnapshot(orders = ORDERS) {
  snapshotCallback({
    docs: orders.map((order) => ({ id: order.id, data: () => ({ ...order }) })),
  });
}

function renderHistory() {
  return render(
    <ToastProvider>
      <HistoryPesanan />
    </ToastProvider>
  );
}

// react-scripts 5 sets `resetMocks: true`, so every implementation has to be
// re-established per test rather than baked into the module factory.
beforeEach(() => {
  jest.clearAllMocks();
  firestore.collection.mockImplementation((...a) => ({ __collection: a }));
  firestore.query.mockImplementation((...a) => ({ __query: a }));
  firestore.where.mockImplementation((...a) => ({ __where: a }));
  firestore.orderBy.mockImplementation((...a) => ({ __orderBy: a }));
  firestore.doc.mockImplementation((...a) => ({ __doc: a }));
  // clearAllMocks() di atas menghapus juga implementasi, jadi kembalikan:
  // releaseVehicle() meng-await ketiganya.
  firestore.setDoc.mockImplementation(() => Promise.resolve());
  firestore.deleteDoc.mockImplementation(() => Promise.resolve());
  firestore.getDoc.mockImplementation(() => Promise.resolve({ exists: () => false }));
  firestore.serverTimestamp.mockImplementation(() => "__serverTimestamp");
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ secure_url: "https://cdn/bukti.png" }),
  }));
  mockOnSnapshot.mockImplementation((q, onNext, onError) => {
    snapshotCallback = onNext;
    snapshotErrorCallback = onError;
    return jest.fn();
  });
  updateDoc.mockResolvedValue(undefined);
  addDoc.mockResolvedValue("id");
});

const loadPage = () => {
  const utils = renderHistory();
  act(() => emitSnapshot());
  return utils;
};
const { act } = require("@testing-library/react");

test("queries pemesanan for the signed-in client, newest first", async () => {
  loadPage();
  await screen.findByText("ALL NEW SIGRA MANUAL");

  expect(collection).toHaveBeenCalledWith(expect.anything(), "pemesanan");
  expect(where).toHaveBeenCalledWith("uid", "==", "u1");
  expect(orderBy).toHaveBeenCalledWith("tanggal", "desc");
  expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledTimes(1);
});

test("renders raw statuses as readable labels, unknown statuses verbatim", async () => {
  loadPage();
  expect(await screen.findByText("Menunggu Pembayaran")).toBeInTheDocument();
  expect(screen.getAllByText("Lunas").length).toBeGreaterThan(0);
  expect(screen.getByText("Diproses")).toBeInTheDocument();

  act(() =>
    emitSnapshot([
      { ...ORDERS[0], id: "zzzz9999", status: "menunggu_material" },
    ])
  );
  expect(await screen.findByText("menunggu_material")).toBeInTheDocument();
});

test("metrics count real data only", async () => {
  loadPage();
  await screen.findByText("ALL NEW SIGRA MANUAL");
  expect(screen.getByText("Total Reservasi").parentElement.parentElement).toHaveTextContent("3");
  expect(screen.getByText("Sedang Berjalan").parentElement.parentElement).toHaveTextContent("2");
  expect(screen.getByText("Dokumen Tersedia").parentElement.parentElement).toHaveTextContent("1");
  // only settled orders (lunas 900k) count toward the accumulation
  expect(screen.getByText("Total Akumulasi").parentElement.parentElement).toHaveTextContent(
    "Rp 900.000"
  );
});

test("search matches vehicle name and order id", async () => {
  loadPage();
  await screen.findByText("ALL NEW SIGRA MANUAL");

  fireEvent.change(screen.getByLabelText("Cari mobil"), { target: { value: "terios" } });
  expect(screen.queryByText("ALL NEW SIGRA MANUAL")).toBeNull();
  expect(screen.getByText("ALL NEW TERIOS MANUAL DLX")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Cari mobil"), { target: { value: "eeee3333" } });
  expect(screen.getByText("HIACE PREMIO")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Cari mobil"), { target: { value: "zzzz" } });
  expect(await screen.findByText("Tidak Ada Pesanan yang Cocok")).toBeInTheDocument();
});

test("status and service-type filters compose", async () => {
  loadPage();
  await screen.findByText("ALL NEW SIGRA MANUAL");

  fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "lunas" } });
  expect(screen.queryByText("ALL NEW SIGRA MANUAL")).toBeNull();
  expect(screen.getByText("ALL NEW TERIOS MANUAL DLX")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "all" } });
  fireEvent.click(screen.getByRole("button", { name: /Lepas Kunci/i }));
  expect(screen.queryByText("ALL NEW TERIOS MANUAL DLX")).toBeNull();
  expect(screen.getByText("HIACE PREMIO")).toBeInTheDocument();
});

test("sorting by highest cost reorders the list", async () => {
  loadPage();
  await screen.findByText("ALL NEW SIGRA MANUAL");
  fireEvent.change(screen.getByLabelText("Urutkan pesanan"), { target: { value: "price-high" } });
  const codes = screen.getAllByText(/^#[a-z0-9]{8}$/).map((n) => n.textContent);
  expect(codes).toEqual(["#eeee3333", "#cccc2222", "#aaaa1111"]);
});

test("invoice download is offered only for settled statuses and passes the order through", async () => {
  loadPage();
  await screen.findByText("ALL NEW TERIOS MANUAL DLX");

  expect(screen.getAllByRole("button", { name: /Download Invoice DP/i })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Download Invoice DP/i }));
  expect(mockGenerateDPInvoice).toHaveBeenCalledWith(
    expect.objectContaining({ id: "cccc2222dddd" }),
    expect.objectContaining({ uid: "u1" })
  );
});

test("payment requires a method", async () => {
  loadPage();
  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi Pembayaran/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi & Kirim/i }));

  expect((await screen.findAllByText(/Pilih metode pembayaran/i)).length).toBeGreaterThan(0);
  expect(updateDoc).not.toHaveBeenCalled();
});

test("transfer below the 50% DP floor is rejected", async () => {
  loadPage();
  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi Pembayaran/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Transfer Bank" }));
  fireEvent.change(document.getElementById("paymentProof"), {
    target: { files: [new File(["x"], "bukti.png", { type: "image/png" })] },
  });
  fireEvent.change(screen.getByLabelText("Nominal Pembayaran DP (IDR)"), {
    target: { value: "100000" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Konfirmasi & Kirim/i }));

  expect(await screen.findByText(/minimal adalah 50%/i)).toBeInTheDocument();
  expect(updateDoc).not.toHaveBeenCalled();
});

test("transfer with proof writes the submitted payload and both notifications", async () => {
  loadPage();
  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi Pembayaran/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Transfer Bank" }));

  const fileInput = document.getElementById("paymentProof");
  fireEvent.change(fileInput, {
    target: { files: [new File(["x"], "bukti.png", { type: "image/png" })] },
  });
  fireEvent.change(screen.getByLabelText("Nominal Pembayaran DP (IDR)"), {
    target: { value: "137500" },
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi & Kirim/i }));
  });

  await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
  expect(doc).toHaveBeenCalledWith(expect.anything(), "pemesanan", "aaaa1111bbbb");
  const payload = updateDoc.mock.calls[0][1];
  expect(payload).toEqual({
    paymentMethod: "Transfer Bank",
    paymentStatus: "submitted",
    waktuUpload: expect.any(String),
    paymentProof: "https://cdn/bukti.png",
    dpAmount: 137500,
  });

  await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(2));
  const [notificationsCollection, clientNote] = addDoc.mock.calls[0];
  expect(notificationsCollection.__collection[1]).toBe("notifications");
  expect(clientNote.message).toBe("Bukti pembayaran ALL NEW SIGRA MANUAL berhasil dikirim");
  expect(clientNote.read).toBe(false);
  expect(clientNote.timestamp).toBe("__serverTimestamp");
  const [, adminNote] = addDoc.mock.calls[1];
  expect(adminNote.userId).toBe("admin");
  expect(adminNote.message).toBe("Permintaan pembayaran dari siti@mail.com");
});

test("approved cash books dp_cash_submitted without uploading a proof", async () => {
  loadPage();
  act(() =>
    emitSnapshot([
      { ...ORDERS[0], status: "disetujui_cash" },
    ])
  );

  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi Pembayaran/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Cash" }));
  fireEvent.change(screen.getByLabelText("Nominal Pembayaran DP (IDR)"), {
    target: { value: "140000" },
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi & Kirim/i }));
  });

  await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  expect(global.fetch).not.toHaveBeenCalled();
  const payload = updateDoc.mock.calls[0][1];
  expect(payload.paymentStatus).toBe("dp_cash_submitted");
  expect(payload.paymentProof).toBeUndefined();
});

test("cash without approval books cash_submitted and needs no DP amount", async () => {
  loadPage();
  act(() =>
    emitSnapshot([
      { ...ORDERS[0], status: "menunggu pembayaran" },
    ])
  );

  fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi Pembayaran/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Cash" }));

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi & Kirim/i }));
  });

  await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  const payload = updateDoc.mock.calls[0][1];
  expect(payload.paymentStatus).toBe("cash_submitted");
  expect(payload.dpAmount).toBeUndefined();
});

test("cancelling releases the vehicle back to the fleet", async () => {
  loadPage();
  fireEvent.click(await screen.findByRole("button", { name: /Batalkan/i }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: /Ya, Batal/i }));

  await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(2));
  expect(doc).toHaveBeenCalledWith(expect.anything(), "pemesanan", "eeee3333ffff");
  expect(updateDoc.mock.calls[0][1]).toEqual({ status: "dibatalkan" });
  expect(doc).toHaveBeenCalledWith(expect.anything(), "mobil", "m3");
  expect(updateDoc.mock.calls[1][1]).toEqual({ tersedia: true, status: "normal" });
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).toBeNull()
  );
});

test("an empty history points at the fleet instead of dead-ending", async () => {
  const { container } = renderHistory();
  act(() => emitSnapshot([]));
  expect(await screen.findByText("Belum Ada Pesanan")).toBeInTheDocument();
  const link = container.querySelector('a[href="/home"]');
  expect(link).not.toBeNull();
  expect(link).toHaveTextContent("Pilih Armada");
});

test("a failed snapshot surfaces an error state, not a blank list", async () => {
  renderHistory();
  await act(async () => {
    snapshotErrorCallback(new Error("permission-denied"));
  });
  expect(await screen.findByText("Riwayat Tidak Dapat Dimuat")).toBeInTheDocument();
});
