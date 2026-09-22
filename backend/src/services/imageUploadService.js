import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MENU_IMAGE_BUCKET = process.env.MENU_IMAGE_BUCKET || "cbk-menu-images";
const MENU_IMAGE_REGION = process.env.MENU_IMAGE_REGION || "ap-south-1";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

let clientPromise = null;

function getS3Client() {
  if (!clientPromise) {
    clientPromise = new S3Client({ region: MENU_IMAGE_REGION });
  }
  return clientPromise;
}

function extractImagePayload(raw) {
  const value = String(raw || "");
  if (!value) return null;

  let mime = "";
  let base64 = value;

  const dataUrlMatch = value.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    base64 = dataUrlMatch[2];
  }

  const trimmed = base64.replace(/\s+/g, "");
  if (trimmed.length > 2 * 1024 * 1024) {
    return { error: "Image file is too large. Keep it under 1.5 MB." };
  }

  if (!ALLOWED_CONTENT_TYPES.has(mime)) {
    const inferred = String(value).match(/^data:image\/(jpeg|jpg|png|webp|gif);/i);
    if (!inferred) {
      return { error: "Unsupported image type. Use JPEG, PNG, WEBP or GIF." };
    }
    mime = `image/${inferred[1].toLowerCase().replace("jpg", "jpeg")}`;
    if (!ALLOWED_CONTENT_TYPES.has(mime)) {
      return { error: "Unsupported image type. Use JPEG, PNG, WEBP or GIF." };
    }
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return { error: "Image is not valid base64." };
  }

  try {
    return { buffer: Buffer.from(trimmed, "base64"), mime };
  } catch {
    return { error: "Image could not be decoded." };
  }
}

export async function uploadMenuImage({ image, fileName }) {
  const parsed = extractImagePayload(image);
  if (!parsed) return { error: "Image data is required." };
  if (parsed.error) return { error: parsed.error };

  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[parsed.mime] || "jpg";
  const baseName = String(fileName || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);
  const key = `menu-images/${Date.now()}-${randomUUID().slice(0, 8)}${baseName ? `-${baseName}` : ""}.${extension}`;

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: MENU_IMAGE_BUCKET,
        Key: key,
        Body: parsed.buffer,
        ContentType: parsed.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    return { error: `Upload failed: ${error?.message || "unknown error"}` };
  }

  return { url: `https://${MENU_IMAGE_BUCKET}.s3.${MENU_IMAGE_REGION}.amazonaws.com/${key}` };
}