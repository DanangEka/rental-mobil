const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dnfruux8d";
const DEFAULT_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "rental-mobil";

export const IMAGE_LIMITS = {
  document: { maxMb: 2, maxWidth: 1400, quality: 0.82 },
  proof: { maxMb: 2, maxWidth: 1400, quality: 0.82 },
  photo: { maxMb: 5, maxWidth: 1600, quality: 0.8 },
};

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/gif",
];

const limitOf = (limit) => {
  if (typeof limit === "number") return { ...IMAGE_LIMITS.photo, maxMb: limit };
  return IMAGE_LIMITS[limit] || IMAGE_LIMITS.photo;
};

export const toMb = (bytes) => Math.round((bytes / 1048576) * 10) / 10;

export function validateImageFile(file, limit = "photo") {
  const { maxMb } = limitOf(limit);
  if (!file) return "File tidak ditemukan.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Format file harus JPG, PNG, atau WEBP.";
  if (file.size > maxMb * 1024 * 1024) {
    return `Ukuran file maksimal ${maxMb} MB (file ini ${toMb(file.size)} MB).`;
  }
  return null;
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Gambar tidak dapat dibaca"));
    };
    img.src = objectUrl;
  });

export async function compressImage(file, limit = "photo") {
  const { maxWidth, quality } = limitOf(limit);
  try {
    if (typeof URL.createObjectURL !== "function") return file;
    const canvas = document.createElement("canvas");
    if (typeof canvas.toBlob !== "function") return file;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    const img = await loadImage(file);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxWidth ? maxWidth / longest : 1;
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch (e) {
    return file;
  }
}

export async function uploadImage(file, options = {}) {
  const { limit = "photo", folder, preset } = options;
  const problem = validateImageFile(file, limit);
  if (problem) throw new Error(problem);

  const payload = await compressImage(file, limit);
  const body = new FormData();
  body.append("file", payload);
  body.append("upload_preset", preset || DEFAULT_PRESET);
  body.append("cloud_name", CLOUD_NAME);
  if (folder) body.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const parsed = await res.json();
      detail = (parsed && parsed.error && parsed.error.message) || "";
    } catch (e) {
      detail = "";
    }
    throw new Error(detail || "Gagal mengunggah ke Cloudinary");
  }

  const data = await res.json();
  if (!data || !data.secure_url) throw new Error("Gagal mengunggah ke Cloudinary");
  return data.secure_url;
}
