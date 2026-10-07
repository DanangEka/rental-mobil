const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const cloudinary = require("cloudinary").v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

/**
 * Extract the asset public_id from a Cloudinary delivery URL:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1791398659/poster-promo/abc123.png
 *     → "poster-promo/abc123"
 * Returns null for anything that is not this cloud's asset (Google-hosted
 * seed photos, Unsplash, foreign URLs) — those must never be destroyed.
 */
function publicIdFromUrl(url, cloudName) {
  try {
    const u = new URL(url);
    if (u.hostname !== "res.cloudinary.com") return null;
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments[0] !== cloudName) return null;
    const m = u.pathname.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
    if (!m) return null;
    return m[1].replace(/\.[A-Za-z0-9]+$/, "");
  } catch {
    return null;
  }
}

/**
 * When a testimoni document is deleted, remove its Cloudinary photo too.
 * Firestore deletion alone never touched Cloudinary, so images accumulated
 * as orphans in the poster-promo folder.
 *
 * Guards:
 *  - no photoUrl (most client submissions)        → nothing to do
 *  - URL not hosted on this Cloudinary cloud      → skip (seed/foreign images)
 *  - env not configured                           → warn + skip, never throw
 *  - Cloudinary says "not found"                  → already gone, treat as success
 */
exports.cleanupTestimoniImage = onDocumentDeleted(
  { document: "testimoni/{id}", region: "asia-southeast1" },
  async (event) => {
    const id = event.params.id;
    const data = event.data ? event.data.data() : null;
    const photoUrl = data && data.photoUrl;

    if (!photoUrl) {
      logger.info(`testimoni/${id}: no photoUrl — nothing to clean up`);
      return;
    }

    if (!CLOUD_NAME || !API_SECRET) {
      logger.warn(
        "Cloudinary env (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET) not configured — skipping destroy"
      );
      return;
    }

    const publicId = publicIdFromUrl(photoUrl, CLOUD_NAME);
    if (!publicId) {
      logger.info(`testimoni/${id}: photoUrl is not a ${CLOUD_NAME} asset — skipping`);
      return;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      const status = (result && (result.result || result)) || "unknown";
      logger.info(`testimoni/${id}: destroy ${publicId} → ${status}`);
    } catch (err) {
      logger.error(`testimoni/${id}: failed to destroy ${publicId}`, err);
      // Swallow: a Cloudinary hiccup must not fail the Firestore delete.
    }
  }
);
