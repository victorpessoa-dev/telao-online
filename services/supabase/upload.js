import { createSupabaseBrowserClient } from "@/services/supabase/browser";

const BUCKET = "telao-online-midia";
const MAX_SOURCE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = 1_000_000;
export const MAX_VIDEO_SIZE_BYTES = 15_000_000;
export const MAX_VIDEO_DURATION_SECONDS = 40;
export const IMAGE_OPTIMIZATION_THRESHOLD_BYTES = MAX_IMAGE_SIZE_BYTES / 2;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);
const WEBP_QUALITY = 0.9;
const MIN_WEBP_QUALITY = 0.68;
const WEBP_QUALITY_STEP = 0.06;
const MAX_IMAGE_SIDE = 2560;
const MIN_IMAGE_SIDE = 960;
const TELAO_BACKGROUND_MAX_SIDE = 1920;
const TELAO_BACKGROUND_WEBP_QUALITY = 0.82;


const ALLOWED_UPLOAD_FOLDERS = new Set(["branding", "sponsors"]);

export function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

/** Validates the original file before it is prepared for upload. */
export function validateMediaFile(file) {
  if (!file) return;

  if (!file.type || !ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error(
      "Tipo de arquivo não permitido. Envie imagem, MP4, WebM, MOV ou M4V.",
    );
  }

  const maxBytes = file.type.startsWith("video/")
    ? MAX_VIDEO_SIZE_BYTES
    : MAX_SOURCE_SIZE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      file.type.startsWith("video/")
        ? `Vídeo maior que ${formatBytes(MAX_VIDEO_SIZE_BYTES)}`
        : "Arquivo maior que 100MB",
    );
  }
}

/**
 * Rejects media that would exceed the Storage and delivery budget.
 */
export function validateFinalMediaFile(file) {
  const maxBytes = file?.type?.startsWith("video/")
    ? MAX_VIDEO_SIZE_BYTES
    : MAX_IMAGE_SIZE_BYTES;
  const mediaLabel = file?.type?.startsWith("video/") ? "Vídeo" : "Imagem";

  if (!file || file.size > maxBytes) {
    throw new Error(
      `${mediaLabel} excede o limite de ${formatBytes(maxBytes)}. Escolha uma mídia menor ou reduza sua qualidade.`,
    );
  }
}

/** Formats exact byte counts for status messages shown during real processing. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1).replace(".0", "")} MB`;
}

/** Describes the actual reduction achieved by an optimized media file. */
export function getMediaOptimizationSummary(sourceFile, optimizedFile) {
  const originalBytes = Number(sourceFile?.size) || 0;
  const finalBytes = Number(optimizedFile?.size) || 0;
  const reduction = originalBytes
    ? Math.max(0, Math.round((1 - finalBytes / originalBytes) * 100))
    : 0;

  return {
    originalBytes,
    finalBytes,
    reduction,
    message: `Mídia otimizada de ${formatBytes(originalBytes)} para ${formatBytes(finalBytes)} (${reduction}% menor).`,
  };
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
    return createImageBitmap(file, { imageOrientation: "from-image" });
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

async function optimizeImageToWebp(
  file,
  { maxSide = MAX_IMAGE_SIDE, quality = WEBP_QUALITY } = {},
) {
  const bitmap = await loadImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Não foi possível preparar a imagem para envio");

    const sourceSide = Math.max(bitmap.width, bitmap.height);
    const minimumSide = Math.min(MIN_IMAGE_SIDE, sourceSide);
    let targetSide = Math.min(maxSide, sourceSide);
    let targetQuality = quality;

    while (targetSide >= minimumSide) {
      const scale = Math.min(1, targetSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.drawImage(bitmap, 0, 0, width, height);

      while (targetQuality >= MIN_WEBP_QUALITY) {
        const blob = await canvasToBlob(canvas, "image/webp", targetQuality);
        if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
          const originalName = file.name.replace(/\.[^.]+$/, "");
          return new File([blob], `${originalName || "image"}.webp`, {
            type: "image/webp",
            lastModified: file.lastModified,
          });
        }
        targetQuality -= WEBP_QUALITY_STEP;
      }

      targetSide = Math.floor(targetSide * 0.8);
      targetQuality = quality;
    }

    throw new Error(
      `Não foi possível otimizar a imagem abaixo de ${formatBytes(MAX_IMAGE_SIZE_BYTES)} sem reduzir demais sua qualidade.`,
    );
  } finally {
    bitmap.close?.();
  }
}

export async function optimizeImageForUpload(file) {
  if (file.type === "image/gif") {
    validateFinalMediaFile(file);
    return file;
  }
  // Small images do not benefit enough from a lossy re-encode to justify the
  // extra CPU work or a possible loss of detail. The final 1 MB safety limit
  // is still enforced immediately before upload.
  if (file.size <= IMAGE_OPTIMIZATION_THRESHOLD_BYTES) {
    validateFinalMediaFile(file);
    return file;
  }
  return optimizeImageToWebp(file);
}

// Backgrounds are downloaded by every open display. Keep their dimension and
// quality lower than sponsor artwork while preserving the selected aspect ratio.
export async function optimizeTelaoBackgroundForUpload(file) {
  validateMediaFile(file);
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem para o fundo do telão");
  }
  return optimizeImageToWebp(file, {
    maxSide: TELAO_BACKGROUND_MAX_SIDE,
    quality: TELAO_BACKGROUND_WEBP_QUALITY,
  });
}

export async function cropImageForUpload(file, crop = {}) {
  const bitmap = await loadImageBitmap(file);
  try {
    const valueOr = (value, fallback) =>
      Number.isFinite(Number(value)) ? Number(value) : fallback;
    const zoom = Math.min(3, Math.max(1, valueOr(crop.zoom, 1)));
    const cropX = Math.min(100, Math.max(0, valueOr(crop.x, 50)));
    const cropY = Math.min(100, Math.max(0, valueOr(crop.y, 50)));
    const aspect = { square: 1, landscape: 16 / 9, portrait: 9 / 16 }[
      crop.aspect
    ] || bitmap.width / bitmap.height;
    const sourceAspect = bitmap.width / bitmap.height;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível recortar a imagem");
    const backgroundColor = /^#[0-9a-f]{6}$/i.test(crop.backgroundColor || "")
      ? crop.backgroundColor
      : "#050505";

    if (crop.fitMode === "contain") {
      const baseWidth =
        sourceAspect > aspect ? bitmap.width : bitmap.height * aspect;
      const baseHeight =
        sourceAspect > aspect ? bitmap.width / aspect : bitmap.height;
      const outputScale = Math.min(
        1,
        MAX_IMAGE_SIDE / Math.max(baseWidth, baseHeight),
      );
      const width = Math.max(1, Math.round(baseWidth * outputScale));
      const height = Math.max(1, Math.round(baseHeight * outputScale));
      const scale = Math.min(width / bitmap.width, height / bitmap.height, 1);
      const drawWidth = Math.max(1, Math.round(bitmap.width * scale));
      const drawHeight = Math.max(1, Math.round(bitmap.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.drawImage(
        bitmap,
        Math.round((width - drawWidth) / 2),
        Math.round((height - drawHeight) / 2),
        drawWidth,
        drawHeight,
      );
    } else {
      const baseWidth = sourceAspect > aspect ? bitmap.height * aspect : bitmap.width;
      const baseHeight = sourceAspect > aspect ? bitmap.height : bitmap.width / aspect;
      const sourceWidth = baseWidth / zoom;
      const sourceHeight = baseHeight / zoom;
      const sourceX = (bitmap.width - sourceWidth) * (cropX / 100);
      const sourceY = (bitmap.height - sourceHeight) * (cropY / 100);
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      );
    }

    const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close?.();
  }
}

export async function getVideoDurationSeconds(file) {
  const source = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";

  try {
    const duration = await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("Não foi possível ler a duração do vídeo."));
      video.src = source;
    });

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Não foi possível identificar a duração do vídeo.");
    }
    return duration;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(source);
  }
}

export async function validateVideoForUpload(file) {
  const duration = await getVideoDurationSeconds(file);
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(`Vídeo maior que ${MAX_VIDEO_DURATION_SECONDS}s`);
  }
  return duration;
}

/** Validates video duration using HTML5 Video metadata, throws if > 30s. */
export async function validateVideoDuration(file) {
  const duration = await getVideoDurationSeconds(file);
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(`Vídeo maior que ${MAX_VIDEO_DURATION_SECONDS}s`);
  }
}

/** Simple video preparation: validates the video using native HTML5 APIs
 *  and returns the file as-is (no FFmpeg transcoding needed). */
async function prepareSimpleVideo(file, onProgress, options = {}) {
  await validateVideoForUpload(file);
  onProgress?.(90);
  return file;
}

// This runs locally while the form is being edited. It never writes to
// Storage; the actual upload remains part of the Save action.
export async function prepareMediaForUpload(file, onProgress, options = {}) {
  validateMediaFile(file);
  const prepared = file.type.startsWith("video/")
    ? await prepareSimpleVideo(file, onProgress, options)
    : await optimizeImageForUpload(file);
  validateFinalMediaFile(prepared);
  onProgress?.(96);
  return prepared;
}

export async function uploadMedia(
  file,
  folder = "uploads",
  churchId = "",
  { alreadyPrepared = false } = {},
) {
  if (!file) return "";
  if (!ALLOWED_UPLOAD_FOLDERS.has(folder))
    throw new Error("Pasta de upload inválida");
  const mediaFile = alreadyPrepared ? file : await prepareMediaForUpload(file);
  validateFinalMediaFile(mediaFile);

  const supabase = createSupabaseBrowserClient();
  let targetChurchId = churchId;
  if (!targetChurchId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      throw new Error("Sessão administrativa não encontrada");

    const { data: church, error: churchError } = await supabase
      .from("churches")
      .select("id")
      .eq("admin_id", user.id)
      .maybeSingle();
    if (churchError || !church?.id)
      throw new Error("Nenhuma igreja vinculada a esta conta");
    targetChurchId = church.id;
  }

  const extension = mediaFile.name.includes(".")
    ? mediaFile.name.split(".").pop()
    : "bin";
  const safeName = sanitizeFileName(mediaFile.name || `media.${extension}`);
  // The first path segment is enforced by storage RLS, preventing one church
  // from deleting or replacing another church's media.
  const path = `${targetChurchId}/${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, mediaFile, {
      cacheControl: "31536000",
      upsert: false,
      contentType: mediaFile.type || undefined,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getUploadedMediaLocation(source = "") {
  try {
    const url = new URL(String(source).trim());
    if (!url.pathname.includes(`/storage/v1/object/public/${BUCKET}/`)) return null;

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    return {
      bucket: BUCKET,
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
    throw new Error(
      `O Supabase não confirmou a exclusão de ${location.path}. O patrocinador não foi removido.`,
    );
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
