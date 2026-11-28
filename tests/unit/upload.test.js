import { describe, expect, it } from "vitest";
import {
  getUploadedMediaPath,
  getMediaOptimizationSummary,
  IMAGE_OPTIMIZATION_THRESHOLD_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  sanitizeFileName,
  validateFinalMediaFile,
  validateMediaFile,
  validateVideoForUpload,
  getVideoDurationSeconds,
  prepareMediaForUpload,
} from "@/services/supabase/upload";

function createVideoFile(durationSeconds = 10, sizeBytes = 5 * 1024 * 1024) {
  const blob = new Blob(
    new Uint8Array(sizeBytes),
    { type: "video/mp4" },
  );
  return new File([blob], "test.mp4", { type: "video/mp4" });
}

function createImageFile(sizeBytes = 512 * 1024) {
  const blob = new Blob(new Uint8Array(sizeBytes), { type: "image/jpeg" });
  return new File([blob], "test.jpg", { type: "image/jpeg" });
}

describe("media upload validation", () => {
  it("sanitizes filenames for storage paths", () => {
    expect(sanitizeFileName("Logo São José 2026.PNG")).toBe(
      "logo-sao-jose-2026.png",
    );
  });

  it("accepts allowed media files", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "image/png",
      }),
    ).not.toThrow();
  });

  it("accepts MOV uploads for video processing", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "video/quicktime",
      }),
    ).not.toThrow();
  });

  it("rejects unsupported media types", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "application/pdf",
      }),
    ).toThrow("Tipo de arquivo não permitido");
  });

  it("rejects files without a media type", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "",
      }),
    ).toThrow("Tipo de arquivo não permitido");
  });

  it("enforces the final 1 MB image budget", () => {
    expect(() =>
      validateFinalMediaFile({
        size: MAX_IMAGE_SIZE_BYTES + 1,
        type: "image/webp",
      }),
    ).toThrow("1 MB");
  });

  it("enforces the final 10 MB video budget", () => {
    expect(() =>
      validateFinalMediaFile({
        size: MAX_VIDEO_SIZE_BYTES + 1,
        type: "video/mp4",
      }),
    ).toThrow("10 MB");
  });

  it("sets the maximum accepted video duration to 30 seconds", () => {
    expect(MAX_VIDEO_DURATION_SECONDS).toBe(30);
  });

  it("only optimizes images above half of the final image limit", () => {
    expect(IMAGE_OPTIMIZATION_THRESHOLD_BYTES).toBe(MAX_IMAGE_SIZE_BYTES / 2);
  });

  it("reports the actual media reduction from file sizes", () => {
    expect(getMediaOptimizationSummary({ size: 5_000_000 }, { size: 2_000_000 }))
      .toMatchObject({
        originalBytes: 5_000_000,
        finalBytes: 2_000_000,
        reduction: 60,
      });
  });

  it("extracts only files from the application storage bucket", () => {
    expect(
      getUploadedMediaPath(
        "https://project.supabase.co/storage/v1/object/public/telao-online-midia/sponsors/video%20teste.mp4",
      ),
    ).toBe("sponsors/video teste.mp4");
    expect(
      getUploadedMediaPath(
        "https://project.supabase.co/storage/v1/object/public/other-bucket/sponsors/video%20antigo.mp4",
      ),
    ).toBe("");
    expect(getUploadedMediaPath("https://youtube.com/watch?v=abc")).toBe("");
  });
});

describe("video duration validation", () => {
  it("validates video duration within limit", async () => {
    const videoFile = createVideoFile(20, 5 * 1024 * 1024);
    const duration = await getVideoDurationSeconds(videoFile);
    expect(Number.isFinite(duration)).toBe(true);
    expect(duration).toBeLessThanOrEqual(30);
  });

  it("rejects videos longer than 30 seconds", async () => {
    const videoFile = createVideoFile(35, 5 * 1024 * 1024);
    await expect(validateVideoForUpload(videoFile)).rejects.toThrow(
      "Vídeo maior que 30s",
    );
  });

  it("getVideoDurationSeconds throws on unreadable file", async () => {
    const unreadableFile = new File(["invalid"], "broken.mp4", {
      type: "video/mp4",
    });
    await expect(getVideoDurationSeconds(unreadableFile)).rejects.toThrow();
  });
});

describe("media preparation", () => {
  it("prepareMediaForUpload prepares video by validating duration", async () => {
    const videoFile = createVideoFile(15, 5 * 1024 * 1024);
    const onProgress = vi.fn();
    const result = await prepareMediaForUpload(videoFile, onProgress, {});
    expect(result).toBe(videoFile);
    expect(onProgress).toHaveBeenCalled();
  });

  it("prepareMediaForUpload optimizes images above threshold", async () => {
    const largeFile = createImageFile(2_000_000);
    const onProgress = vi.fn();
    const result = await prepareMediaForUpload(largeFile, onProgress, {});
    expect(result.type).toBe("image/webp");
    expect(onProgress).toHaveBeenCalled();
  });

  it("prepareMediaForUpload passes small images through without optimization", async () => {
    const smallFile = createImageFile(100_000);
    const onProgress = vi.fn();
    const result = await prepareMediaForUpload(smallFile, onProgress, {});
    expect(result.type).toBe("image/jpeg");
  });

  it("prepareMediaForUpload validates final file size", async () => {
    const largeFile = createVideoFile(15, 20_000_000);
    const onProgress = vi.fn();
    await expect(
      prepareMediaForUpload(largeFile, onProgress, {}),
    ).rejects.toThrow("10 MB");
  });
});

describe("video size and duration combined validation", () => {
  it("accepts video of 5 MB and 20 seconds", async () => {
    const videoFile = createVideoFile(20, 5 * 1024 * 1024);
    await expect(validateMediaFile(videoFile)).resolves.toBeUndefined();
    await expect(validateVideoForUpload(videoFile)).resolves.toBeLessThanOrEqual(30);
  });

  it("accepts video of exactly 10 MB and 30 seconds metadata", async () => {
    const videoFile = createVideoFile(30, 10 * 1024 * 1024);
    await expect(validateMediaFile(videoFile)).resolves.toBeUndefined();
    await expect(validateVideoForUpload(videoFile)).resolves.toBeLessThanOrEqual(30);
  });

  it("rejects video of 11 MB and 20 seconds", async () => {
    const videoFile = createVideoFile(20, 11 * 1024 * 1024);
    await expect(validateMediaFile(videoFile)).rejects.toThrow(
      "Vídeo maior que 10 MB",
    );
  });

  it("rejects video of 5 MB and 31 seconds", async () => {
    const videoFile = createVideoFile(31, 5 * 1024 * 1024);
    await expect(validateVideoForUpload(videoFile)).rejects.toThrow(
      "Vídeo maior que 30s",
    );
  });

  it("rejects video of 15 MB and 40 seconds", async () => {
    const videoFile = createVideoFile(40, 15 * 1024 * 1024);
    await expect(validateVideoForUpload(videoFile)).rejects.toThrow();
  });
});