import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

let mockCurrentPath = "/login";

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...props }) =>
      require("react").createElement("a", { href: to, ...props }, children),
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: mockCurrentPath }),
  }),
  { virtual: true }
);

jest.mock("../services/firebase", () => ({
  auth: { currentUser: { uid: "u1", email: "siti@mail.com" } },
  db: {},
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...a) => ({ __doc: a })),
  getDoc: jest.fn(),
  collection: jest.fn((...a) => ({ __collection: a })),
  query: jest.fn((...a) => ({ __query: a })),
  where: jest.fn((...a) => ({ __where: a })),
  orderBy: jest.fn((...a) => ({ __orderBy: a })),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
}));

const auth = require("firebase/auth");
const firestore = require("firebase/firestore");
const Navbar = require("../components/Navbar").default;

beforeEach(() => {
  mockCurrentPath = "/login";
  jest.clearAllMocks();
  document.body.style.overflow = "";
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  auth.onAuthStateChanged.mockImplementation((_auth, cb) => {
    cb({ uid: "u1", email: "siti@mail.com" });
    return () => {};
  });
  firestore.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "client" }),
  });
  firestore.onSnapshot.mockImplementation((_query, cb) => {
    cb({ docs: [] });
    return () => {};
  });
});

test("mobile clients get three one-row groups and no hamburger", async () => {
  render(<Navbar />);

  const rail = screen.getByRole("navigation", { name: "Navigasi utama" });
  expect(rail).toBeInTheDocument();
  expect(rail).not.toHaveClass("overflow-x-auto");
  expect(within(rail).queryAllByRole("link")).toHaveLength(0);
  expect(within(rail).getAllByRole("button")).toHaveLength(3);
  expect(within(rail).queryByRole("link", { name: /Rental Mobil/i })).not.toBeInTheDocument();

  const layanan = within(rail).getByRole("button", { name: "Layanan" });
  expect(layanan).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(layanan);

  expect(layanan).toHaveAttribute("aria-expanded", "true");
  const layananPanel = screen.getByRole("navigation", { name: "Layanan" });
  expect(within(layananPanel).getByRole("link", { name: /Rental Mobil/i })).toHaveAttribute("href", "/home");
  expect(within(layananPanel).getByRole("link", { name: /Trip Planner/i })).toHaveAttribute("href", "/trip-planner");
  expect(within(layananPanel).getByText("Lepas kunci atau dengan driver")).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");

  const jelajah = within(rail).getByRole("button", { name: "Jelajah" });
  fireEvent.click(jelajah);
  const jelajahPanel = screen.getByRole("navigation", { name: "Jelajah" });
  expect(layanan).toHaveAttribute("aria-expanded", "false");
  expect(jelajah).toHaveAttribute("aria-expanded", "true");
  expect(within(jelajahPanel).getByRole("link", { name: /Discovery/i })).toHaveAttribute("href", "/discovery");
  expect(within(jelajahPanel).getByRole("link", { name: /^Open Trip/i })).toHaveAttribute("href", "/open-trip");
  expect(within(jelajahPanel).getByRole("link", { name: /Paket Wisata/i })).toHaveAttribute("href", "/tour-packages");

  const tentang = within(rail).getByRole("button", { name: "Tentang" });
  fireEvent.click(tentang);
  const tentangPanel = screen.getByRole("navigation", { name: "Tentang" });
  expect(within(tentangPanel).getByRole("link", { name: /Testimoni/i })).toHaveAttribute("href", "/testimoni");
  expect(within(tentangPanel).getByRole("link", { name: /Company/i })).toHaveAttribute("href", "/company-profile");

  fireEvent.click(screen.getByRole("button", { name: "Tutup menu Tentang" }));
  expect(screen.queryByRole("navigation", { name: "Tentang" })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");

  fireEvent.click(layanan);
  expect(screen.getByRole("navigation", { name: "Layanan" })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("navigation", { name: "Layanan" })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");

  expect(screen.queryByLabelText("Buka menu navigasi")).not.toBeInTheDocument();
  expect(await screen.findByLabelText("Buka menu akun")).toBeInTheDocument();
  expect(screen.queryByText("Masuk")).not.toBeInTheDocument();
});

test("the active section follows its child route", () => {
  auth.onAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(null);
    return () => {};
  });
  mockCurrentPath = "/trip-planner";
  const { unmount } = render(<Navbar />);

  let rail = screen.getByRole("navigation", { name: "Navigasi utama" });
  expect(within(rail).getByRole("button", { name: "Layanan" })).toHaveAttribute("aria-current", "page");
  expect(within(rail).getByRole("button", { name: "Jelajah" })).not.toHaveAttribute("aria-current");
  unmount();

  mockCurrentPath = "/company-profile";
  render(<Navbar />);
  rail = screen.getByRole("navigation", { name: "Navigasi utama" });
  expect(within(rail).getByRole("button", { name: "Tentang" })).toHaveAttribute("aria-current", "page");
  expect(within(rail).getByRole("button", { name: "Layanan" })).not.toHaveAttribute("aria-current");
});

test("the avatar opens an account sheet, not the whole navigation", async () => {
  render(<Navbar />);
  fireEvent.click(await screen.findByLabelText("Buka menu akun"));

  const sheet = await screen.findByRole("dialog", { name: "Menu akun" });
  expect(within(sheet).getByText("Profil")).toBeInTheDocument();
  expect(within(sheet).getByText("History Pesanan")).toBeInTheDocument();
  expect(within(sheet).getByText("Logout")).toBeInTheDocument();
  expect(within(sheet).queryByText("Dashboard")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu akun" })).not.toBeInTheDocument());
  expect(document.body.style.overflow).toBe("");
});

test("signed-out users see Masuk and Daftar in the mobile bar", async () => {
  auth.onAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(null);
    return () => {};
  });

  render(<Navbar />);
  await waitFor(() =>
    expect(
      screen.getAllByRole("link", { name: "Masuk" }).some((link) => link.id === "login-btn-mobile")
    ).toBe(true)
  );
  expect(
    screen.getAllByRole("link", { name: "Daftar" }).some((link) => link.id === "signup-btn-mobile")
  ).toBe(true);
  expect(screen.queryByLabelText("Buka menu akun")).not.toBeInTheDocument();
});

test("landing page mobile navigation is usable before scrolling", () => {
  mockCurrentPath = "/";
  auth.onAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(null);
    return () => {};
  });
  render(<Navbar />);
  const rail = screen.getByRole("navigation", { name: "Navigasi utama" });
  fireEvent.click(within(rail).getByRole("button", { name: "Jelajah" }));
  expect(within(screen.getByRole("navigation", { name: "Jelajah" })).getByRole("link", { name: /^Open Trip/i })).toHaveAttribute("href", "/open-trip");
});
