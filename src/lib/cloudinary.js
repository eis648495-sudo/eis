// Cloudinary upload helper — uses unsigned uploads via an upload preset.
// Supports multiple accounts with automatic fallback when one runs out of storage.
//
// Primary account: VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET
// Additional accounts (optional): VITE_CLOUDINARY_CLOUD_NAME_2 + VITE_CLOUDINARY_UPLOAD_PRESET_2, _3, etc.

const accounts = [];

// Collect all configured accounts from env vars
for (let i = 0; ; i++) {
  const suffix = i === 0 ? "" : `_${i + 1}`;
  const cloudName = import.meta.env[`VITE_CLOUDINARY_CLOUD_NAME${suffix}`];
  const uploadPreset = import.meta.env[`VITE_CLOUDINARY_UPLOAD_PRESET${suffix}`];
  if (!cloudName || !uploadPreset || cloudName === "placeholder") break;
  accounts.push({ cloudName, uploadPreset });
}

export function isCloudinaryConfigured() {
  return accounts.length > 0;
}

export function getCloudinaryAccounts() {
  return accounts.map((a, i) => ({ ...a, index: i + 1 }));
}

/**
 * Upload a file (image or video) to Cloudinary via unsigned upload preset.
 * Tries each configured account in order, falling back to the next on failure
 * (e.g. when an account runs out of storage).
 * Returns the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(file) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  let lastError;

  for (const account of accounts) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", account.uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = err.error?.message || "Upload failed";
        // If this is the last account, throw the error; otherwise try the next
        if (account === accounts[accounts.length - 1]) {
          throw new Error(message);
        }
        lastError = message;
        continue;
      }

      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      lastError = err.message;
      if (account === accounts[accounts.length - 1]) {
        throw new Error(lastError);
      }
    }
  }

  throw new Error(lastError || "All Cloudinary accounts failed");
}

/**
 * Delete an asset from Cloudinary by calling the serverless API.
 * Only works for Cloudinary URLs (http/https). No-op for other URLs.
 * Returns true if deleted or not found, false on failure.
 */
export async function deleteFromCloudinary(url) {
  if (!url || !url.includes("cloudinary.com")) return false;
  try {
    const res = await fetch("/api/delete-cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

/** Check whether a URL points to a Cloudinary (or other) video asset. */
export function isVideoUrl(url) {
  if (!url) return false;
  return url.includes("/video/upload/") || /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
}
