// Cloudinary upload helper — uses unsigned uploads via an upload preset.
// Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET env vars.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET && CLOUD_NAME !== "placeholder");
}

/**
 * Upload a file (image or video) to Cloudinary via unsigned upload preset.
 * Returns the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(file) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Upload failed");
  }

  const data = await res.json();
  return data.secure_url;
}

/** Check whether a URL points to a Cloudinary (or other) video asset. */
export function isVideoUrl(url) {
  if (!url) return false;
  return url.includes("/video/upload/") || /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
}
