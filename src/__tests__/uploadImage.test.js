import {
  IMAGE_LIMITS,
  toMb,
  validateImageFile,
  compressImage,
  uploadImage,
} from "../utils/uploadImage";

const asFile = (overrides = {}) => ({
  name: "foto.jpg",
  type: "image/jpeg",
  size: 1024,
  ...overrides,
});

test("size limits differ per upload kind", () => {
  expect(IMAGE_LIMITS.document.maxMb).toBe(2);
  expect(IMAGE_LIMITS.proof.maxMb).toBe(2);
  expect(IMAGE_LIMITS.photo.maxMb).toBe(5);
});

test("validateImageFile rejects oversized documents but allows them as photos", () => {
  const threeMb = asFile({ size: 3 * 1024 * 1024 });

  expect(validateImageFile(threeMb, "proof")).toMatch(/maksimal 2 MB/);
  expect(validateImageFile(threeMb, "document")).toMatch(/3 MB/);
  expect(validateImageFile(threeMb, "photo")).toBeNull();
});

test("validateImageFile rejects non-image files and missing files", () => {
  expect(validateImageFile(null)).toMatch(/tidak ditemukan/);
  expect(validateImageFile(asFile({ type: "application/pdf" }))).toMatch(/JPG, PNG, atau WEBP/);
  expect(validateImageFile(asFile({ type: "image/png" }))).toBeNull();
});

test("toMb rounds to one decimal", () => {
  expect(toMb(0)).toBe(0);
  expect(toMb(1.5 * 1024 * 1024)).toBe(1.5);
});

test("compressImage falls back to the original file when canvas is unavailable", async () => {
  const original = asFile();
  await expect(compressImage(original, "proof")).resolves.toBe(original);
});

test("uploadImage posts the file with preset, cloud name and folder", async () => {
  const fetchMock = jest.fn(async () => ({
    ok: true,
    json: async () => ({ secure_url: "https://cdn/hasil.jpg" }),
  }));
  global.fetch = fetchMock;

  const url = await uploadImage(asFile(), {
    limit: "photo",
    folder: "mobil",
    preset: "rental-mobil",
  });

  expect(url).toBe("https://cdn/hasil.jpg");
  const [endpoint, init] = fetchMock.mock.calls[0];
  expect(endpoint).toContain("/image/upload");
  expect(init.body.get("upload_preset")).toBe("rental-mobil");
  expect(init.body.get("folder")).toBe("mobil");
  expect(init.body.get("cloud_name")).toBeTruthy();
});

test("uploadImage surfaces Cloudinary's own error message", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    json: async () => ({ error: { message: "File size should be less than 2 MB" } }),
  }));

  await expect(uploadImage(asFile())).rejects.toThrow("less than 2 MB");
});

test("uploadImage still fails politely when the error body is unreadable", async () => {
  global.fetch = jest.fn(async () => ({ ok: false }));

  await expect(uploadImage(asFile())).rejects.toThrow(/Gagal mengunggah/);
});

test("uploadImage never touches the network for an invalid file", async () => {
  global.fetch = jest.fn();

  await expect(
    uploadImage(asFile({ size: 9 * 1024 * 1024 }), { limit: "photo" })
  ).rejects.toThrow(/maksimal 5 MB/);
  expect(global.fetch).not.toHaveBeenCalled();
});
