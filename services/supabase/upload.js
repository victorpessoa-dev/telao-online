import { createSupabaseBrowserClient } from "@/services/supabase/browser";

const BUCKET = "telao-online-midia";
// Kept only so media uploaded before the Telão Online migration can still be
// read and removed without breaking existing sponsor and branding URLs.
const LEGACY_BUCKETS = ["v-playcast-midia", "pascom-media"];
const MAX_SOURCE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = 1_000_000;
export const MAX_VIDEO_SIZE_BYTES = 5_000_000;
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
const VIDEO_OPTIMIZATION_ATTEMPTS = [
  { maxSide: 1280, quality: 1 },
  { maxSide: 1080, quality: 0.8 },
  { maxSide: 960, quality: 0.62 },
];
let ffmpegPromise;

function loadFfmpegScript() {
  if (window.FFmpegWASM) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // The runtime and its worker are served by this application. Keeping them
    // same-origin avoids browser security policies blocking the worker chunk.
    script.src = "/api/ffmpeg/ffmpeg.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Não foi possível carregar o otimizador de vídeo"));
    document.head.appendChild(script);
  });
}
const ALLOWED_UPLOAD_FOLDERS = new Set(["branding", "sponsors"]);

export function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

/**
 * Validates the source file before browser-side conversion starts. The higher
 * source cap prevents exhausting memory; final caps are enforced separately.
 */
export function validateMediaFile(file) {
  if (!file) return;

  if (file.size > MAX_SOURCE_SIZE_BYTES) {
    throw new Error("Arquivo maior que 100MB");
  }

  if (!file.type || !ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error(
      "Tipo de arquivo não permitido. Envie imagem, MP4, WebM, MOV ou M4V.",
    );
  }
}

/**
 * Rejects converted media that would exceed the Storage and delivery budget.
 * This check runs after processing and immediately before upload.
 */
export function validateFinalMediaFile(file) {
  const maxBytes = file?.type?.startsWith("video/")
    ? MAX_VIDEO_SIZE_BYTES
    : MAX_IMAGE_SIZE_BYTES;
  const mediaLabel = file?.type?.startsWith("video/") ? "Vídeo" : "Imagem";

  if (!file || file.size > maxBytes) {
    throw new Error(
      `${mediaLabel} otimizado excede o limite de ${formatBytes(maxBytes)}. Escolha uma mídia menor ou reduza sua qualidade.`,
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

async function getFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      await loadFfmpegScript();
      const { FFmpeg } = window.FFmpegWASM || {};
      if (!FFmpeg) throw new Error("O otimizador de vídeo não foi carregado");
      const ffmpeg = new FFmpeg();
      const coreBase = new URL("/api/ffmpeg/", window.location.origin);
      await ffmpeg.load({
        coreURL: new URL("ffmpeg-core.js", coreBase).toString(),
        wasmURL: new URL("ffmpeg-core.wasm", coreBase).toString(),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

function getVideoBitrateKbps(durationSeconds, quality) {
  // Reserve a small container margin. Removing audio leaves the available
  // budget for a sharper image at the configured Telão duration.
  const duration = Math.max(3, Number(durationSeconds) || 10);
  const budgetKbps = Math.floor(
    (MAX_VIDEO_SIZE_BYTES * 8 * 0.9) / duration / 1000,
  );
  return Math.max(500, Math.min(3200, Math.floor(budgetKbps * quality)));
}

async function optimizeVideoForUpload(file, onProgress, options = {}) {
  const trimStartSeconds = Math.max(0, Number(options.videoStartSeconds) || 0);
  const trimDurationSeconds = Math.max(
    3,
    Number(options.videoDurationSeconds) || 10,
  );
  onProgress?.(20);
  const ffmpeg = await getFfmpeg();
  const inputName = `input-${crypto.randomUUID()}.${file.name.split(".").pop() || "mp4"}`;
  const reportProgress = ({ progress }) => {
    onProgress?.(Math.min(90, Math.max(35, 35 + progress * 55)));
  };
  try {
    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
    onProgress?.(35);
    ffmpeg.on("progress", reportProgress);
    for (const [attemptIndex, attempt] of VIDEO_OPTIMIZATION_ATTEMPTS.entries()) {
      const outputName = `video-${crypto.randomUUID()}.mp4`;
      const bitrateKbps = getVideoBitrateKbps(
        trimDurationSeconds,
        attempt.quality,
      );
      await ffmpeg.exec([
        "-i", inputName,
        "-ss", String(trimStartSeconds),
        "-t", String(trimDurationSeconds),
        "-map", "0:v:0",
        "-an",
        "-vf", `scale='min(${attempt.maxSide},iw)':-2`,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-b:v", `${bitrateKbps}k`,
        "-maxrate", `${bitrateKbps}k`,
        "-bufsize", `${bitrateKbps * 2}k`,
        "-movflags", "+faststart",
        outputName,
      ]);
      const data = await ffmpeg.readFile(outputName);
      await ffmpeg.deleteFile(outputName);
      const optimizedFile = new File(
        [data],
        `${file.name.replace(/\.[^.]+$/, "") || "video"}.mp4`,
        { type: "video/mp4", lastModified: file.lastModified },
      );
      onProgress?.(Math.min(92, 60 + attemptIndex * 16));
      if (optimizedFile.size <= MAX_VIDEO_SIZE_BYTES) return optimizedFile;
    }

    throw new Error(
      "Não foi possível otimizar o trecho do vídeo abaixo de 5 MB. Escolha outro trecho ou um vídeo menor.",
    );
  } finally {
    ffmpeg.off?.("progress", reportProgress);
    await Promise.allSettled([
      ffmpeg.deleteFile(inputName),
    ]);
  }
}

// This runs locally while the form is being edited. It never writes to
// Storage; the actual upload remains part of the Save action.
export async function prepareMediaForUpload(file, onProgress, options = {}) {
  validateMediaFile(file);
  const optimized = file.type.startsWith("video/")
    ? await optimizeVideoForUpload(file, onProgress, options)
    : await optimizeImageForUpload(file);
  validateFinalMediaFile(optimized);
  onProgress?.(96);
  return optimized;
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
  const optimizedFile = alreadyPrepared ? file : await prepareMediaForUpload(file);
  validateFinalMediaFile(optimizedFile);

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
    const buckets = [BUCKET, ...LEGACY_BUCKETS];
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
