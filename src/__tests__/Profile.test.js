import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

import { ToastProvider } from "../components/Toast";

/**
 * Profile is the one client page that *writes* to Firestore, so these tests
 * pin the document contract rather than the layout: every writable field,
 * no `email`, and a fresh KTP upload that always sends the account back into
 * the admin review queue.
 */

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...a) => ({ __doc: a })),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn((...a) => ({ __collection: a })),
  query: jest.fn((...a) => ({ __query: a })),
  where: jest.fn((...a) => ({ __where: a })),
  onSnapshot: jest.fn(),
}));

jest.mock("../services/firebase", () => ({
  auth: { currentUser: { uid: "u1", email: "siti@mail.com" } },
  db: { __db: true },
}));

// react-scripts jest config cannot resolve the installed react-router-dom 7
// package, so the module is supplied as a virtual mock.
const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: "" }),
  }),
  { virtual: true }
);

const firestore = require("firebase/firestore");
const { getDoc, updateDoc } = firestore;
const { auth } = require("../services/firebase");

const Profile = require("../pages/Profile").default;

const DOC = {
  nama: "Siti Rahma",
  email: "siti@mail.com",
  nomorTelepon: "08123456789",
  alamat: "Jl. Pahlawan No. 9",
  provinsi: "jawa timur",
  kabupaten: "Sidoarjo",
  kecamatan: "Taman",
  kelurahan: "Bluru Kidul",
  rt: "12",
  rw: "04",
  verificationStatus: "verified",
  ktpURL: "https://cdn/ktp.jpg",
  createdAt: { toDate: () => new Date("2024-03-02T00:00:00Z") },
};

const WRITABLE_FIELDS = [
  "alamat",
  "jenisKelamin",
  "kabupaten",
  "kecamatan",
  "kelurahan",
  "kontakDaruratHubungan",
  "kontakDaruratNama",
  "kontakDaruratTelepon",
  "kotaBasisUtama",
  "ktpURL",
  "nama",
  "nomorTelepon",
  "penanggungJawab",
  "penanggungJawabAlamat",
  "penanggungJawabTelepon",
  "provinsi",
  "rt",
  "rw",
  "tanggalLahir",
  "titikAntarFavorit",
  "verificationStatus",
];

const renderProfile = () =>
  render(
    <ToastProvider>
      <Profile />
    </ToastProvider>
  );

// react-scripts 5 sets `resetMocks: true`, so implementations are re-established
// per test instead of being baked into the module factory.
beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: "u1", email: "siti@mail.com" };
  firestore.doc.mockImplementation((...a) => ({ __doc: a }));
  firestore.collection.mockImplementation((...a) => ({ __collection: a }));
  firestore.query.mockImplementation((...a) => ({ __query: a }));
  firestore.where.mockImplementation((...a) => ({ __where: a }));
  firestore.onSnapshot.mockImplementation((_q, cb) => {
    cb({ size: 0 });
    return () => {};
  });
  getDoc.mockResolvedValue({ exists: () => true, data: () => DOC });
  updateDoc.mockResolvedValue(undefined);
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ secure_url: "https://cdn/new-ktp.jpg" }),
  }));
});

test("renders the profile document and keeps email read-only", async () => {
  const { container } = renderProfile();

  expect((await screen.findAllByText("Siti Rahma")).length).toBeGreaterThan(0);
  expect(screen.getByText("08123456789")).toBeInTheDocument();
  expect(screen.getByText("Jl. Pahlawan No. 9")).toBeInTheDocument();
  expect(screen.getAllByText("siti@mail.com").length).toBeGreaterThan(0);
  expect(container.querySelector('input[name="email"]')).toBeNull();
});

test("read-only captions are not <label for> pointing at nothing", async () => {
  const { container } = renderProfile();
  await screen.findAllByText("Siti Rahma");
  expect(container.querySelectorAll("label[for]").length).toBe(0);
});

test("the full-width name field stays full width in read mode", async () => {
  renderProfile();
  const matches = await screen.findAllByText("Siti Rahma");
  expect(matches[matches.length - 1].closest('[class*="md:col-span-2"]')).not.toBeNull();
});

test("save writes every writable field and never email", async () => {
  renderProfile();

  fireEvent.click(await screen.findByText("Edit Profil"));
  fireEvent.change(screen.getByPlaceholderText("Nama Sesuai KTP"), {
    target: { name: "nama", value: "Siti Rahma A." },
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Simpan Perubahan"));
  });

  expect(updateDoc).toHaveBeenCalledTimes(1);
  const payload = updateDoc.mock.calls[0][1];
  expect(Object.keys(payload).sort()).toEqual(WRITABLE_FIELDS);
  expect(payload.nama).toBe("Siti Rahma A.");
  expect(payload.email).toBeUndefined();
  expect(payload.verificationStatus).toBe("verified");
  expect(payload.ktpURL).toBe("https://cdn/ktp.jpg");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("a fresh KTP upload resets verificationStatus to pending", async () => {
  renderProfile();

  fireEvent.click(await screen.findByText("Edit Profil"));
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["x"], "ktp.png", { type: "image/png" })] },
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Simpan Perubahan"));
  });

  await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const body = global.fetch.mock.calls[0][1].body;
  expect(body.get("upload_preset")).toBe("rental-mobil");
  expect(body.get("cloud_name")).toBe("dnfruux8d");
  const payload = updateDoc.mock.calls[0][1];
  expect(payload.ktpURL).toBe("https://cdn/new-ktp.jpg");
  expect(payload.verificationStatus).toBe("pending");
});

test("a failed upload leaves the stored verification status untouched", async () => {
  global.fetch = jest.fn(async () => ({ ok: false }));
  renderProfile();

  fireEvent.click(await screen.findByText("Edit Profil"));
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["x"], "ktp.png", { type: "image/png" })] },
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Simpan Perubahan"));
  });

  expect(updateDoc).not.toHaveBeenCalled();
  expect(await screen.findByText(/Gagal memperbarui profil/i)).toBeInTheDocument();
});

test("only KTP is requested — no SIM section, no Priority Club card", async () => {
  renderProfile();

  await screen.findAllByText("Siti Rahma");
  expect(screen.queryByText(/Surat Izin Mengemudi/)).toBeNull();
  expect(screen.queryByText(/SIM A/)).toBeNull();
  expect(screen.queryByText(/Cakra Priority Club/)).toBeNull();
  expect(screen.queryByText(/Dedicated Concierge/)).toBeNull();
});

test("Riwayat Booking navigates the client to their booking history", async () => {
  renderProfile();

  fireEvent.click(await screen.findByText("Riwayat Booking"));
  expect(mockNavigate).toHaveBeenCalledWith("/history-pesanan");
});

test("the breadcrumb returns to the portal home", async () => {
  renderProfile();

  fireEvent.click(await screen.findByText("Portal Klien"));
  expect(mockNavigate).toHaveBeenCalledWith("/home");
});

test("a signed-out visitor is met by an access gate", async () => {
  auth.currentUser = null;

  renderProfile();
  expect(await screen.findByText("Akses Ditolak")).toBeInTheDocument();
  expect(getDoc).not.toHaveBeenCalled();
});

test("a missing document renders a recoverable state, not a crash", async () => {
  getDoc.mockResolvedValue({ exists: () => false });
  renderProfile();

  expect(await screen.findByText("Data Profil Tidak Ditemukan")).toBeInTheDocument();
  expect(screen.queryByText("Edit Profil")).toBeNull();
});

test("a rejected read renders an error state", async () => {
  getDoc.mockRejectedValue(new Error("permission-denied"));
  renderProfile();
  expect(await screen.findByText("Profil Gagal Dimuat")).toBeInTheDocument();
});