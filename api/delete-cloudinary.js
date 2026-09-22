// Vercel serverless function — deletes an asset from Cloudinary.
// Requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET env vars (server-side only).
// For multiple accounts, add CLOUDINARY_API_KEY_2 / CLOUDINARY_API_SECRET_2 etc.

import { createHash } from "crypto";

function parseCloudinaryUrl(url) {
  // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
  const match = url.match(
    /cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/
  );
  if (!match) return null;
  const [, cloudName, resourceType, publicIdWithFolder] = match;
  // Remove file extension from public_id
  const publicId = publicIdWithFolder.replace(/\.[^.]+$/, "");
  return { cloudName, resourceType, publicId };
}

function getCredentials(cloudName) {
  // Primary account
  if (cloudName === process.env.VITE_CLOUDINARY_CLOUD_NAME) {
    return {
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    };
  }
  // Additional accounts (_2, _3, ...)
  for (let i = 2; ; i++) {
    const cn = process.env[`VITE_CLOUDINARY_CLOUD_NAME_${i}`];
    if (!cn) break;
    if (cn === cloudName) {
      return {
        apiKey: process.env[`CLOUDINARY_API_KEY_${i}`],
        apiSecret: process.env[`CLOUDINARY_API_SECRET_${i}`],
      };
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body || {};
  if (!url || !url.includes("cloudinary.com")) {
    return res.status(400).json({ error: "Invalid Cloudinary URL" });
  }

  const parsed = parseCloudinaryUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: "Could not parse Cloudinary URL" });
  }

  const { cloudName, resourceType, publicId } = parsed;
  console.log("Cloudinary delete request:", { cloudName, resourceType, publicId, url });
  const creds = getCredentials(cloudName);
  if (!creds?.apiKey || !creds?.apiSecret) {
    console.error("No credentials for cloud:", cloudName, "VITE_CLOUDINARY_CLOUD_NAME:", process.env.VITE_CLOUDINARY_CLOUD_NAME);
    return res.status(500).json({ error: `Cloudinary API credentials not configured for cloud "${cloudName}"` });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const sigString = `public_id=${publicId}&timestamp=${timestamp}${creds.apiSecret}`;
  const signature = createHash("sha1").update(sigString).digest("hex");

  try {
    const deleteRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: publicId,
          signature,
          api_key: creds.apiKey,
          timestamp,
        }),
      }
    );
    const data = await deleteRes.json();
    console.log("Cloudinary API response:", { status: deleteRes.status, data });
    if (data.result === "ok" || data.result === "not found") {
      return res.status(200).json({ success: true, result: data.result });
    }
    return res.status(500).json({ error: data.error?.message || `Delete failed (HTTP ${deleteRes.status})` });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Delete failed" });
  }
}
