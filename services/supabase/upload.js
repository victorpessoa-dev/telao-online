import { createSupabaseBrowserClient } from "@/services/supabase/browser";

const BUCKET = "v-playcast-midia";
// Kept only so media uploaded before the brand migration can still be removed.
const LEGACY_BUCKET = "pascom-media";
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);
const CONVERTIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const WEBP_QUALITY = 0.86;
const MAX_IMAGE_SIDE = 2560;
const ALLOWED_UPLOAD_FOLDERS = new Set(["branding", "sponsors"]);

export function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

export function validateMediaFile(file) {
  if (!file) return;

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Arquivo maior que 100MB");
  }

  if (!file.type || !ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error(
      "Tipo de arquivo não permitido. Envie imagem, MP4 ou WebM.",
    );
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Não foi possível otimizar a imagem"));
      },
      type,
      quality,
    );
  });
}

async function loadImageBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const image = new Image();
  const url = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function optimizeImageForUpload(file) {
  if (!CONVERTIBLE_IMAGE_TYPES.has(file.type)) return file;

  const bitmap = await loadImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Não foi possível preparar a imagem para envio");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const optimizedName = `${originalName || "image"}.webp`;
    const optimizedFile = new File([blob], optimizedName, {
      type: "image/webp",
      lastModified: file.lastModified,
    });

    return optimizedFile.size < file.size || file.type !== "image/webp"
      ? optimizedFile
      : file;
  } finally {
    bitmap.close?.();
  }
}

export async function uploadMedia(file, folder = "uploads", churchId = "") {
  if (!file) return "";
  if (!ALLOWED_UPLOAD_FOLDERS.has(folder))
    throw new Error("Pasta de upload inválida");
  validateMediaFile(file);
  const optimizedFile = await optimizeImageForUpload(file);
  validateMediaFile(optimizedFile);

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw new Error("Sessão administrativa não encontrada");

  let churchQuery = supabase
    .from("churches")
    .select("id")
    .eq("admin_id", user.id);
  if (churchId) churchQuery = churchQuery.eq("id", churchId);

  const { data: church, error: churchError } = await churchQuery.maybeSingle();
  if (churchError || !church?.id)
    throw new Error("Nenhuma igreja vinculada a esta conta");

  const extension = optimizedFile.name.includes(".")
    ? optimizedFile.name.split(".").pop()
    : "bin";
  const safeName = sanitizeFileName(optimizedFile.name || `media.${extension}`);
  // The first path segment is enforced by storage RLS, preventing one church
  // from deleting or replacing another church's media.
  const path = `${church.id}/${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, optimizedFile, {
      cacheControl: "31536000",
      upsert: false,
      contentType: optimizedFile.type || undefined,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getUploadedMediaLocation(source = "") {
  try {
    const url = new URL(String(source).trim());
    const buckets = [BUCKET, LEGACY_BUCKET];
    const bucket = buckets.find((candidate) =>
      url.pathname.includes(`/storage/v1/object/public/${candidate}/`),
    );
    if (!bucket) return null;

    const marker = `/storage/v1/object/public/${bucket}/`;
    return {
      bucket,
      path: decodeURIComponent(
        url.pathname.slice(url.pathname.indexOf(marker) + marker.length),
      ),
    };
  } catch {
    return null;
  }
}

export function getUploadedMediaPath(source = "") {
  return getUploadedMediaLocation(source)?.path || "";
}

export async function deleteUploadedMedia(source) {
  const location = getUploadedMediaLocation(source);
  if (!location) return false;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(location.bucket)
    .remove([location.path]);
  if (error) throw error;
  if (
    !data?.some(
      (item) =>
        item.name === location.path ||
        item.name === location.path.split("/").pop(),
    )
  ) {
    throw new Error(`O Supabase não confirmou a exclusão de ${location.path}`);
  }
  return true;
}

export async function deleteUploadedMediaBatch(sources = []) {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueSources.map((source) => deleteUploadedMedia(source)),
  );
  return results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);
}
